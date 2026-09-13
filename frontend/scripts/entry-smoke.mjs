import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(
  process.env.PLAYWRIGHT_PACKAGE ||
    'C:/Users/29707/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json',
);
const { chromium } = require('playwright');
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(15_000);
const base = process.env.APP_BASE_URL || 'http://127.0.0.1:5173/';
const url = (route) => new URL(`#${route}`, base).href;
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

try {
  await page.goto(url('/'), { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: '节奏康复', exact: true }).waitFor();
  assert.equal(await page.locator('.site-header, .site-footer').count(), 0);
  assert.equal(await page.locator('main a').count(), 2);

  await page.getByRole('link', { name: '过往记录', exact: true }).click();
  await page.getByRole('heading', { name: '第一段节奏，等你开启' }).waitFor();
  await page.getByRole('link', { name: '去选一个喜欢的世界' }).click();
  await page.getByRole('heading', { level: 2, name: '萌宠互动' }).waitFor();

  await page.getByRole('button', { name: '下一个主题', exact: true }).click();
  await page.getByRole('heading', { level: 2, name: '花园养成' }).waitFor();
  await page.getByRole('button', { name: '选择星空旅行', exact: true }).click();
  await page.getByRole('heading', { level: 2, name: '星空旅行' }).waitFor();
  await page.getByRole('button', { name: '下一个主题', exact: true }).click();
  await page.getByRole('heading', { level: 2, name: '萌宠互动' }).waitFor();

  await page.getByRole('button', { name: '进入这个世界：萌宠互动', exact: true }).click();
  await page.waitForURL(url('/prepare/pet'), { timeout: 20_000 });
  await page.getByRole('button', { name: '了解了，继续', exact: true }).waitFor();
  for (const asset of ['straight.png', 'hook.png', 'fist.png']) {
    const response = await page.request.get(new URL(`gestures/${asset}`, base).href);
    assert.equal(response.status(), 200, `${asset} teaching asset must remain available`);
  }
  await page.getByRole('link', { name: '返回主题', exact: true }).click();
  await page.waitForURL(url('/themes'));
  assert.deepEqual(errors, []);
  console.log('Entry, history, cube selection, preparation and gesture teaching passed.');
} finally {
  await browser.close();
}
