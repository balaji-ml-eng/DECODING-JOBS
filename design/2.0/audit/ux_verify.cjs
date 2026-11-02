const { createRequire } = require("module");
const req = createRequire("D:/SW/personal/DECODING/DECODING-JOBS/apps/web/package.json");
const { chromium, devices } = req("playwright");
const out = process.argv[2];
const LIVE = "https://decoding-jobs.vercel.app";
const LOCAL = "http://localhost:3333";
const API = "http://localhost:8000/api/v1";
const EMAIL = "claude-verify-temp@example.com";
const log = (...a) => console.log(...a);
const PHONE = { ...devices["Pixel 5"], viewport: { width: 360, height: 640 } };
const IPHONE = { ...devices["iPhone 13"] };
async function step(name, fn) { try { await fn(); } catch (e) { log(`  !! ${name}: ${e.message.split("\n")[0].slice(0, 170)}`); } }
const text = (p) => p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });

  log("[A1] 360px phone, API awake");
  let t0 = Date.now();
  const warm = await fetch("https://decoding-jobs-api.onrender.com/health");
  log(`  api /health ${warm.status} in ${Date.now() - t0}ms`);
  let ctx = await browser.newContext(PHONE);
  let page = await ctx.newPage();
  await page.goto(LIVE + "/", { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${out}/v-a1-phone-warm.png` });
  log("  pins:", await page.locator(".maplibregl-marker").count(), "| text:", (await text(page)).slice(0, 110));
  await step("phone city", async () => {
    await page.locator("button", { hasText: /^Bengaluru/ }).first().tap({ timeout: 8000 });
    await page.waitForTimeout(800);
    log("  city options:", await page.getByRole("button", { name: /^(Chennai|Mumbai|Pune)/ }).count());
    await page.screenshot({ path: `${out}/v-a1-phone-city.png` });
  });
  await ctx.close();

  for (const [label, handler] of [
    ["A2 API unreachable", (r) => r.abort()],
    ["A3 API takes 40s (like a sleeping server)", async (r) => { await new Promise((s) => setTimeout(s, 40000)); await r.continue().catch(() => {}); }],
  ]) {
    log(`[${label}]`);
    ctx = await browser.newContext(PHONE);
    page = await ctx.newPage();
    await page.route("**/decoding-jobs-api.onrender.com/**", handler);
    await page.goto(LIVE + "/", { waitUntil: "load", timeout: 90000 });
    for (const sec of [5, 15]) {
      await page.waitForTimeout(sec === 5 ? 5000 : 10000);
      log(`  map at ${sec}s:`, (await text(page)).slice(0, 110), "| loading/err words:", /loading|waking|try again|retry|couldn.t|something went wrong|unavailable/i.test(await text(page)));
    }
    await page.screenshot({ path: `${out}/v-${label.slice(0, 2)}-map.png` });
    await page.locator("button", { hasText: /^Grid$/ }).first().tap({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
    log("  grid:", (await text(page)).slice(50, 190));
    await page.screenshot({ path: `${out}/v-${label.slice(0, 2)}-grid.png` });
    await ctx.close();
  }

  log("[B] header and toolbar by width");
  for (const w of [768, 900, 1024, 1180, 1280, 1366]) {
    ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
    page = await ctx.newPage();
    await page.goto(LIVE + "/", { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(3500);
    const r = await page.evaluate(() => {
      const links = [...document.querySelectorAll("header a, header button, nav a, nav button")].filter((e) => e.getBoundingClientRect().width > 0);
      const off = links.filter((e) => e.getBoundingClientRect().right > innerWidth + 1).map((e) => (e.innerText || e.getAttribute("aria-label") || "?").trim().replace(/\s+/g, " "));
      const wrap = links.filter((e) => e.innerText.includes("\n") || e.getBoundingClientRect().height > 44).map((e) => e.innerText.trim().replace(/\s+/g, " "));
      const tools = [...document.querySelectorAll("main button")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.top < 200 && !e.closest(".maplibregl-marker"); });
      const clipped = tools.filter((e) => e.getBoundingClientRect().right > innerWidth + 1).map((e) => e.innerText.trim().replace(/\s+/g, " ") || "?");
      return { headerOffscreen: off, headerWrapped: wrap, toolbarOffscreen: clipped, toolbarRows: new Set(tools.map((e) => Math.round(e.getBoundingClientRect().top / 20))).size };
    });
    log(`  ${w}px:`, JSON.stringify(r));
    if (w === 768 || w === 1024) await page.screenshot({ path: `${out}/v-b-${w}.png` });
    await ctx.close();
  }

  log("[D] phone geometry");
  ctx = await browser.newContext(IPHONE);
  page = await ctx.newPage();
  await page.goto(LIVE + "/", { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(5000);
  const chrome = await page.evaluate(() => {
    const items = [...document.querySelectorAll("main button, main input")].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.top < 300 && !e.closest(".maplibregl-marker"); });
    const bottom = Math.max(...items.map((e) => e.getBoundingClientRect().bottom));
    return { toolbarBottom: Math.round(bottom), screen: innerHeight, pct: Math.round((bottom / innerHeight) * 100) };
  });
  log("  floating controls end:", JSON.stringify(chrome));
  await step("sheet", async () => {
    await page.locator("button", { hasText: /^Grid$/ }).first().tap();
    await page.waitForTimeout(2500);
    const obscured = await page.evaluate(() => {
      const card = [...document.querySelectorAll("main button, main [class*=cursor-pointer]")].find((e) => /open role|no open/i.test(e.innerText));
      const b = card.getBoundingClientRect();
      const top = document.elementFromPoint(b.left + 40, b.top + 40);
      return { cardTop: Math.round(b.top), coveredByToolbar: !card.contains(top), hit: top?.innerText?.slice(0, 20) };
    });
    log("  first grid card:", JSON.stringify(obscured));
    await page.locator("main button, main [class*=cursor-pointer]").filter({ hasText: /\d+ open/i }).first().tap();
    await page.waitForTimeout(3000);
    const g = await page.evaluate(() => {
      const sc = document.querySelector(".fixed.inset-0.z-40 .overflow-y-auto") ;
      if (!sc) return "no sheet";
      const top = sc.getBoundingClientRect().top;
      const at = (t) => { const h = [...sc.querySelectorAll("h2")].find((x) => x.innerText.includes(t)); return h ? Math.round(h.getBoundingClientRect().top - top) : null; };
      const submit = [...sc.querySelectorAll("button")].find((b) => /submit/i.test(b.innerText));
      return { sheetH: sc.clientHeight, contentH: sc.scrollHeight, screens: +(sc.scrollHeight / sc.clientHeight).toFixed(1), openRolesAt: at("Open Roles"), submitAt: submit ? Math.round(submit.getBoundingClientRect().top - top) : null, descriptionAt: at("Job Description") };
    });
    log("  company sheet:", JSON.stringify(g));
    await page.screenshot({ path: `${out}/v-d-sheet.png` });
  });
  await ctx.close();

  log("[C] SUBMIT and refresh, LOCAL, desktop");
  const link = await (await fetch(`${API}/auth/request-link`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: EMAIL }) })).json();
  ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  const posts = [];
  page.on("response", (r) => { if (r.request().method() === "POST" && /applications/.test(r.url())) posts.push(`${new globalThis.URL(r.url()).pathname} ${r.status()}`); });
  await page.goto(link.dev_magic_link, { waitUntil: "load" });
  await page.waitForTimeout(3000);
  await step("submit", async () => {
    await page.goto(LOCAL + "/", { waitUntil: "load" });
    await page.waitForTimeout(4000);
    await page.locator("button", { hasText: /^Grid$/ }).first().click();
    await page.waitForTimeout(2500);
    const swiggy = page.locator("main button, main [class*=cursor-pointer]").filter({ hasText: /Swiggy/ }).first();
    await swiggy.click();
    await page.waitForTimeout(2500);
    const panelName = () => page.evaluate(() => document.querySelector("main .absolute.z-30 h1, main .absolute.z-30 h2, main .absolute.z-30 p")?.innerText);
    log("  panel:", await panelName());
    const submit = page.locator("button", { hasText: "SUBMIT" }).first();
    const box = await submit.boundingBox();
    log("  SUBMIT box:", JSON.stringify(box), "scroll main:", await page.evaluate(() => [window.scrollY, document.querySelector("main")?.scrollTop]));
    await submit.click();
    await page.waitForTimeout(2500);
    log("  posts:", posts.join(", ") || "none", "| panel now:", await panelName(), "| shows Applied:", /\bApplied\b/.test(await text(page)));
    await page.screenshot({ path: `${out}/v-c-after-submit.png` });
    posts.length = 0;
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(3500);
    log("  after refresh, panel open:", /Open Roles/.test(await text(page)));
    await page.locator("button", { hasText: /^Grid$/ }).first().click();
    await page.waitForTimeout(2500);
    await page.locator("main button, main [class*=cursor-pointer]").filter({ hasText: /Swiggy/ }).first().click();
    await page.waitForTimeout(2500);
    log("  reopened: shows Applied:", /\bApplied\b/.test(await text(page)), "| SUBMIT offered again:", await page.locator("button", { hasText: "SUBMIT" }).count());
    await page.screenshot({ path: `${out}/v-c-reopened.png` });
    await page.goto(LOCAL + "/tracker", { waitUntil: "load" });
    await page.waitForTimeout(3500);
    log("  tracker has Swiggy under Applied:", await page.evaluate(() => { const t = document.body.innerText; return t.includes("Swiggy") ? t.replace(/\s+/g, " ").slice(t.replace(/\s+/g, " ").indexOf("SAVED"), t.replace(/\s+/g, " ").indexOf("SAVED") + 120) : "no"; }));
  });
  await ctx.close();
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
