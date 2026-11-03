// Opens apply links in real Chrome on a phone profile, to see what a user actually sees.
// Usage: node audit_link_browser.cjs <dir holding link_age.json>
const fs = require("fs");
const { createRequire } = require("module");
const req = createRequire("D:/SW/personal/DECODING/DECODING-JOBS/apps/web/package.json");
const { chromium, devices } = req("playwright");
const DIR = process.argv[2];
const all = JSON.parse(fs.readFileSync(`${DIR}/link_age.json`, "utf8"));
const pick = (f, n) => all.filter(f).slice(0, n);
const sample = [
  ...pick((r) => r.result === "ok" && r.apply_url.includes("adzuna"), 15),
  ...pick((r) => r.result === "http 410", 8),
  ...pick((r) => r.result !== "ok" && r.result !== "http 410", 8),
];

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const rows = [];
  for (const [i, r] of sample.entries()) {
    const ctx = await browser.newContext(devices["iPhone 13"]);
    const page = await ctx.newPage();
    const t0 = Date.now();
    let status = null;
    let error = null;
    try {
      const res = await page.goto(r.apply_url, { waitUntil: "domcontentloaded", timeout: 30000 });
      status = res?.status();
      await page.waitForTimeout(3500);
    } catch (e) {
      error = e.message.split("\n")[0].slice(0, 80);
    }
    const text = await page.evaluate(() => document.body?.innerText.replace(/\s+/g, " ").slice(0, 170)).catch(() => "");
    const row = { checked: r.result, status, ms: Date.now() - t0, error, host: new URL(page.url() === "about:blank" ? r.apply_url : page.url()).hostname, title: (await page.title().catch(() => "")).slice(0, 70), text };
    rows.push(row);
    console.log(`${r.result.padEnd(22)} chrome=${status ?? "-"} ${String(row.ms).padStart(6)}ms ${row.host} | ${row.title} | ${error || text}`);
    if (i % 5 === 0) await page.screenshot({ path: `${DIR}/open-${i}-${r.result.replace(/\W+/g, "_")}.png` }).catch(() => {});
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(`${DIR}/link_browser.json`, JSON.stringify(rows, null, 1));
})();
