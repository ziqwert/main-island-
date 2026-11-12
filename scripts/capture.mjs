#!/usr/bin/env node
/*
 * Renders the island in headless Chrome and saves what it actually looks like, as a still or as
 * a filmstrip of a transition. It starts its own Vite server, so no dev server needs to run.
 *
 * Still, the expanded timer:
 *   npm run capture -- --before "island.start('timer')" --run "island.expand()" --out captures/timer.png
 *
 * Filmstrip, 12 frames of the same expansion slowed down 8 times:
 *   npm run capture -- --before "island.start('timer')" --run "island.expand()" \
 *     --frames 12 --interval 400 --timescale 8 --out captures/timer-expand.png
 *
 * `island` in --before/--run is window.__island (see src/island/debug.ts). Statements may await.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const HELP = `
Usage: npm run capture -- [options]

Output
  --out <file.png>        Where to save a single shot (default captures/shot.png)
  --spec <file.json>      Run many shots in one browser: an array of objects using the option
                          names below as keys, plus "name". Saved to --outdir/<name>.png
  --outdir <dir>          Output directory for --spec (default captures)

Page
  --url <origin>          Use a running server instead of starting one
  --path <path>           Page to open (default /?view=stage)
  --viewport <WxH>        Viewport in CSS px (default 1280x800)
  --dpr <n>               Device pixel ratio (default 2 for stills, 1 for filmstrips)

Script
  --set <json>            Settings applied first, e.g. '{"attachment":"floating"}'
  --before <js>           Runs first, at normal speed, to reach the starting state
  --settle <ms>           Wait after --before (default 1200)
  --timescale <n>         Slow motion factor applied after settling (default 1)
  --run <js>              The action being captured
  --mouse <steps>         Pointer steps after --run, relative to the top centre of the stage:
                          "move:0,18;wait:300;down;up;click:40,18"
  --wait <ms>             Still only: wait after --run (default 1400 x timescale)

Filmstrip
  --frames <n>            Capture n frames starting right after --run and tile them
  --interval <ms>         Time between frames (default 100)
  --cols <n>              Columns in the contact sheet (default 4)

Framing
  --clip <mode>           island (default: top centre of [data-island-stage]), full, or a CSS selector
  --region <WxH>          Size of the island clip (default 720x440)
`;

const OPTION_NAMES = [
  'out',
  'outdir',
  'spec',
  'url',
  'path',
  'viewport',
  'dpr',
  'set',
  'before',
  'settle',
  'timescale',
  'run',
  'mouse',
  'wait',
  'frames',
  'interval',
  'cols',
  'clip',
  'region',
];

const { values: args } = parseArgs({
  options: {
    ...Object.fromEntries(OPTION_NAMES.map((name) => [name, { type: 'string' }])),
    help: { type: 'boolean', short: 'h' },
  },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseSize(value, fallback) {
  const match = /^(\d+)x(\d+)$/.exec(String(value ?? fallback));
  if (!match) throw new Error(`Expected WxH, got "${value}"`);
  return [Number(match[1]), Number(match[2])];
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/local/bin/google-chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error('No Chrome or Edge found. Set CHROME_PATH to a browser executable.');
  return found;
}

async function startServer() {
  const { createServer } = await import('vite');
  const server = await createServer({
    root: ROOT,
    logLevel: 'error',
    clearScreen: false,
    // No HMR and no watcher: the page must not reload under the camera.
    server: {
      host: '127.0.0.1',
      port: 4300 + Math.floor(Math.random() * 600),
      strictPort: false,
      hmr: false,
      watch: null,
    },
  });
  await server.listen();
  const { port } = server.httpServer.address();
  return { url: `http://127.0.0.1:${port}`, close: () => server.close() };
}

async function loadApp(page, target) {
  // A cold Vite dependency cache can invalidate the first load, so retry once.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto(target, { waitUntil: 'load' });
    try {
      await page.waitForFunction(() => Boolean(window.__island), { timeout: 15000 });
      await page.evaluate(() => document.fonts.ready);
      return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error(`The app did not start at ${target}`);
}

async function resolveClip(page, clip, region) {
  if (clip === 'full') return undefined;
  const rect = await page.evaluate(
    (mode, [regionWidth, regionHeight]) => {
      if (mode === 'island') {
        const stage = document.querySelector('[data-island-stage]');
        if (!stage) return null;
        const box = stage.getBoundingClientRect();
        const width = Math.min(regionWidth, box.width);
        const height = Math.min(regionHeight, box.height);
        return { x: Math.round(box.left + (box.width - width) / 2), y: Math.round(box.top), width, height };
      }
      const element = document.querySelector(mode);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return { x: box.left, y: box.top, width: box.width, height: box.height };
    },
    clip,
    region,
  );
  if (!rect) throw new Error(`Nothing to clip to: "${clip}" matched no element`);
  return rect;
}

async function runMouse(page, steps) {
  const origin = await page.evaluate(() => {
    const stage = document.querySelector('[data-island-stage]');
    const box = stage ? stage.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth };
    return { x: box.left + box.width / 2, y: box.top };
  });
  for (const step of steps.split(';').map((s) => s.trim()).filter(Boolean)) {
    const [command, value = ''] = step.split(':');
    const [x, y] = value.split(',').map(Number);
    if (command === 'move') await page.mouse.move(origin.x + x, origin.y + y, { steps: 6 });
    else if (command === 'click') await page.mouse.click(origin.x + x, origin.y + y);
    else if (command === 'down') await page.mouse.down();
    else if (command === 'up') await page.mouse.up();
    else if (command === 'wait') await sleep(Number(value));
    else throw new Error(`Unknown mouse step "${step}"`);
  }
}

function tile(frameDir, count, cols, outFile) {
  const rows = Math.ceil(count / cols);
  const result = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-framerate',
      '1',
      '-i',
      path.join(frameDir, 'f%03d.png'),
      '-vf',
      `tile=${cols}x${rows}:padding=6:margin=6:color=0x7f7f7f`,
      '-frames:v',
      '1',
      outFile,
    ],
    { encoding: 'utf8' },
  );
  return result.status === 0;
}

async function runShot(browser, baseUrl, shot, outFile) {
  const frames = Number(shot.frames ?? 1);
  const timescale = Number(shot.timescale ?? 1);
  const [width, height] = parseSize(shot.viewport, '1280x800');
  const problems = [];

  const page = await browser.newPage();
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console.error: ${message.text()}`);
  });
  await page.setViewport({ width, height, deviceScaleFactor: Number(shot.dpr ?? (frames > 1 ? 1 : 2)) });
  await loadApp(page, new URL(shot.path ?? '/?view=stage', baseUrl).href);

  const exec = (code) =>
    page.evaluate(
      (source) => new Function('island', `return (async () => { ${source}\n })()`)(window.__island),
      code,
    );

  if (shot.set) await exec(`island.setSettings(${typeof shot.set === 'string' ? shot.set : JSON.stringify(shot.set)})`);
  if (shot.before) {
    await exec(shot.before);
    await sleep(Number(shot.settle ?? 1200));
  }
  if (timescale !== 1) await exec(`island.setSettings({ timeScale: ${timescale} })`);

  const clip = await resolveClip(page, shot.clip ?? 'island', parseSize(shot.region, '720x440'));
  await mkdir(path.dirname(outFile), { recursive: true });

  if (shot.run) await exec(shot.run);
  if (shot.mouse) await runMouse(page, shot.mouse);

  if (frames > 1) {
    const interval = Number(shot.interval ?? 100);
    const frameDir = await mkdtemp(path.join(tmpdir(), 'island-frames-'));
    const startedAt = Date.now();
    for (let index = 0; index < frames; index += 1) {
      const due = startedAt + index * interval;
      if (due > Date.now()) await sleep(due - Date.now());
      await page.screenshot({ path: path.join(frameDir, `f${String(index).padStart(3, '0')}.png`), clip });
    }
    const cols = Number(shot.cols ?? 4);
    if (tile(frameDir, frames, cols, outFile)) {
      console.log(`saved ${outFile}  (${frames} frames, ${interval} ms apart, ${cols} per row, left to right)`);
    } else {
      const fallback = outFile.replace(/\.png$/, '-frames');
      await cp(frameDir, fallback, { recursive: true });
      console.log(`ffmpeg unavailable, saved the individual frames to ${fallback}/`);
    }
    await rm(frameDir, { recursive: true, force: true });
  } else {
    await sleep(Number(shot.wait ?? 1400 * timescale));
    await page.screenshot({ path: outFile, clip });
    console.log(`saved ${outFile}`);
  }

  await page.close();
  for (const problem of problems) console.log(`  ! ${problem}`);
  return problems.some((problem) => problem.startsWith('pageerror'));
}

async function main() {
  if (args.help) {
    console.log(HELP);
    return 0;
  }

  let shots;
  if (args.spec) {
    const outdir = path.resolve(args.outdir ?? 'captures');
    const spec = JSON.parse(await readFile(path.resolve(args.spec), 'utf8'));
    shots = spec.map((shot, index) => ({
      shot,
      outFile: path.join(outdir, `${shot.name ?? `shot-${index + 1}`}.png`),
    }));
  } else {
    shots = [{ shot: args, outFile: path.resolve(args.out ?? 'captures/shot.png') }];
  }

  const server = args.url ? null : await startServer();
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--no-sandbox', '--hide-scrollbars', '--font-render-hinting=none'],
  });

  let failed = false;
  try {
    for (const { shot, outFile } of shots) {
      try {
        failed = (await runShot(browser, args.url ?? server.url, shot, outFile)) || failed;
      } catch (error) {
        failed = true;
        console.log(`  ! ${shot.name ?? outFile}: ${error.message}`);
      }
    }
  } finally {
    await browser.close();
    await server?.close();
  }
  return failed ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error.message);
    process.exit(1);
  },
);
