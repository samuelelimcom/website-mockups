// Walkthrough script for tools/record.mjs: the 3D lawn first, then the
// scroll story, services, reviews, the quote form, and two service pages.
export async function desktop(page, h) {
  await h.go('/', 5000);
  await h.glide(0.12, 0.62, 0.42, 0.5, 2200);          // mow a strip by hand
  await h.glide(0.42, 0.5, 0.2, 0.72, 2000);
  await page.mouse.move(1270, 400); await h.sleep(600);
  const story = await page.evaluate(() => document.querySelector('#story').offsetHeight - innerHeight);
  await h.scrollTo(story * 0.25, 3000); await h.sleep(1400);
  await h.scrollTo(story * 0.5, 4500); await h.sleep(1600);
  await h.scrollTo(story * 0.75, 4500); await h.sleep(2000);
  await h.scrollTo(story + 10, 4000); await h.sleep(1800);
  await h.scrollTo('#services', 2500); await h.sleep(600);
  await page.locator('.svc').nth(0).hover(); await h.sleep(900);
  await h.scrollTo('#reviews', 2000); await h.sleep(1200);
  await h.scrollTo('#quote', 2200); await h.sleep(600);
  await h.click('#quote .chip:nth-child(1) span', 400);
  await h.click('#quote .chip:nth-child(3) span', 500);
  await h.click('#quote [data-step="0"] [data-next]');
  await h.click('#quote .seg:nth-of-type(1) label:nth-of-type(3) span', 400);
  await h.click('#quote .seg:nth-of-type(3) label:nth-of-type(2) span', 500);
  await h.click('#quote [data-step="1"] [data-next]');
  await h.type('#quote input[name=name]', 'Jordan Miller');
  await h.type('#quote input[name=phone]', '478 555 0142');
  await h.click('#quote button[type=submit]', 2800);
  await h.go('/services/yard-cleanup/', 5000);          // the blower sweeps the leaves
  await h.glide(0.6, 0.5, 0.82, 0.42, 1600);            // and a gust from the visitor
  await h.sleep(2000);
  await h.go('/services/pine-straw/', 8000);            // pine straw fills the bed
}

export async function mobile(page, h) {
  await h.go('/', 4500);
  const story = await page.evaluate(() => document.querySelector('#story').offsetHeight - innerHeight);
  await h.scrollTo(story * 0.25, 3000); await h.sleep(1400);
  await h.scrollTo(story * 0.5, 3500); await h.sleep(1400);
  await h.scrollTo(story * 0.75, 3500); await h.sleep(1600);
  await h.scrollTo(story + 10, 3000); await h.sleep(1400);
  await h.scrollTo('#services', 2500); await h.sleep(800);
  await page.locator('.menu').tap(); await h.sleep(900);
  await page.locator('.nav a').nth(0).tap(); await h.sleep(6500);
}
