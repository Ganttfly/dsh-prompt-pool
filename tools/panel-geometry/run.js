// Measures the composer panel in a real browser without booting DSH.
//
//   $env:NODE_PATH = "$env:DSH_PROFILE_DIR\node_modules"
//   node tools/panel-geometry/run.js --viewport 1280x760 --composer 0.34
//
// The mock page puts the composer above the window bottom (a new session), and
// the real client bundle renders into it. A panel that is taller than the room
// above the composer reports a negative top here, which is the defect.
//
// Flags: --viewport WxH (default 1280x760), --composer 0..1 (default 0.34),
//        --drag (also drag the grip up), --resize WxH (resize while open),
//        --scroll (force the panel's own scroll offset), --shot name (write _shots/<name>.png).
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO = path.join(__dirname, '..', '..');
const VENDOR = process.env.PP_VENDOR || path.join(os.tmpdir(), 'pp-harness', 'node_modules');

const options = { viewport: { width: 1280, height: 760 }, composer: 0.34, drag: false, shot: '' };
{
  const argv = process.argv.slice(2);
  const value = (flag) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const viewport = value('--viewport');
  if (viewport) {
    const [width, height] = viewport.split('x').map(Number);
    if (width > 0 && height > 0) options.viewport = { width, height };
  }
  const composer = Number(value('--composer'));
  if (Number.isFinite(composer) && composer > 0) options.composer = composer;
  options.drag = argv.includes('--drag');
  options.scroll = argv.includes('--scroll');
  options.tray = Number(value('--tray')) || 0;
  const resize = value('--resize');
  if (resize) {
    const [width, height] = resize.split('x').map(Number);
    if (width > 0 && height > 0) options.resize = { width, height };
  }
  options.shot = value('--shot') || '';
}

// ------------------------------------------------------------------ vendor
// The browser has no CommonJS, so the few vendor modules the harness needs are
// emitted as one script with the same require graph Node resolves here.
function buildVendor() {
  const modules = new Map();
  const walk = (file) => {
    if (modules.has(file)) return;
    const source = fs.readFileSync(file, 'utf8');
    const deps = {};
    modules.set(file, { source, deps });
    const pattern = /require\(\s*(['"])([^'"]+)\1\s*\)/g;
    let match = pattern.exec(source);
    while (match) {
      const spec = match[2];
      let resolved = null;
      try {
        resolved = spec.startsWith('.')
          ? require.resolve(path.resolve(path.dirname(file), spec))
          : require.resolve(spec, { paths: [path.dirname(file)] });
      } catch (_error) {
        resolved = null;
      }
      if (resolved) {
        deps[spec] = resolved;
        walk(resolved);
      }
      match = pattern.exec(source);
    }
  };
  let roots;
  try {
    roots = {
      react: require.resolve('react', { paths: [VENDOR] }),
      'react-dom': require.resolve('react-dom', { paths: [VENDOR] }),
      'react-dom/client': require.resolve('react-dom/client', { paths: [VENDOR] }),
    };
  } catch (_error) {
    throw new Error(
      'react is not available to the harness. Install it once with\n' +
        '  pnpm --dir "' + VENDOR + '\\.." add react@18 react-dom@18\n' +
        'or point PP_VENDOR at a node_modules that has both.',
    );
  }
  Object.keys(roots).forEach((id) => walk(roots[id]));
  const defs = [];
  for (const [file, entry] of modules) {
    defs.push(JSON.stringify(file) + ':{deps:' + JSON.stringify(entry.deps) + ',fn:function(module,exports,require,process){\n' + entry.source + '\n}}');
  }
  return [
    '(function(){',
    'var defs={' + defs.join(',') + '};',
    'var cache={};',
    'function load(file){',
    '  if(cache[file])return cache[file].exports;',
    '  var def=defs[file];',
    "  if(!def)throw new Error('module not bundled: '+file);",
    '  var module={exports:{}};',
    '  cache[file]=module;',
    '  var require=function(spec){var dep=def.deps[spec];if(!dep)throw new Error("unresolved "+spec+" from "+file);return load(dep);};',
    "  def.fn(module,module.exports,require,{env:{NODE_ENV:'development'}});",
    '  return module.exports;',
    '}',
    'var roots=' + JSON.stringify(roots) + ';',
    "window.__ppRequire=function(spec){var file=roots[spec];if(!file)throw new Error('unknown root '+spec);return load(file);};",
    '})();',
  ].join('\n');
}

// ------------------------------------------------------------------ server
function startServer() {
  const vendor = buildVendor();
  const files = {
    '/': ['text/html; charset=utf-8', path.join(__dirname, 'index.html')],
    '/index.html': ['text/html; charset=utf-8', path.join(__dirname, 'index.html')],
    '/boot.js': ['text/javascript; charset=utf-8', path.join(__dirname, 'boot.js')],
    '/plugin/client.js': ['text/javascript; charset=utf-8', path.join(REPO, 'plugin', 'client.js')],
  };
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/favicon.ico') {
      respond(response, 204, 'text/plain; charset=utf-8', '');
      return;
    }
    if (url.pathname === '/vendor.js') {
      respond(response, 200, 'text/javascript; charset=utf-8', vendor);
      return;
    }
    const entry = files[url.pathname];
    if (entry) {
      respond(response, 200, entry[0], fs.readFileSync(entry[1]));
      return;
    }
    respond(response, 404, 'text/plain; charset=utf-8', 'not found: ' + url.pathname);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function respond(response, status, type, body) {
  response.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  response.end(body);
}

// --------------------------------------------------------------- measuring
function measure() {
  const box = (node) => {
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    return {
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  };
  const panel = document.querySelector('.pp-panel');
  const anchor = document.getElementById('overlay');
  const pane = document.getElementById('pane');
  const head = panel ? panel.querySelector('.pp-page-head') : null;
  const style = panel ? getComputedStyle(panel) : null;
  let headHit = null;
  if (head) {
    // A rect alone cannot tell a clipped header from a visible one; ask the
    // browser which element owns the pixel the header's own text sits on.
    const rect = head.getBoundingClientRect();
    const hit = document.elementFromPoint(Math.round(rect.left + 30), Math.round(Math.max(rect.top + 10, 1)));
    headHit = Boolean(hit && (hit === head || head.contains(hit)));
  }
  const foot = panel ? panel.querySelector('.pp-page-foot') : null;
  const tray = panel ? panel.querySelector('.pp-tray') : null;
  const dock = panel ? panel.querySelector('.pp-panel-dock') : null;
  const footStyle = foot ? getComputedStyle(foot) : null;
  const trayStyle = tray ? getComputedStyle(tray) : null;
  return {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    anchor: box(anchor),
    pane: box(pane),
    dock: box(dock),
    foot: box(foot),
    footStyle: footStyle ? { maxHeight: footStyle.maxHeight, height: footStyle.height, flex: footStyle.flex } : null,
    trayStyle: trayStyle ? { maxHeight: trayStyle.maxHeight, flex: trayStyle.flex, overflowY: trayStyle.overflowY, gap: trayStyle.gap } : null,
    tray: tray
      ? Object.assign(box(tray), {
          clientHeight: tray.clientHeight,
          scrollHeight: tray.scrollHeight,
          scrolls: tray.scrollHeight > tray.clientHeight + 1,
        })
      : null,
    panel: panel
      ? Object.assign(box(panel), {
          scrollTop: panel.scrollTop,
          cssHeight: style.height,
          cssMaxHeight: style.maxHeight,
          room: style.getPropertyValue('--pp-room').trim(),
          inline: panel.getAttribute('style') || '',
        })
      : null,
    head: box(head),
    headHit,
  };
}

function judge(label, state, trayCount) {
  const problems = [];
  if (!state.panel) {
    problems.push('the panel did not open');
  } else {
    if (state.panel.top < state.pane.top - 1) {
      problems.push('panel top ' + state.panel.top + 'px is above the pane top ' + state.pane.top + 'px');
    }
    if (Math.abs(state.panel.bottom - state.anchor.bottom) > 1) {
      problems.push('panel bottom ' + state.panel.bottom + 'px left the anchor at ' + state.anchor.bottom + 'px');
    }
    if (state.panel.height < 160) problems.push('panel collapsed to ' + state.panel.height + 'px');
    // The header is the only way to close or search the panel; it has to be
    // inside the box and inside the pane, not scrolled or clipped above them.
    if (!state.head) problems.push('the header row is missing');
    else if (state.head.top < state.panel.top - 1) {
      problems.push('header top ' + state.head.top + 'px is above the panel top ' + state.panel.top + 'px (scrollTop ' + state.panel.scrollTop + ')');
    } else if (state.head.height < 24) problems.push('header squashed to ' + state.head.height + 'px');
    else if (state.headHit !== true) problems.push('header is clipped by the pane, so the user cannot see the title, search or close button');
    // A short queue has to fit the card whole; only a long one may scroll.
    if (trayCount > 0 && trayCount <= 4 && state.tray && state.tray.scrolls) {
      problems.push(
        'queue card scrolls with ' + trayCount + ' rows: tray ' + state.tray.clientHeight + 'px shows ' + state.tray.scrollHeight + 'px',
      );
    }
  }
  const summary =
    label +
    ': window ' + state.viewport.width + 'x' + state.viewport.height +
    ' · pane top ' + state.pane.top +
    ' · anchor bottom ' + (state.anchor ? state.anchor.bottom : '?') +
    ' · panel ' + (state.panel ? state.panel.width + 'x' + state.panel.height + ' @top ' + state.panel.top : 'closed') +
    (state.panel ? ' · room ' + (state.panel.room || 'none') : '') +
    (state.head ? ' · head @' + state.head.top + ' h' + state.head.height + (state.headHit ? ' visible' : ' HIDDEN') : ' · head none') +
    (state.tray ? ' · card ' + state.tray.height + ' (cap ' + (state.footStyle ? state.footStyle.maxHeight : '?') + ') rows ' + state.tray.clientHeight + '/' + state.tray.scrollHeight + (state.tray.scrolls ? ' scrolls' : '') : '');
  console.log((problems.length ? '[FAIL] ' : '[ok]   ') + summary);
  for (const problem of problems) console.log('       - ' + problem);
  return problems.length === 0;
}

// The bundled playwright may expect a browser build this machine does not have,
// so any full chromium in the ms-playwright cache is good enough for layout.
function findChrome() {
  if (process.env.PP_CHROME) return process.env.PP_CHROME;
  const root = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  try {
    const dirs = fs.readdirSync(root).filter((name) => name.startsWith('chromium-')).sort().reverse();
    for (const dir of dirs) {
      for (const relative of ['chrome-win64\\chrome.exe', 'chrome-win\\chrome.exe']) {
        const file = path.join(root, dir, relative);
        if (fs.existsSync(file)) return file;
      }
    }
  } catch (_error) {
    /* no cache: let playwright pick its default */
  }
  return undefined;
}

(async () => {
  const { chromium } = require('playwright');
  const { server, port } = await startServer();
  const browser = await chromium.launch({ executablePath: findChrome() });
  const page = await browser.newPage({ viewport: options.viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => {
    errors.push(String(error));
    console.log('[page error] ' + error);
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    errors.push(message.text());
    console.log('[console error] ' + message.text());
  });

  let passed = true;
  try {
    await page.goto('http://127.0.0.1:' + port + '/?composer=' + options.composer + (options.tray > 0 ? '&tray=' + options.tray : ''));
    console.log('[step] page loaded');
    await page.waitForSelector('[data-pp-trigger="true"]', { timeout: 15000 });
    console.log('[step] trigger rendered');
    await page.click('[data-pp-trigger="true"]');
    await page.waitForSelector('.pp-panel', { timeout: 5000 });
    await page.waitForTimeout(200);

    const opened = await page.evaluate(measure);
    passed = judge('default', opened, options.tray) && passed;

    if (options.scroll) {
      // A focused field can scroll an overflow:hidden box; force the scroll a
      // browser would perform and check the header cannot be parked off-box.
      const forced = await page.evaluate(() => {
        const panel = document.querySelector('.pp-panel');
        if (!panel) return null;
        panel.scrollTop = 80;
        return panel.scrollTop;
      });
      await page.waitForTimeout(150);
      const scrolled = await page.evaluate(measure);
      console.log('[step] forced scrollTop -> ' + forced);
      passed = judge('scrolled', scrolled, options.tray) && passed;
    }

    if (options.resize) {
      await page.setViewportSize(options.resize);
      await page.waitForTimeout(200);
      const resized = await page.evaluate(measure);
      passed = judge('resized', resized, options.tray) && passed;
    }

    if (options.drag) {
      const grip = await page.locator('.pp-panel-grip').boundingBox();
      await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
      await page.mouse.down();
      await page.mouse.move(grip.x + grip.width / 2, 2, { steps: 12 });
      await page.mouse.up();
      await page.waitForTimeout(120);
      const dragged = await page.evaluate(measure);
      passed = judge('dragged', dragged, options.tray) && passed;
    }

    if (options.shot) {
      const file = path.join(REPO, '_shots', options.shot.endsWith('.png') ? options.shot : options.shot + '.png');
      await page.screenshot({ path: file });
      console.log('[shot] ' + file);
    }
  } finally {
    if (errors.length) {
      console.log('[page errors]');
      for (const error of errors) console.log('  ' + error);
    }
    // A full chromium build sometimes stalls the close handshake in this
    // environment; the measurement is already printed, so do not wait forever.
    await Promise.race([browser.close().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 3000))]);
    server.close();
  }

  process.exit(passed ? 0 : 1);
})().catch((error) => {
  console.error('[fail]', error && error.stack ? error.stack : error);
  process.exit(1);
});
