// Pass/fail checks for the phone tab bar and everything that has to sit around it.
// Usage: node verify_tabs.cjs <out-dir>
const { createRequire } = require("module");
const req = createRequire("D:/SW/personal/DECODING/DECODING-JOBS/apps/web/package.json");
const { chromium, devices } = req("playwright");
const OUT = process.argv[2] || ".";
const BASE = "http://localhost:3333";
let failed = 0;
const check = (n, ok, d = "") => { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? `  (${d})` : ""}`); };
const safely = async (name, fn) => { try { await fn(); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message.slice(0, 900)}`); } };

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  for (const [label, opts] of [["iPhone", devices["iPhone 13"]], ["360px", { viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true }]]) {
    await safely(label, async () => {
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();
      await page.goto(BASE, { waitUntil: "load" });
      await page.waitForTimeout(4000);
      const nav = page.getByRole("navigation", { name: "Main" });
      const box = await nav.boundingBox();
      const vp = page.viewportSize();
      check(`${label}: tab bar at the very bottom`, Math.abs(box.y + box.height - vp.height) < 1, `${box.height}px`);
      for (const name of ["Map", "AI Assistant", "Tracker", "Preferences"]) {
        const link = nav.getByRole("link", { name });
        const b = await link.boundingBox();
        const fits = await link.evaluate((e) => { const s = e.querySelector("span:last-child"); return s.scrollWidth <= s.clientWidth; });
        check(`${label}: ${name} is thumb-sized and its label fits`, b.height >= 44 && b.width >= 44 && fits);
      }
      const bar = await page.locator("[data-phone-dock]").boundingBox();
      check(`${label}: map controls sit clear above the tabs`, bar.y + bar.height <= box.y, `${Math.round(bar.y + bar.height)} vs ${Math.round(box.y)}`);
      check(`${label}: no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `${OUT}/tabs-${label}-map.png` });

      await page.locator("[data-filters-toggle]").tap();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/tabs-${label}-filters.png` });
      const show = page.getByRole("button", { name: /^Show (results|[0-9])/ }).first();
      const sb = await show.boundingBox();
      check(`${label}: filter sheet's Show button is on screen`, !!sb && sb.y + sb.height <= vp.height, sb && `${Math.round(sb.y + sb.height)} of ${vp.height}`);
      await show.tap();
      await page.waitForTimeout(400);

      await page.getByRole("button", { name: "Grid", exact: true }).tap();
      await page.waitForTimeout(800);
      await page.locator(".scroll-thin.h-full.w-full").first().evaluate((e) => { e.scrollTop = e.scrollHeight; });
      await page.waitForTimeout(300);
      const clear = await page.evaluate(() => {
        const controls = document.querySelector("[data-phone-dock]").getBoundingClientRect();
        const cards = [...document.querySelectorAll("main button, main [class*=cursor-pointer]")].filter((e) => /open/i.test(e.innerText));
        const last = cards.at(-1)?.getBoundingClientRect();
        return last ? last.bottom <= controls.top + 1 : null;
      });
      check(`${label}: last Grid card scrolls clear of the controls`, clear === true);
      await page.screenshot({ path: `${OUT}/tabs-${label}-grid.png` });

      for (const [name, path] of [["AI Assistant", "/assistant"], ["Tracker", "/tracker"], ["Preferences", "/profile"], ["Map", "/"]]) {
        await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name }).tap();
        await page.waitForTimeout(2500);
        const cur = await page.getByRole("navigation", { name: "Main" }).locator('[aria-current="page"]').innerText();
        check(`${label}: ${name} tab opens ${path}`, new URL(page.url()).pathname === path && cur.includes(name));
        if (path !== "/") await page.screenshot({ path: `${OUT}/tabs-${label}${path.replace("/", "-")}.png` });
      }

      await page.goto(BASE + "/assistant", { waitUntil: "load" });
      await page.waitForTimeout(2000);
      await page.locator("form textarea").tap();
      await page.waitForTimeout(300);
      check(`${label}: tabs hide while typing`, (await page.getByRole("navigation", { name: "Main" }).count()) === 0);
      await page.getByText("What are you looking for?").tap();
      await page.waitForTimeout(300);
      check(`${label}: tabs return after typing`, (await page.getByRole("navigation", { name: "Main" }).count()) === 1);
      await ctx.close();
    });
  }
  await safely("tablet", async () => {
    const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "load" });
    await page.waitForTimeout(2500);
    check("Tablet: no tab bar, top links stay", !(await page.getByRole("navigation", { name: "Main" }).isVisible()) && await page.locator('header a[href="/tracker"]').first().isVisible());
    await ctx.close();
  });
  await browser.close();
  console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
  process.exit(failed ? 1 : 0);
})();
