// Walkthrough for tools/record.mjs: the porch first, washed by hand, then the
// scroll story, the ledger, the estimate form and a service page; phone after.
export async function desktop(page, h) {
  await h.go('/', 3800);
  await h.glide(0.58, 0.5, 0.92, 0.66, 1900);           // wash one board by hand
  await h.glide(0.9, 0.72, 0.56, 0.56, 1900);           // and the next one back
  await h.sleep(900);
  const story = await page.evaluate(() => document.querySelector('#story').offsetHeight - innerHeight);
  await h.scrollTo(story * 0.34, 3500); await h.sleep(1600);
  await h.scrollTo(story * 0.67, 5500); await h.sleep(1400);
  await h.scrollTo(story, 4500); await h.sleep(2200);
  await h.scrollTo(story + 40 + 300, 2500); await h.sleep(1600);
  await h.scrollTo('#services', 2500); await h.sleep(600);
  await page.locator('.svc').nth(0).hover(); await h.sleep(1000);
  await page.locator('.svc').nth(1).hover(); await h.sleep(1000);
  await h.scrollTo('#reviews', 2200); await h.sleep(1500);
  await h.scrollTo('#quote', 2200); await h.sleep(600);
  await h.click('.chip:nth-child(1) span', 350);
  await h.click('.chip:nth-child(2) span', 500);
  await h.click('[data-step="0"] [data-next]');
  await h.click('.seg__big:nth-of-type(3) span', 500);
  await h.click('[data-step="1"] .seg:nth-of-type(3) label:nth-of-type(1) span', 600);
  await h.click('[data-step="1"] [data-next]');
  await h.type('input[name=name]', 'Jordan Miller');
  await h.type('input[name=phone]', '423 555 0142');
  await h.click('button[type=submit]', 3000);
  await h.go('/services/deck-fence-cleaning/', 10000);  // the porch washes itself
  await h.scrollTo('bottom', 6000); await h.sleep(500);
  await h.go('/services/house-washing/', 7000);
}

export async function mobile(page, h) {
  await h.go('/', 3500);
  const story = await page.evaluate(() => document.querySelector('#story').offsetHeight - innerHeight);
  await h.scrollTo(story * 0.36, 3500); await h.sleep(1000);
  await h.scrollTo(story * 0.7, 4500); await h.sleep(1000);
  await h.scrollTo(story, 3500); await h.sleep(1500);
  await h.scrollTo('#services', 2500); await h.sleep(900);
  await h.scrollTo('#quote', 4000); await h.sleep(1200);
  await page.locator('.menu').tap(); await h.sleep(900);
  await page.locator('.nav a').nth(1).tap(); await h.sleep(8000);
  await h.scrollTo('bottom', 6000); await h.sleep(600);
}
