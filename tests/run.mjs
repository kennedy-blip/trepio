/* =====================================================================
   tests/run.mjs — Trepio regression test runner
   Serves the repo statically, boots a headless browser, and runs every
   case in tests/cases/*.mjs (each in a fresh browser context).

   Requirements: `npm install` (devDependencies include a headless
   Chromium via @sparticuz/chromium — no global browser needed).
   ===================================================================== */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');

/* ---------- static server ---------- */
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};
const server = createServer(async (req, res) => {
  try {
    let path = req.url.split('?')[0];
    if (path === '/') path = '/index.html';
    const file = join(ROOT, path.replace(/\.\./g, ''));
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const BASE = `http://127.0.0.1:${PORT}`;
console.log(`server: ${BASE}`);

/* ---------- headless chromium ---------- */
let chromium, sparticuz, devices;
try {
  ({ chromium, devices } = await import('playwright-core'));
  sparticuz = (await import('@sparticuz/chromium')).default;
} catch {
  console.error('\nplaywright-core / @sparticuz/chromium not installed — run `npm install` first.\n');
  server.close();
  process.exit(1);
}
/* software rendering in CI/sandbox; some minimal hosts lack system NSS */
const exe = await sparticuz.executablePath();
const args = [...sparticuz.args, '--enable-unsafe-swiftshader', '--no-sandbox'];

const browser = await chromium.launch({ executablePath: exe, args, headless: true });

/* ---------- helpers shared by all cases ---------- */
const mkHelpers = (page) => {
  const errors = [];
  const poll = (fn, arg, timeout = 25000) =>
    page.waitForFunction(fn, arg, { timeout, polling: 400 }).then(() => true).catch(() => false);
  const T = () => page.evaluate(() => window.__trepio.state());
  const go = async (path = '/?debug') => {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    const ok = await poll(() => !!window.__trepio && !document.getElementById('loading'));
    if (!ok) throw new Error('game did not boot');
  };
  const enterWorld = async () => {
    await page.click('#btnEnter');
    const ok = await poll(() => window.__trepio.state().mode === 'world');
    if (!ok) throw new Error('did not enter world');
  };
  const talkTo = async (id, questChoice = 0) => {
    /* close any stale dialogue first so E can't dismiss it instead */
    if (await page.evaluate(() => document.getElementById('dialogue').classList.contains('show'))) {
      await page.keyboard.press('Escape');
      await poll(() => !document.getElementById('dialogue').classList.contains('show'), null, 8000);
    }
    const isVillager = await page.evaluate(
      (id) => !!window.__trepio.npcs.find((x) => x.ch.id === id),
      id
    );
    if (isVillager) {
      /* deterministic: put the villager at their door-exit spot, walking to the
         village center; we then stand beyond them, away from the door
         (door interact radius ~3.1m, npc radius 5m — the npc wins from there) */
      await page.evaluate((id) => window.__trepio.forceNpcHome(id, false), id);
    }
    await page.evaluate((id) => {
      const n = window.__trepio.npcs.find((x) => x.ch.id === id);
      let px, pz;
      if (n) {
        const p = n.doll.group.position;
        /* stand 2.6m from the villager on the side facing AWAY from their door */
        const d = n.home ? n.home.door : { x: p.x - 1, z: p.z };
        let dx = p.x - d.x, dz = p.z - d.z;
        const L = Math.hypot(dx, dz) || 1;
        px = p.x + (dx / L) * 2.6;
        pz = p.z + (dz / L) * 2.6;
      } else {
        const r = window.__trepio.royals.find((x) => x.ch.id === id);
        const p = r.doll.group.position;
        px = p.x + 0.3;
        pz = p.z;
      }
      window.__trepio.teleport(px, pz);
      /* teleport + interact atomically so nobody wanders off in between */
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    }, id);
    if (!(await poll(() => document.getElementById('dialogue').classList.contains('show')))) {
      throw new Error('talkTo(' + id + '): dialogue did not open');
    }
    if (!(await poll(() => document.querySelectorAll('#dialogue .dchoice').length > 0, null, 8000))) {
      throw new Error('talkTo(' + id + '): no dialogue choices rendered');
    }
    await page.click('#dialogue .dchoice >> nth=' + questChoice);
    await page.waitForTimeout(600);
  };
  return { page, errors, poll, T, go, enterWorld, talkTo, BASE };
};

/* ---------- run every case ---------- */
const caseDir = join(ROOT, 'tests', 'cases');
const files = (await readdir(caseDir)).filter((f) => f.endsWith('.mjs')).sort();
let failed = 0;
for (const f of files) {
  const name = f.replace('.mjs', '');
  const mod = await import(join(caseDir, f));
  const ctxOpts = mod.mobile && devices
    ? { ...devices['Pixel 5'] }
    : { viewport: { width: 640, height: 480 } };
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.setDefaultTimeout(25000);
  const h = mkHelpers(page);
  process.stdout.write(`• ${name} `);
  try {
    await mod.default(h, BASE);
    const pageErrors = h.errors.filter((e) => !e.includes('favicon'));
    if (pageErrors.length) throw new Error('console errors: ' + pageErrors.slice(0, 3).join(' | '));
    console.log('✅');
  } catch (e) {
    failed++;
    console.log('❌ ' + String(e.message || e).split('\n').slice(0, 3).join(' ⏎ '));
  } finally {
    await ctx.close();
  }
}

await browser.close();
server.close();
console.log(failed ? `\n${failed} test(s) failed` : '\nall tests passed');
process.exit(failed ? 1 : 0);
