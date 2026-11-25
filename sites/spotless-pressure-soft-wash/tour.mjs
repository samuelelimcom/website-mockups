// Walkthrough script for tools/record.mjs. Edit per mockup: show the 3D
// moment first, then the story, a service page, and the form being used.
export async function desktop(page, h) {
  await h.go('/', 3500);
  await h.glide(0.55, 0.62, 0.9, 0.72, 1600);          // wash the slab by hand
  await h.glide(0.9, 0.66, 0.6, 0.56, 1400);
  await h.sleep(800);
  const story = await page.evaluate(() => document.querySelector('#story').offsetHeight - innerHeight);
  await h.scrollTo(story * 0.38, 3500); await h.sleep(1400);
  await h.scrollTo(story * 0.7, 4500); await h.sleep(1200);
  await h.scrollTo(story + 40, 4000); await h.sleep(1500);
  await h.scrollTo('#services', 3000); await h.sleep(600);
  await page.locator('.svc').nth(0).hover(); await h.sleep(900);
  await page.locator('.svc').nth(2).hover(); await h.sleep(900);
  await h.scrollTo('#reviews', 2200); await h.sleep(1500);
  await h.scrollTo('#quote', 2200); await h.sleep(600);
  await h.click('.chip:nth-child(1) span', 350);
  await h.click('.chip:nth-child(2) span', 500);
  await h.click('[data-step="0"] [data-next]');
  await h.click('.seg label:nth-of-type(2) span', 400);
  await page.locator('[data-size]').fill('2800'); await h.sleep(600);
  await h.click('[data-step="1"] [data-next]');
  await h.type('input[name=name]', 'Jordan Miller');
  await h.type('input[name=phone]', '423 555 0142');
  await h.click('button[type=submit]', 2600);
  await h.go('/services/roof-soft-wash/', 9500);       // watch the roof wash itself
  await h.scrollTo('bottom', 7000); await h.sleep(500);
  await h.go('/services/house-soft-wash/', 8000);
}

export async function mobile(page, h) {
  await h.go('/', 3500);
  const story = await page.evaluate(() => document.querySelector('#story').offsetHeight - innerHeight);
  await h.scrollTo(story * 0.4, 3500); await h.sleep(1000);
  await h.scrollTo(story * 0.72, 4000); await h.sleep(1000);
  await h.scrollTo(story + 40, 3500); await h.sleep(1200);
  await h.scrollTo('#services', 2500); await h.sleep(800);
  await h.scrollTo('#quote', 4000); await h.sleep(1200);
  await page.locator('.menu').tap(); await h.sleep(900);
  await page.locator('.nav a').nth(1).tap(); await h.sleep(8000);
  await h.scrollTo('bottom', 6000); await h.sleep(600);
}
