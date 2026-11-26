// Walkthrough script for tools/record.mjs: walk around the tree, scroll the
// job from limb to chips, use the estimate form, then the service pages.
export async function desktop(page, h) {
  await h.go('/', 3500);
  await h.glide(0.62, 0.55, 0.92, 0.6, 1600);          // walk around the tree
  await h.glide(0.92, 0.6, 0.7, 0.5, 1400);
  await h.sleep(600);
  const story = await page.evaluate(() => document.querySelector('#story').offsetHeight - innerHeight);
  await h.scrollTo(story * 0.33, 3000); await h.sleep(1200);
  await h.scrollTo(story * 0.52, 3500); await h.sleep(800);
  await h.scrollTo(story * 0.7, 3500); await h.sleep(800);
  await h.scrollTo(story * 0.9, 3500); await h.sleep(1500);
  await h.scrollTo(story + 40, 2000); await h.sleep(900);
  await h.scrollTo('#services', 2500); await h.sleep(500);
  await page.locator('.ticket').nth(0).hover(); await h.sleep(800);
  await page.locator('.ticket').nth(2).hover(); await h.sleep(800);
  await h.scrollTo('#reviews', 2000); await h.sleep(1300);
  await h.scrollTo('#quote', 2000); await h.sleep(500);
  await h.click('#quote .chip:nth-child(1) span', 350);
  await h.click('#quote .chip:nth-child(3) span', 500);
  await h.click('#quote [data-step="0"] [data-next]');
  await h.click('#quote [data-step="1"] .seg:nth-of-type(1) label:nth-of-type(3) span', 400);
  await h.click('#quote [data-step="1"] .seg:nth-of-type(2) label:nth-of-type(3) span', 400);
  await page.locator('#quote [data-size]').fill('2'); await h.sleep(500);
  await h.click('#quote [data-step="1"] [data-next]');
  await h.type('#quote input[name=name]', 'Jordan Miller');
  await h.type('#quote input[name=phone]', '270 555 0142');
  await h.click('#quote button[type=submit]', 2400);
  await h.go('/services/tree-removal/', 9000);       // watch the tree come down in rounds
  await h.scrollTo('bottom', 5000); await h.sleep(400);
  await h.go('/services/stump-grinding/', 8000);
}

export async function mobile(page, h) {
  await h.go('/', 3000);
  const story = await page.evaluate(() => document.querySelector('#story').offsetHeight - innerHeight);
  await h.scrollTo(story * 0.4, 3000); await h.sleep(900);
  await h.scrollTo(story * 0.68, 3500); await h.sleep(900);
  await h.scrollTo(story * 0.95, 3500); await h.sleep(1200);
  await h.scrollTo('#services', 2500); await h.sleep(900);
  await h.scrollTo('#quote', 3500); await h.sleep(1000);
  await page.locator('.menu').tap(); await h.sleep(900);
  await page.locator('.nav a').nth(1).tap(); await h.sleep(7500);
  await h.scrollTo('bottom', 5000); await h.sleep(500);
}
