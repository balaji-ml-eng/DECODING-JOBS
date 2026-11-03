// Tries colour options through a temporary style overlay, so no app code changes.
// Usage: node compare_colors.cjs <out-dir>
const { createRequire } = require("module");
const req = createRequire("D:/SW/personal/DECODING/DECODING-JOBS/apps/web/package.json");
const { chromium, devices } = req("playwright");
const OUT = process.argv[2] || ".";
const BASE = "http://localhost:3333";
const API = "http://localhost:8000/api/v1";

const calm = `
  .bg-gradient-to-r.from-green-500.to-emerald-600, .bg-gradient-to-br.from-green-500.to-green-600, .bg-gradient-to-br.from-green-500.to-emerald-600 { background: var(--color-green-600) !important; box-shadow: none !important; }
  [class*="from-green-50"][class*="to-emerald-50"], [class*="from-green-50"] { background: #fff !important; box-shadow: none !important; }
`;
const OPTIONS = {
  "A-today": "",
  "B-brand-green": `:root{--color-green-600:#16a34a;--color-green-700:#15803d;--color-green-500:#16a34a} ${calm}`,
  "C-deep-green": `:root{--color-green-600:#15803d;--color-green-700:#166534;--color-green-500:#15803d} ${calm}`,
  "D-emerald": `:root{--color-green-600:#047857;--color-green-700:#047857;--color-green-500:#059669} ${calm}`,
  "E-dark-action": `:root{--color-green-500:#15803d;--color-green-700:#15803d} a.bg-green-600, button.bg-green-600, .bg-gradient-to-r.from-green-500.to-emerald-600 { background: #111827 !important; box-shadow:none !important; } ${calm.replace(/var\(--color-green-600\)/, "#15803d")}`,
};

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const cos = await (await fetch(`${API}/companies/search?min_lat=12.8&min_lng=77.4&max_lat=13.2&max_lng=77.8`)).json();
  const id = (cos.find((c) => /swiggy/i.test(c.name) && c.active_job_count > 0) || cos.find((c) => c.active_job_count > 0)).id;

  const probe = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pp = await probe.newPage();
  await pp.goto(`${BASE}/?company=${id}`, { waitUntil: "load" });
  await pp.waitForTimeout(4000);
  const rendered = await pp.evaluate(() => {
    const toHex = (css) => { const c = document.createElement("canvas").getContext("2d"); c.fillStyle = css; c.fillRect(0, 0, 1, 1); const d = c.getImageData(0, 0, 1, 1).data; return `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`; };
    const read = (el, prop = "backgroundColor") => { if (!el) return null; const v = getComputedStyle(el); return prop === "image" ? v.backgroundImage.slice(0, 90) : toHex(v[prop]); };
    const buttons = [...document.querySelectorAll("a,button")];
    const apply = buttons.find((b) => /^Apply/.test(b.innerText.trim()));
    const mark = buttons.find((b) => /Mark as applied/.test(b.innerText));
    return {
      "Apply button": read(apply),
      "Mark as applied gradient": read(mark, "image"),
      "Logo": read(document.querySelector("header .bg-gradient-to-br"), "image"),
      "CSS --color-primary": getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim(),
      "Green text": read(document.querySelector(".text-green-700"), "color"),
    };
  });
  console.log(rendered);
  await probe.close();

  for (const [name, css] of Object.entries(OPTIONS)) {
    for (const [device, opts, url] of [["phone", devices["iPhone 13"], `/?company=${id}`], ["desktop", { viewport: { width: 1280, height: 800 } }, `/?company=${id}`], ["map", devices["iPhone 13"], "/"]]) {
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();
      await page.goto(BASE + url, { waitUntil: "load" });
      await page.waitForTimeout(3200);
      if (css) await page.addStyleTag({ content: css });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${name}-${device}.png` });
      await ctx.close();
    }
    console.log(name);
  }
  await browser.close();
})().catch((e) => { console.log("ERROR", e.message.split("\n")[0]); process.exit(1); });
