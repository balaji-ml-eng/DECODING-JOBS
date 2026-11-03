// Screenshots of every main phone screen, for reviewing the design by eye.
// Usage: node capture_phone.cjs <out-dir>
const { createRequire } = require("module");
const req = createRequire("D:/SW/personal/DECODING/DECODING-JOBS/apps/web/package.json");
const { chromium, devices } = req("playwright");
const OUT = process.argv[2] || ".";
const BASE = "http://localhost:3333";

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const ctx = await browser.newContext(devices["iPhone 13"]);
  const page = await ctx.newPage();
  const shot = async (name) => { await page.screenshot({ path: `${OUT}/${name}.png` }); console.log(name); };
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(4500);
  await shot("1-map");
  const legend = page.getByRole("button", { name: /map legend/i }).first();
  if (await legend.count()) { await legend.tap(); await page.waitForTimeout(400); await shot("2-legend"); await legend.tap(); }
  await page.locator("[data-city-dropdown] button").first().tap();
  await page.waitForTimeout(400);
  await shot("3-city");
  await page.getByRole("button", { name: "Close city list" }).tap();
  await page.waitForTimeout(300);
  await page.locator("[data-filters-toggle]").first().tap();
  await page.waitForTimeout(500);
  await shot("4-filters");
  await page.getByRole("button", { name: /^Show (results|[0-9])/ }).first().tap();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Grid", exact: true }).tap();
  await page.waitForTimeout(1200);
  await shot("5-grid");
  await page.locator("main button, main [class*=cursor-pointer]").filter({ hasText: /\d+ open/i }).first().tap();
  await page.waitForTimeout(2500);
  await shot("6-company");
  await page.goBack();
  await page.waitForTimeout(800);
  for (const [name, path] of [["7-assistant", "/assistant"], ["8-tracker", "/tracker"], ["9-preferences", "/profile"]]) {
    await page.goto(BASE + path, { waitUntil: "load" });
    await page.waitForTimeout(2200);
    await shot(name);
  }
  await browser.close();
})().catch((e) => { console.log("ERROR", e.message.split("\n")[0]); process.exit(1); });
