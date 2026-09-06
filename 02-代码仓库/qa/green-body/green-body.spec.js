const { test, expect } = require('@playwright/test');
const baseUrl = process.env.HUMAN_UNKNOWN_BASE_URL || 'http://127.0.0.1:4173/';

test.use({
  viewport: { width: 1672, height: 941 },
  deviceScaleFactor: 1,
  launchOptions: { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' },
});

test('chapter background, hover light, click propagation, and return', async ({ page }) => {
  test.setTimeout(90000);
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`${baseUrl}?greenBodyTest=1`);
  await expect(page.locator('#worldOne')).toBeVisible();
  await expect(page.locator('[data-beat="chapter"]')).toHaveClass(/is-visible/, { timeout: 8000 });
  await expect(page.locator('#worldOne')).toHaveAttribute('data-chapter-stage', 'centered');
  await expect(page.locator('[data-beat="chapter"] h2')).toHaveText('THE GREEN BODY');
  await expect.poll(async () => page.locator('#greenBodyLivingCanvas').evaluate((canvas) => canvas.width)).toBeGreaterThan(1600);
  await page.screenshot({ path: 'qa/green-body/chapter-centered.png' });

  await expect(page.locator('#worldOne')).toHaveAttribute('data-chapter-stage', 'docked', { timeout: 6000 });
  await expect.poll(() => page.locator('#greenBodyCanvas').getAttribute('data-phase')).toBe('local');
  await expect(page.locator('#greenBodyCanvas')).toHaveAttribute('data-user-interactions', '0');
  await expect.poll(async () => Number(await page.locator('#greenBodyCanvas').getAttribute('data-network-nodes'))).toBeGreaterThan(45);
  await expect.poll(async () => Number(await page.locator('#greenBodyCanvas').getAttribute('data-network-edges'))).toBeGreaterThan(55);
  await page.screenshot({ path: 'qa/green-body/idle-living.png' });
  await page.mouse.move(1120, 500);
  await page.screenshot({ path: 'qa/green-body/hover-green.png' });

  await page.mouse.down();
  await page.mouse.up();
  await expect.poll(async () => Number(await page.locator('#greenBodyCanvas').getAttribute('data-queued-pulses'))).toBeGreaterThan(0);
  await expect(page.locator('[data-beat="chapter"]')).toHaveClass(/is-visible/);
  await expect(page.locator('[data-beat="here"]')).toHaveClass(/is-visible/);
  await page.waitForTimeout(420);
  await page.screenshot({ path: 'qa/green-body/click-spread-green.png' });
  await expect.poll(async () => Number(await page.locator('#greenBodyCanvas').getAttribute('data-arrivals')), { timeout: 9000 }).toBeGreaterThan(12);
  await expect.poll(async () => Number(await page.locator('#greenBodyCanvas').getAttribute('data-organ-arrivals')), { timeout: 9000 }).toBeGreaterThan(3);
  await expect.poll(async () => Number(await page.locator('#greenBodyLivingCanvas').getAttribute('data-responses')), { timeout: 9000 }).toBeGreaterThan(3);
  await expect(page.locator('#greenBodyLivingCanvas')).not.toHaveAttribute('data-last-response', '');
  await page.screenshot({ path: 'qa/green-body/far-response-green.png' });
  await expect.poll(async () => Number(await page.locator('#greenBodyCanvas').getAttribute('data-arrivals')), { timeout: 14000 }).toBeGreaterThan(55);
  await expect.poll(async () => Number(await page.locator('#greenBodyCanvas').getAttribute('data-organ-arrivals')), { timeout: 14000 }).toBeGreaterThan(12);
  await expect(page.locator('[data-beat="there"]')).toHaveClass(/is-visible/);
  await expect(page.locator('#worldNarrativeContinue')).toBeVisible({ timeout: 12000 });
  await expect.poll(async () => Number(await page.locator('#greenBodyCanvas').getAttribute('data-queued-pulses')), { timeout: 16000 }).toBe(0);
  await expect.poll(async () => Number(await page.locator('#greenBodyCanvas').getAttribute('data-traces')), { timeout: 4000 }).toBe(0);
  await expect(page.locator('[data-beat="chapter"]')).toHaveClass(/is-visible/);

  const interactionsBeforeNarrative = await page.locator('#greenBodyCanvas').getAttribute('data-user-interactions');
  const expectedBeats = ['collective', 'contrast', 'question', 'human', 'final'];
  for (const beat of expectedBeats) {
    await page.locator('#worldNarrativeContinue').click();
    await expect(page.locator(`[data-beat="${beat}"]`)).toHaveClass(/is-visible/);
    await expect(page.locator('[data-beat="chapter"]')).toHaveClass(/is-visible/);
  }
  await expect(page.locator('[data-beat="collective"] .world-one__inspiration')).toContainText('科幻小说｜Vernor Vinge');
  await expect(page.locator('[data-beat="human"] .world-one__inspiration')).toContainText('科幻电影｜James Cameron');
  await expect(page.locator('#greenBodyCanvas')).toHaveAttribute('data-user-interactions', interactionsBeforeNarrative);
  await expect(page.locator('#worldNarrativeContinue')).toContainText('查看灵感来源与推荐阅读');
  await page.locator('#worldNarrativeContinue').click();
  await expect(page.locator('#worldSourcesPanel')).toBeVisible();
  await expect(page.locator('#worldSourcesToggle')).toBeVisible();
  await expect(page.locator('.world-one__source')).toHaveCount(4);
  await expect(page.locator('#worldSourcesPanel')).toContainText('同一个意识同时活在许多生命里');
  await expect(page.locator('#worldSourcesPanel')).toContainText('一部描写多个犬形身体共同组成一个完整人格的太空歌剧');
  await expect(page.locator('#worldSourcesPanel')).toContainText('《阿凡达》');
  await expect.poll(() => page.locator('#greenBodyCanvas').getAttribute('data-complete')).toBe('true');
  await page.waitForTimeout(750);
  await page.screenshot({ path: 'qa/green-body/inspiration-reading.png' });
  await page.locator('#worldSourcesContinue').click();
  await expect(page.locator('#worldSourcesPanel')).toBeHidden({ timeout: 1200 });

  await page.evaluate(() => history.replaceState({}, '', location.pathname));
  await page.locator('#worldReturn').click();
  await expect(page.locator('#worldOne')).toBeHidden({ timeout: 1200 });
  expect(errors).toEqual([]);
});
