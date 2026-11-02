// @vitest-environment node
import { it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
let server: ChildProcess;
let browser: Browser;
const base = 'http://127.0.0.1:3197';
beforeAll(async () => {
  execFileSync('npm', ['run', 'build'], { stdio: 'pipe', timeout: 90000 });
  server = spawn('node', [createRequire(import.meta.url).resolve('next/dist/bin/next'), 'start', process.cwd(), '-p', '3197'], { cwd: process.cwd(), stdio: 'inherit' });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base)).ok) break; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  browser = await chromium.launch({ headless: true });
}, 100000);
afterAll(async () => { await browser?.close(); server?.kill(); });
it.each([1440, 375])('home-browser: usable page, keyboard skip and navigation at %ipx', async width => {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  try {
    await page.goto(base);
    expect(await page.locator('h1').innerText()).toMatch(/Complex systems/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.textContent)).toMatch(/skip to content/i);
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => location.hash)).toBe('#main');
    expect(await page.locator('#main').count()).toBe(1);
    expect(await page.locator('h1').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(32);
    await page.locator('#name').fill('Browser Visitor');
    await page.locator('#email').fill('visitor@example.com');
    await page.locator('#message').fill('A browser check of a usable contact form.');
    expect(await page.getByRole('button', { name: /send message/i }).isEnabled()).toBe(true);
    const field = await page.locator('#message').boundingBox();
    expect(field!.width).toBeGreaterThan(200);
    expect(field!.x + field!.width).toBeLessThanOrEqual(width);
    await page.getByRole('navigation').getByRole('link', { name: /writing|blog/i }).click();
    await page.waitForURL('**/blog');
    expect(await page.locator('h1').innerText()).toMatch(/writing|notes|blog/i);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const links = page.locator('a[href^="/blog/"]');
    expect(await links.count()).toBeGreaterThanOrEqual(3);
    await links.first().click();
    await page.waitForURL('**/blog/*');
    expect((await page.locator('article').innerText()).length).toBeGreaterThan(1800);
  } finally { await page.close(); }
}, 20000);
