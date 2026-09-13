import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(
  process.env.PLAYWRIGHT_PACKAGE ||
    'C:/Users/29707/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json',
);
const { chromium } = require('playwright');
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});
await fs.mkdir('test-results', { recursive: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(15_000);
const errors = [];
const report = [];
page.on('pageerror', error => errors.push(error.message));
const base = process.env.APP_BASE_URL || 'http://127.0.0.1:5173/';
const url = route => new URL(`#${route}`, base).href;

try {
  await page.goto(url('/'));
  assert.equal(new URL(page.url()).hash, '#/');
  await page.getByRole('heading', { name: '节奏康复', exact: true }).waitFor();
  await page.screenshot({ path: 'test-results/start-desktop.png', fullPage: true });

  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['/', '/themes', '/prepare/pet', '/history', '/binding', '/therapist/login', '/train/pet', '/prepare/missing', '/result/missing']) {
      await page.goto(url(route));
      await page.waitForTimeout(220);
      assert.equal(new URL(page.url()).hash, `#${route}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, `${width}px overflow on ${route}`);
      report.push(`${width}px ${route}: real hash route has no overflow`);
    }
    await page.goto(url('/themes'));
    await page.screenshot({ path: `test-results/themes-${width}.png`, fullPage: true });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url('/themes'));
  await page.getByRole('button', { name: '进入这个世界：萌宠互动', exact: true }).click();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: 'test-results/ripple-loading.png' });
  assert.equal(await page.locator('.launch-overlay').count(), 1);
  const rippleState = await page.locator('.rain-ripple').evaluateAll(nodes => nodes.map(node => ({
    opacity: +getComputedStyle(node).opacity,
    transform: getComputedStyle(node).transform,
  })));
  assert.ok(rippleState.some(state => state.opacity > .02));
  assert.ok(new Set(rippleState.map(state => state.transform)).size > 3);
  await page.waitForURL(url('/prepare/pet'), { timeout: 20_000 });
  await page.getByRole('button', { name: '了解了，继续' }).click();
  await page.getByRole('button', { name: '左手', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: '左手', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.screenshot({ path: 'test-results/hand-select-390.png', fullPage: true });

  await page.goto(url('/binding'));
  await page.getByLabel('怎么称呼你').fill('小禾');
  await page.getByLabel('治疗师邀请码').fill('HELLO');
  await page.getByRole('button', { name: '查找治疗师' }).click();
  await page.getByText('绑定服务暂未开放，你仍可以训练并保留本机记录。').waitFor();

  await page.goto(url('/design'));
  await page.getByRole('button', { name: '开始训练', exact: true }).click();
  await page.waitForTimeout(3300);
  await page.getByRole('button', { name: '暂停训练' }).click();
  await page.getByRole('heading', { name: '休息一下' }).waitFor();
  await page.getByRole('button', { name: '继续训练' }).click();
  await page.waitForTimeout(3250);
  await page.getByRole('button', { name: '手部丢失', exact: true }).click();
  await page.getByRole('heading', { name: '把手放回取景框', exact: true }).waitFor();
  await page.getByRole('button', { name: '找回手部 · 倒数' }).click();
  await page.waitForTimeout(3250);
  await page.getByRole('button', { name: 'Perfect', exact: true }).click();
  await page.locator('.rhythm-result.rhythm-grade-perfect').waitFor();
  await page.locator('.design-phone').screenshot({ path: 'test-results/training-390.png' });
  await page.getByRole('button', { name: '查看训练完成' }).click();
  await page.getByRole('heading', { name: '完成今天的训练' }).waitFor();
  await page.screenshot({ path: 'test-results/result-390.png', fullPage: true });
  await page.goto(url('/history'));
  await page.getByRole('heading', { name: '第一段节奏，等你开启' }).waitFor();
  report.push('Design simulation keeps history clean; pause, recovery, result and binding error checked.');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url('/design'));
  await page.getByRole('button', { name: '加载', exact: true }).click();
  await page.waitForTimeout(1200);
  const scales = await page.locator('.rain-ripple').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).transform));
  assert.ok(scales.every(scale => scale.startsWith('matrix(0.8, 0, 0, 0.8')));
  report.push('Reduced motion keeps ripple positions and scales still.');
  assert.deepEqual(errors, [], 'Unexpected browser errors');
  await fs.writeFile('test-results/browser-report.txt', report.join('\n'));
  console.log(report.join('\n'));
} finally {
  await browser.close();
}
