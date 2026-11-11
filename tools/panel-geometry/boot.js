// Boots the real client bundle against a stubbed Cordis host and mounts the
// composer trigger and overlay panel into the mock shell from index.html.
(function () {
  const React = window.__ppRequire('react');
  const { createRoot } = window.__ppRequire('react-dom/client');
  const h = React.createElement;

  const params = new URLSearchParams(window.location.search);
  const share = Number(params.get('composer'));
  if (Number.isFinite(share) && share > 0) {
    // A viewport unit, not pixels, so the mock composer moves on resize the way
    // the real conversation layout does.
    document.documentElement.style.setProperty('--composer-top', (share * 100).toFixed(2) + 'vh');
  }

  const spec = window.__ppSpec;
  if (!spec || typeof spec.factory !== 'function') throw new Error('the plugin bundle did not register a factory');

  const registrations = new Map();
  const dictionaries = {};
  const listeners = new Set();

  const translate = (ns) => (key, values) => {
    const table = (dictionaries[ns] && dictionaries[ns].zh) || {};
    let text = table[key] !== undefined ? table[key] : key;
    if (values) for (const name of Object.keys(values)) text = text.split('{' + name + '}').join(String(values[name]));
    return text;
  };

  const ctx = {
    effect: (fn) => {
      const dispose = fn();
      return typeof dispose === 'function' ? dispose : () => {};
    },
    get: () => undefined,
    inject: (deps, callback) => {
      if (typeof callback === 'function') callback({ get: () => undefined });
      return () => {};
    },
    locale: {
      register: (ns, table) => {
        dictionaries[ns] = table;
        listeners.forEach((fn) => fn());
        return () => {};
      },
      bind: (ns) => translate(ns),
      subscribe: (fn) => {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      getLocale: () => ({ id: 'zh' }),
    },
    slots: {
      inject: (name, callback) => {
        const dispose = callback();
        return typeof dispose === 'function' ? dispose : () => {};
      },
      register: (options, component) => {
        registrations.set(options.name, component);
        return () => registrations.delete(options.name);
      },
    },
    layout: { selectPanel: () => {} },
  };

  const plugin = spec.factory((id) => {
    if (id === 'react') return React;
    throw new Error('the bundle required an unshared module: ' + id);
  });
  plugin.apply(ctx);

  const Trigger = registrations.get('conversation.input.right');
  const Panel = registrations.get('conversation.input.overlay');
  if (!Trigger || !Panel) throw new Error('the composer slots did not register');

  // The host hands these hooks down as slot props; the panel only reads the
  // draft, the queue and the workspace roster, so static snapshots suffice.
  const input = { draft: '', phase: 'plain', queue: [], attachmentIds: [], occurrences: [] };
  const workspaceSnapshot = {
    items: [
      { workspaceId: 'w1', title: 'dsh-prompt-pool', path: 'D:\\Hotpot\\dsh-prompt-pool', sessionIds: ['s1'] },
    ],
  };

  createRoot(document.getElementById('trigger-slot')).render(h(Trigger, {}));
  createRoot(document.getElementById('overlay')).render(
    h(Panel, {
      sessionId: 'harness-session',
      useInput: () => input,
      useWorkspaces: () => workspaceSnapshot,
      useSession: () => ({ pendingSubmissions: [] }),
    }),
  );
})();
