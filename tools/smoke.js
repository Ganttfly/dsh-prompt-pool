// Simulates the browser module host so the client bundle can be type-free smoke
// tested in Node: the factory must run and register its plugin without throwing.
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'plugin', 'client.js'), 'utf8');

const store = new Map();
const listeners = {};

global.window = {
  __ModuleLoader__: {
    load(spec) {
      if (spec.id !== 'dsh-prompt-pool') throw new Error('unexpected module id: ' + spec.id);
      const mod = spec.factory(requireStub);
      console.log('[ok] factory returned:', Object.keys(mod).join(', '));
      if (typeof mod.apply !== 'function') throw new Error('apply is not a function');
      console.log('[ok] inject:', JSON.stringify(mod.inject));
      const registrations = [];
      const localeListeners = [];
      const sidebar = {
        tabs: [],
        updates: [],
        registerTab: (descriptor) => { sidebar.tabs.push(descriptor); return () => {}; },
        updateTab: (id, patch) => { sidebar.updates.push({ id, patch }); },
      };
      const ctx = {
        effect: (fn) => {
          const dispose = fn();
          return typeof dispose === 'function' ? dispose : () => {};
        },
        get: (name) => (name === 'remote' ? { skills: { list: async () => ({ ok: true, value: { skills: [] } }) } } : name === 'betterSidebar' ? sidebar : undefined),
        inject: (deps, cb) => {
          if (typeof cb === 'function') cb({ get: () => undefined, betterSidebar: undefined });
          return () => {};
        },
        locale: {
          register: () => () => {},
          bind: () => (key) => key,
          subscribe: (fn) => { localeListeners.push(fn); return () => {}; },
          getLocale: () => ({ id: 'zh' }),
        },
        slots: {
          inject: (key, cb) => {
            const dispose = cb();
            registrations.push(key);
            return typeof dispose === 'function' ? dispose : () => {};
          },
          register: (options, component) => {
            if (!options || !options.name) throw new Error('register without a slot name');
            if (typeof component !== 'function' && typeof component !== 'object') throw new Error('register without a component');
            return () => {};
          },
        },
        layout: { selectPanel: () => {} },
      };
      mod.apply(ctx);
      console.log('[ok] slots registered:', registrations.join(', '));

      // The sidebar tab must exist and follow a language switch.
      const tab = sidebar.tabs[0];
      if (!tab || tab.id !== 'prompt-pool:pool') throw new Error('the sidebar tab was not registered');
      if (localeListeners.length === 0) throw new Error('the locale switch is not observed');
      localeListeners.forEach((fn) => fn());
      const retitled = sidebar.updates.some((call) => call.id === 'prompt-pool:pool' && call.patch && call.patch.title === 'page.title');
      if (!retitled) throw new Error('the sidebar tab was not retitled on a language switch');
      console.log('[ok] sidebar tab retitled on locale change');

      // The settings about card repeats the version, so it must track the manifest.
      const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'plugin', 'package.json'), 'utf8'));
      if (!source.includes("const PLUGIN_VERSION = '" + pkg.version + "'")) {
        throw new Error(`the about card version does not match package.json (${pkg.version})`);
      }
      console.log('[ok] about card version matches package.json');
      return mod;
    },
  },
  addEventListener: () => {},
  location: { reload: () => {} },
};

global.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
};

function requireStub(name) {
  if (name === 'react') {
    const hooks = [];
    return {
      createElement: (type, props, ...children) => ({ type, props, children }),
      Fragment: 'Fragment',
      useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
      useEffect: () => {},
      useRef: (initial) => ({ current: initial }),
      useMemo: (factory) => factory(),
      useCallback: (fn) => fn,
      useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot(),
    };
  }
  throw new Error('unexpected require: ' + name);
}

try {
  new Function('window', 'localStorage', 'require', source)(global.window, global.localStorage, requireStub);
  console.log('[ok] module body executed');
} catch (error) {
  console.error('[fail] module body threw:', error && error.stack ? error.stack : error);
  process.exitCode = 1;
}
