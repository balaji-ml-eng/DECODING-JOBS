const { createRequire } = require("module");
const fs = require("fs");
const req = createRequire("D:/SW/personal/DECODING/DECODING-JOBS/apps/web/package.json");
const { chromium, devices } = req("playwright");
const out = process.argv[2];
const LIVE = "https://decoding-jobs.vercel.app";
const LOCAL = "http://localhost:3333";
const API = "http://localhost:8000/api/v1";
const EMAIL = "claude-verify-temp@example.com";
const log = (...a) => console.log(...a);
const results = [];

const VIEWPORTS = {
  phone: { ...devices["Pixel 5"], viewport: { width: 360, height: 640 } },
  iphone: { ...devices["iPhone 13"] },
  tablet: { viewport: { width: 768, height: 1024 }, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 } },
};

async function metrics(page) {
  return page.evaluate(() => {
    const seen = (e) => {
      const b = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      return b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth && s.visibility !== "hidden" && s.display !== "none";
    };
    const controls = [...document.querySelectorAll("a,button,input,select,textarea,[role=button]")].filter((e) => seen(e) && !e.closest(".maplibregl-marker,.maplibregl-ctrl"));
    const small = controls.filter((e) => { const b = e.getBoundingClientRect(); return b.width < 44 || b.height < 44; });
    const unlabeled = controls.filter((e) => !(e.getAttribute("aria-label") || e.innerText?.trim() || e.placeholder || e.title));
    const texts = [...document.querySelectorAll("body *")].filter((e) => seen(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    const sizes = {};
    for (const e of texts) { const s = Math.round(parseFloat(getComputedStyle(e).fontSize)); sizes[s] = (sizes[s] || 0) + 1; }
    const clipped = texts.filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== "visible").length;
    // Fixed/absolute chrome covering the screen: how much of the viewport is left for content.
    const header = document.querySelector("header, nav")?.getBoundingClientRect().bottom ?? 0;
    const input = [...document.querySelectorAll("input")].find(seen)?.getBoundingClientRect();
    return {
      controls: controls.length, under44: small.length, unlabeled: unlabeled.length, under12px: texts.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 12).length,
      fontSizes: Object.keys(sizes).length, clipped, overflowX: document.documentElement.scrollWidth > innerWidth, headerBottom: Math.round(header), firstInputBottom: input ? Math.round(input.bottom) : null,
    };
  });
}

async function capture(page, vp, name) {
  await page.waitForTimeout(700);
  const file = `${vp}-${name}.png`;
  await page.screenshot({ path: `${out}/${file}` });
  const m = await metrics(page);
  results.push({ vp, name, file, ...m });
  log(`${vp}/${name}: controls=${m.controls} <44=${m.under44} unlabeled=${m.unlabeled} <12px=${m.under12px} fonts=${m.fontSizes} clipped=${m.clipped} overflowX=${m.overflowX}`);
}
async function step(name, fn) {
  try { await fn(); } catch (e) { log(`  !! ${name}: ${e.message.split("\n")[0].slice(0, 150)}`); }
}

async function liveWalk(browser, vp) {
  const touch = !!VIEWPORTS[vp].hasTouch;
  const ctx = await browser.newContext(VIEWPORTS[vp]);
  const page = await ctx.newPage();
  const press = (l) => (touch ? l.tap({ timeout: 8000 }) : l.click({ timeout: 8000 }));
  const errors = new Set();
  page.on("pageerror", (e) => errors.add(e.message.slice(0, 120)));
  await page.goto(LIVE + "/", { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(6000);
  await capture(page, vp, "01-home");

  await step("city", async () => {
    await press(page.locator("button", { hasText: /^Bengaluru\s*\d*/ }).first());
    await capture(page, vp, "02-city-menu");
    await press(page.getByRole("button", { name: /^Chennai/ }).first());
    await page.waitForTimeout(4500);
    await capture(page, vp, "03-chennai");
  });
  await step("search", async () => {
    const s = page.locator("input").first();
    await s.fill("react");
    await page.waitForTimeout(2500);
    await capture(page, vp, "04-search-suggest");
    await s.press("Enter");
    await page.waitForTimeout(3000);
    await capture(page, vp, "05-search-results");
    await s.fill("");
    await page.waitForTimeout(1200);
    await page.mouse.click(5, 300).catch(() => {});
  });
  await step("filters", async () => {
    await press(page.locator("button:has(svg.lucide-funnel), button:has(svg.lucide-filter)").first());
    await capture(page, vp, "06-filters");
    await page.locator(".scroll-thin").filter({ hasText: "AREA" }).first().evaluate((e) => { e.scrollTop = e.scrollHeight; });
    await capture(page, vp, "07-filters-bottom");
    const x = page.locator(".scroll-thin").filter({ hasText: "AREA" }).first().locator("button").first();
    await press(x);
  });
  await step("legend", async () => {
    await press(page.getByRole("button", { name: /show map legend/i }).first());
    await capture(page, vp, "08-legend");
    await press(page.getByRole("button", { name: /hide map legend/i }).first());
  });
  await step("grid+panel", async () => {
    await press(page.locator("button", { hasText: /^Grid$/ }).first());
    await page.waitForTimeout(2200);
    await capture(page, vp, "09-grid");
    await press(page.locator("main button, main [class*=cursor-pointer]").filter({ hasText: /\d+ open|hiring/i }).first());
    await page.waitForTimeout(3000);
    await capture(page, vp, "10-company");
    const sc = page.locator("div.overflow-y-auto:visible").last();
    await sc.evaluate((e) => { e.scrollTop = e.scrollHeight * 0.45; });
    await capture(page, vp, "11-company-mid");
    await sc.evaluate((e) => { e.scrollTop = e.scrollHeight; });
    await capture(page, vp, "12-company-end");
    log("    panel scroll:", await sc.evaluate((e) => `${e.scrollHeight}px in ${e.clientHeight}px = ${(e.scrollHeight / e.clientHeight).toFixed(1)} screens`));
    log("    panel sections:", await page.evaluate(() => [...document.querySelectorAll("h2,h3")].map((h) => h.innerText.trim()).filter(Boolean).slice(0, 12).join(" | ")));
    await press(page.getByRole("button", { name: "Close" }).last());
  });
  await step("feedback", async () => {
    await press(page.locator("button:has(svg.lucide-message-square-plus), [aria-label='Send feedback']").first());
    await capture(page, vp, "13-feedback");
    await page.keyboard.press("Escape");
    await page.goto(LIVE + "/", { waitUntil: "load" });
    await page.waitForTimeout(3000);
  });
  await step("for-companies", async () => {
    await press(page.locator("header button, nav button").filter({ has: page.locator("svg.lucide-chevron-down") }).first());
    await capture(page, vp, "14-for-companies");
  });
  for (const [i, p] of [["15", "assistant"], ["16", "tracker"], ["17", "profile"], ["18", "recruiters"], ["19", "register"], ["20", "privacy"], ["21", "does-not-exist"]]) {
    await step(p, async () => {
      await page.goto(`${LIVE}/${p}`, { waitUntil: "load", timeout: 60000 });
      await page.waitForTimeout(2500);
      await capture(page, vp, `${i}-${p}`);
    });
  }
  if (errors.size) log("    page errors:", [...errors]);
  await ctx.close();
}

async function signedInWalk(browser, vp) {
  const touch = !!VIEWPORTS[vp].hasTouch;
  const link = await (await fetch(`${API}/auth/request-link`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: EMAIL }) })).json();
  const ctx = await browser.newContext(VIEWPORTS[vp]);
  const page = await ctx.newPage();
  const press = (l) => (touch ? l.tap({ timeout: 8000 }) : l.click({ timeout: 8000 }));
  await page.goto(link.dev_magic_link, { waitUntil: "load" });
  await page.waitForTimeout(3000);
  await step("signed-in company", async () => {
    await page.goto(LOCAL + "/", { waitUntil: "load" });
    await page.waitForTimeout(4000);
    await press(page.locator("button", { hasText: /^Grid$/ }).first());
    await page.waitForTimeout(2000);
    await press(page.locator("main button, main [class*=cursor-pointer]").filter({ hasText: /Swiggy/ }).first());
    await page.waitForTimeout(2500);
    await capture(page, vp, "30-in-company");
    const save = page.locator("button[title='Save to your tracker']");
    log("    save buttons:", await save.count());
    for (let i = 0; i < 2 && i < (await save.count()); i++) { await press(save.nth(0)); await page.waitForTimeout(900); }
    const submit = page.locator("button", { hasText: "SUBMIT" }).first();
    await submit.scrollIntoViewIfNeeded();
    await capture(page, vp, "31-in-submit");
    await press(submit);
    await page.waitForTimeout(2000);
    await capture(page, vp, "32-in-applied");
  });
  for (const [i, p] of [["33", "tracker"], ["34", "profile"], ["35", "assistant"], ["36", "recruiters"], ["37", "register"]]) {
    await step(p, async () => {
      await page.goto(`${LOCAL}/${p}`, { waitUntil: "load" });
      await page.waitForTimeout(3000);
      await capture(page, vp, `${i}-in-${p}`);
      if (p === "tracker") log("    tracker:", await page.evaluate(() => `scrollW=${document.documentElement.scrollWidth} innerScroll=${[...document.querySelectorAll("div")].filter((d) => d.scrollWidth > d.clientWidth + 20 && getComputedStyle(d).overflowX !== "visible").map((d) => `${d.scrollWidth}/${d.clientWidth}`).slice(0, 2)}`));
    });
  }
  await ctx.close();
}

async function sheet(name, files, cols, cellW) {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: cols * (cellW + 10) + 10, height: 900 } });
  const cells = files.map((f) => {
    const b64 = fs.readFileSync(`${out}/${f}`).toString("base64");
    return `<figure><figcaption>${f.replace(".png", "")}</figcaption><img src="data:image/png;base64,${b64}"></figure>`;
  }).join("");
  await page.setContent(`<style>body{margin:5px;background:#333;display:grid;grid-template-columns:repeat(${cols},${cellW}px);gap:10px;font:13px sans-serif;color:#fff}figure{margin:0}img{width:100%;display:block}</style>${cells}`, { waitUntil: "load" });
  await page.screenshot({ path: `${out}/sheet-${name}.png`, fullPage: true });
  await browser.close();
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  log("browser:", browser.version());
  for (const vp of ["phone", "iphone", "tablet", "desktop"]) {
    log(`\n=== ${vp} ===`);
    await liveWalk(browser, vp);
  }
  log("\n=== signed in (local) ===");
  for (const vp of ["phone", "desktop"]) await signedInWalk(browser, vp);
  await browser.close();
  fs.writeFileSync(`${out}/metrics.json`, JSON.stringify(results, null, 1));
  const files = fs.readdirSync(out).filter((f) => f.endsWith(".png") && !f.startsWith("sheet"));
  const pick = (vp, lo, hi) => files.filter((f) => f.startsWith(vp + "-") && +f.split("-")[1] >= lo && +f.split("-")[1] <= hi).sort();
  await sheet("phone-a", pick("phone", 1, 8), 4, 300);
  await sheet("phone-b", pick("phone", 9, 14), 3, 300);
  await sheet("phone-c", pick("phone", 15, 21), 4, 300);
  await sheet("phone-d", pick("phone", 30, 37), 4, 300);
  await sheet("tablet", pick("tablet", 1, 14), 4, 380);
  await sheet("desktop-a", pick("desktop", 1, 14), 3, 560);
  await sheet("desktop-b", [...pick("desktop", 15, 19), ...pick("desktop", 30, 37)], 3, 560);
  log("\nsheets done");
})().catch((e) => { console.error(e); process.exit(1); });
