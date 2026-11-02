const { createRequire } = require("module");
const req = createRequire("D:/SW/personal/DECODING/DECODING-JOBS/apps/web/package.json");
const { chromium, devices } = req("playwright");
const out = process.argv[2];
const URL = "https://decoding-jobs.vercel.app/";
const log = (...a) => console.log(...a);

async function step(name, fn) {
  try { await fn(); } catch (e) { log(`  !! ${name} FAILED: ${e.message.split("\n")[0].slice(0, 160)}`); }
}
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.png` });
const bar = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").match(/\d+( of \d+\+?)? compan[^|]{0,30}/)?.[0] ?? "(no count)");
const markers = (page) => page.locator(".maplibregl-marker").count();

async function pickCity(page, city) {
  await page.locator("button", { hasText: /^(Bengaluru|Chennai|Mumbai|Hyderabad)\s*\d*/ }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: new RegExp(`^${city}`) }).first().click();
  await page.waitForTimeout(5000);
}

(async () => {
  const browser = await chromium.launch();

  log("\n=== DESKTOP ===");
  let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(7000);

  log("[#1 zoom] start:", await bar(page), "markers", await markers(page));
  await step("zoom", async () => {
    for (let i = 1; i <= 6; i++) {
      await page.getByRole("button", { name: /zoom in/i }).first().click();
      await page.waitForTimeout(1600);
      log(`  zoom-in x${i}:`, await bar(page), "markers", await markers(page));
    }
    await shot(page, "d-zoom6");
  });

  await page.goto(URL, { waitUntil: "load" });
  await page.waitForTimeout(5000);
  await step("chennai", async () => {
    await pickCity(page, "Chennai");
    log("[Chennai]", await bar(page), "markers", await markers(page));
    await shot(page, "d-chennai");
  });

  log("[#7 top pin popup]");
  await step("popup", async () => {
    const boxes = await page.locator(".maplibregl-marker").evaluateAll((els) =>
      els.map((e, i) => { const r = e.getBoundingClientRect(); return { i, top: r.top, left: r.left, w: r.width, h: r.height }; }));
    const visible = boxes.filter((b) => b.top > 60 && b.top < 880 && b.left > 0 && b.left < 1400).sort((a, b) => a.top - b.top);
    log("  highest pin tops:", visible.slice(0, 5).map((b) => Math.round(b.top)));
    const t = visible[0];
    await page.mouse.move(t.left + t.w / 2, t.top + t.h / 2);
    await page.waitForTimeout(900);
    await shot(page, "d-top-pin-hover");
    const tip = await page.evaluate(() => {
      const bar = [...document.querySelectorAll("input")][0]?.getBoundingClientRect();
      const pop = document.querySelector(".maplibregl-popup-content") ?? [...document.querySelectorAll(".maplibregl-marker [class*=absolute]")].find((e) => e.innerText?.length > 3);
      if (!pop) return "no tooltip element";
      const r = pop.getBoundingClientRect();
      return { tooltipTop: Math.round(r.top), tooltipBottom: Math.round(r.bottom), toolbarBottom: Math.round(bar?.bottom ?? 0), clippedByToolbar: r.top < (bar?.bottom ?? 0), text: pop.innerText.slice(0, 60) };
    });
    log("  ", JSON.stringify(tip));
  });

  log("[#9 area filter]");
  await step("area", async () => {
    await page.getByRole("button", { name: /Filters/ }).first().click();
    await page.waitForTimeout(800);
    await shot(page, "d-filters");
    for (const area of ["Pallavaram", "Porur", "Velachery"]) {
      const b = page.getByRole("button", { name: new RegExp(area) }).first();
      await b.click();
      await page.waitForTimeout(3500);
      log(`  ${area}: button="${(await b.innerText()).replace(/\s+/g, " ")}"`, await bar(page), "markers", await markers(page));
      await shot(page, `d-area-${area}`);
      await b.click();
      await page.waitForTimeout(800);
    }
  });

  log("[#3 refresh / #2 description]");
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForTimeout(5000);
  await step("panel", async () => {
    await pickCity(page, "Chennai");
    await page.getByRole("button", { name: /^Grid$/ }).first().click();
    await page.waitForTimeout(2500);
    await shot(page, "d-grid");
    await page.locator("[class*=cursor-pointer], main button, main article").filter({ hasText: /Chennai/ }).first().click();
    await page.waitForTimeout(3500);
    const hasPanel = async () => page.evaluate(() => /Job Description|Open Roles|Apply/i.test(document.body.innerText));
    log("  panel open:", await hasPanel());
    await shot(page, "d-panel");
    const more = page.getByRole("button", { name: /show more/i }).first();
    if (await more.count()) {
      await more.click();
      await page.waitForTimeout(400);
      await shot(page, "d-panel-expanded");
      log("  expanded description: 'Show more' works");
    } else log("  no Show more on this one");
    log("  url after select:", page.url());
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(5000);
    log("  panel after refresh:", await hasPanel(), "| view:", await page.evaluate(() => /Map/.test(document.body.innerText)), "| url", page.url());
    await shot(page, "d-after-refresh");
  });

  log("[#10 grid<->map]");
  await step("toggle", async () => {
    const vis = () => page.evaluate(() => { const c = document.querySelector("canvas"); if (!c) return "no canvas"; const r = c.getBoundingClientRect(); return `${getComputedStyle(c.parentElement.parentElement.parentElement).visibility} ${Math.round(r.width)}x${Math.round(r.height)}`; });
    log("  start:", await vis());
    await page.getByRole("button", { name: /^Grid$/ }).first().click();
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: /^Map$/ }).first().click();
    await page.waitForTimeout(2500);
    log("  grid->map:", await vis(), "markers", await markers(page));
  });
  log("[#6 logo]", await page.locator("header a, nav a").first().getAttribute("href"));
  await ctx.close();

  log("\n[#10b WebGL unavailable]");
  const noGl = await chromium.launch({ args: ["--disable-webgl", "--disable-webgl2", "--disable-3d-apis", "--disable-gpu", "--disable-software-rasterizer"] });
  ctx = await noGl.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message.slice(0, 120)));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 120)); });
  await page.goto(URL, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(7000);
  log("  webgl available:", await page.evaluate(() => !!document.createElement("canvas").getContext("webgl2") || !!document.createElement("canvas").getContext("webgl")));
  log("  text:", (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ").slice(0, 200));
  log("  errors:", [...new Set(errs)].slice(0, 4));
  await shot(page, "d-nowebgl");
  await page.getByRole("button", { name: /^Grid$/ }).first().click().catch(() => {});
  await page.waitForTimeout(2500);
  await shot(page, "d-nowebgl-grid");
  await page.getByRole("button", { name: /^Map$/ }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  await shot(page, "d-nowebgl-map");
  await noGl.close();

  log("\n=== MOBILE (iPhone 13, touch) ===");
  ctx = await browser.newContext({ ...devices["iPhone 13"] });
  page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(7000);
  await shot(page, "m-home");
  const audit = async (label) => {
    const r = await page.evaluate(() => {
      const vis = [...document.querySelectorAll("a,button,input,select,[role=button]")].filter((e) => {
        const b = e.getBoundingClientRect();
        return b.width > 0 && b.height > 0 && b.top < innerHeight && b.bottom > 0 && getComputedStyle(e).visibility !== "hidden";
      });
      const small = vis.filter((e) => { const b = e.getBoundingClientRect(); return !e.closest(".maplibregl-marker") && (b.height < 44 || b.width < 44); });
      const name = (e) => (e.getAttribute("aria-label") || e.innerText || e.placeholder || e.title || e.tagName).replace(/\s+/g, " ").slice(0, 24);
      const nameless = vis.filter((e) => !e.closest(".maplibregl-marker") && !(e.getAttribute("aria-label") || e.innerText?.trim() || e.placeholder || e.title)).length;
      return { controls: vis.filter((e) => !e.closest(".maplibregl-marker")).length, under44: small.length, nameless, overflowX: document.documentElement.scrollWidth > innerWidth,
        list: small.slice(0, 14).map((e) => { const b = e.getBoundingClientRect(); return `${name(e)} ${Math.round(b.width)}x${Math.round(b.height)}`; }) };
    });
    log(`  [${label}] controls=${r.controls} under44px=${r.under44} unlabeled=${r.nameless} overflowX=${r.overflowX}`);
    log("    ", r.list.join(" | "));
  };
  await audit("home");
  await step("m-filters", async () => {
    const f = page.getByRole("button", { name: /filter/i }).first();
    await f.tap();
    await page.waitForTimeout(1000);
    await shot(page, "m-filters");
    await audit("filters open");
    await page.keyboard.press("Escape");
  });
  await page.goto(URL, { waitUntil: "load" });
  await page.waitForTimeout(5000);
  await step("m-city", async () => {
    await pickCity(page, "Chennai").catch(() => {});
    await shot(page, "m-chennai");
  });
  await step("m-grid", async () => {
    await page.getByRole("button", { name: /^Grid$/ }).first().tap();
    await page.waitForTimeout(2500);
    await shot(page, "m-grid");
    await audit("grid");
    await page.locator("main button, [class*=cursor-pointer]").filter({ hasText: /Chennai/ }).first().tap();
    await page.waitForTimeout(3500);
    await shot(page, "m-sheet");
    await audit("company sheet");
    const scroller = page.locator(".overflow-y-auto").last();
    await scroller.evaluate((e) => { e.scrollTop = e.scrollHeight; });
    await page.waitForTimeout(400);
    await shot(page, "m-sheet-bottom");
  });
  for (const p of ["tracker", "assistant", "profile"]) {
    await step(p, async () => {
      await page.goto(URL + p, { waitUntil: "load" });
      await page.waitForTimeout(3000);
      await shot(page, `m-${p}`);
      await audit(p);
    });
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
