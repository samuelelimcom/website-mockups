// Walkthrough script for tools/record.mjs: scrub the grimy 3D window by hand,
// scroll the story (scrub, rinse, dry clear), services, reviews, the quote
// form, then the roofline and frames pages; the phone pass follows.
export async function desktop(page, h) {
  await h.go('/', 4500);
  await h.glide(0.6, 0.38, 0.9, 0.42, 1800);           // scrub a strip of glass by hand
  await h.glide(0.9, 0.5, 0.62, 0.56, 1800);
  await h.glide(0.62, 0.64, 0.88, 0.7, 1600);
  await page.mouse.move(1270, 860); await h.sleep(500);
  const story = await page.evaluate(() => document.querySelector('#story').offsetHeight - innerHeight);
  await h.scrollTo(story * 0.25, 3000); await h.sleep(1200);
  await h.scrollTo(story * 0.5, 5000); await h.sleep(1200);
  await h.scrollTo(story * 0.75, 4500); await h.sleep(1500);
  await h.scrollTo(story + 10, 4000); await h.sleep(2200);
  await h.scrollTo('#services', 2500); await h.sleep(500);
  await page.locator('.svc').nth(0).hover(); await h.sleep(900);
  await page.locator('.svc').nth(1).hover(); await h.sleep(900);
  await h.scrollTo('#reviews', 2000); await h.sleep(1500);
  await h.scrollTo('#quote', 2200); await h.sleep(500);
  await h.click('#quote .chip:nth-child(2) span', 500);
  await h.click('#quote [data-step="0"] [data-next]');
  await h.click('#quote .seg:nth-of-type(1) label:nth-of-type(2) span', 400);
  await page.locator('#quote [data-size]').fill('14'); await page.locator('#quote [data-size]').dispatchEvent('input'); await h.sleep(600);
  await h.click('#quote [data-step="1"] [data-next]');
  await h.type('#quote input[name=name]', 'Jordan Hughes');
  await h.type('#quote input[name=phone]', '07700 900142');
  await h.click('#quote button[type=submit]', 2600);
  await h.go('/services/fascias-gutters/', 9000);      // the roofline cleans itself
  await h.go('/services/upvc-frames-sills/', 7000);    // frames back to white
}

export async function mobile(page, h) {
  await h.go('/', 4000);
  const story = await page.evaluate(() => document.querySelector('#story').offsetHeight - innerHeight);
  await h.scrollTo(story * 0.3, 3000); await h.sleep(1200);
  await h.scrollTo(story * 0.55, 3500); await h.sleep(1200);
  await h.scrollTo(story * 0.8, 3500); await h.sleep(1400);
  await h.scrollTo(story + 10, 3000); await h.sleep(1400);
  await h.scrollTo('#services', 2500); await h.sleep(800);
  await page.locator('.menu').tap(); await h.sleep(900);
  await page.locator('.nav a').nth(0).tap(); await h.sleep(7000);
}
