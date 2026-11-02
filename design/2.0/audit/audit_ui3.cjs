const { createRequire } = require("module");
const req = createRequire("D:/SW/personal/DECODING/DECODING-JOBS/apps/web/package.json");
const { chromium, devices } = req("playwright");
const out = process.argv[2];
const LIVE = "https://decoding-jobs.vercel.app/";
const log = (...a) => console.log(...a);
const shot = (p, n) => p.screenshot({ path: `${out}/${n}.png` });
const bar = (p) => p.evaluate(() => document.body.innerText.replace(/\s+/g, " ").match(/\d+( of \d+\+?)? compan[^|]{0,30}/)?.[0] ?? "(no count)");
async function step(name, fn) { try { await fn(); } catch (e) { log(`  !! ${name} FAILED: ${e.message.split("\n")[0].slice(0, 170)}`); } }
const chennai = async (page) => {
  await page.locator("button", { hasText: /^Bengaluru\s*\d*/ }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /^Chennai/ }).first().click();
  await page.waitForTimeout(5000);
};
const panelBtn = (page, name) => page.locator(".scroll-thin").filter({ hasText: "AREA" }).first().locator("button", { hasText: name }).first();
const watch = (page, calls) => page.on("response", async (r) => {
  if (!r.url().includes("/companies/search")) return;
  const u = new globalThis.URL(r.url());
  try { calls.push(`${u.searchParams.get("area") ?? "-"}=>${(await r.json()).length}`); } catch {}
});

(async () => {
  const browser = await chromium.launch();

  log("[#9 mobile, default Chennai view]");
  let ctx = await browser.newContext({ ...devices["iPhone 13"] });
  let page = await ctx.newPage();
  let calls = [];
  watch(page, calls);
  await page.goto(LIVE, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(6000);
  await step("mobile area", async () => {
    await page.locator("button", { hasText: /^Bengaluru\s*\d*/ }).first().tap();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /^Chennai/ }).first().tap();
    await page.waitForTimeout(5000);
    await page.locator("button:has(svg.lucide-funnel), button:has(svg.lucide-filter)").first().tap();
    await page.waitForTimeout(700);
    for (const a of ["Pallavaram", "Porur", "Velachery"]) {
      calls.length = 0;
      const b = panelBtn(page, a);
      await b.scrollIntoViewIfNeeded();
      await b.tap();
      await page.waitForTimeout(3500);
      log(`  ${a}: label="${(await b.innerText()).replace(/\s+/g, " ")}" | ${await bar(page)} | api ${calls.join(",")}`);
      await shot(page, `m3-area-${a}`);
      await b.tap();
      await page.waitForTimeout(900);
    }
  });
  await ctx.close();

  log("[#9 desktop, zoomed into one neighbourhood]");
  ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  calls = [];
  watch(page, calls);
  await page.goto(LIVE, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(6000);
  await chennai(page);
  await step("zoomed area", async () => {
    for (let i = 0; i < 2; i++) {
      await page.getByRole("button", { name: /zoom in/i }).first().click();
      await page.waitForTimeout(1500);
    }
    log("  zoomed:", await bar(page));
    await page.locator("button", { hasText: /^Filters/ }).first().click();
    await page.waitForTimeout(600);
    calls.length = 0;
    const b = panelBtn(page, "Pallavaram");
    await b.scrollIntoViewIfNeeded();
    await b.click();
    await page.waitForTimeout(3500);
    log(`  Pallavaram: label="${(await b.innerText()).replace(/\s+/g, " ")}" | ${await bar(page)} | api ${calls.join(",")}`);
    await shot(page, "d3-zoomed-area");
    log("  message:", await page.evaluate(() => (document.body.innerText.match(/[^\n]*(None of|No compan|Nothing)[^\n]*/) ?? [""])[0]));
  });
  await ctx.close();

  log("[#7 hover pins near the top]");
  ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  await page.goto(LIVE, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(6000);
  await chennai(page);
  await step("top", async () => {
    const pins = () => page.locator(".maplibregl-marker").evaluateAll((els) => els.map((e) => {
      const r = e.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: e.innerText.trim() };
    }).filter((b) => b.y > 118 && b.x > 10 && b.x < 1380).sort((a, b) => a.y - b.y));
    let ps = await pins();
    const first = ps[0];
    await page.mouse.move(700, 500);
    await page.mouse.down();
    await page.mouse.move(700, 500 - (first.y - 135), { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(3000);
    ps = await pins();
    log("  near toolbar:", ps.slice(0, 5).map((p) => `${p.t || "pin"}@${Math.round(p.y)}`).join(" "));
    await page.mouse.move(ps[0].x, ps[0].y);
    await page.waitForTimeout(800);
    await shot(page, "d3-top-hover");
    const cluster = ps.find((p) => /^\d+$/.test(p.t));
    if (cluster) {
      await page.mouse.move(cluster.x, cluster.y);
      await page.waitForTimeout(800);
      await shot(page, "d3-top-cluster-hover");
    }
    const info = await page.evaluate(() => [...document.querySelectorAll(".maplibregl-popup-content, .maplibregl-marker .absolute")].map((e) => {
      const r = e.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), text: e.innerText.slice(0, 30) };
    }).filter((x) => x.text.length > 3));
    log("  labels:", JSON.stringify(info.slice(0, 4)));
  });
  await ctx.close();

  log("[#4 apply + refresh, LOCAL]");
  const API = "http://localhost:8000/api/v1";
  const link = await (await fetch(`${API}/auth/request-link`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "claude-verify-temp@example.com" }) })).json();
  ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  let hits = [];
  page.on("response", (r) => { if (/applications/.test(r.url()) && r.request().method() === "POST") hits.push(`POST ${new globalThis.URL(r.url()).pathname} ${r.status()}`); });
  await page.goto(link.dev_magic_link, { waitUntil: "load" });
  await page.waitForTimeout(3000);
  await step("apply", async () => {
    await page.goto("http://localhost:3333/", { waitUntil: "load" });
    await page.waitForTimeout(4000);
    await page.locator("button", { hasText: /^Grid$/ }).first().click();
    await page.waitForTimeout(2500);
    const card = page.locator("main button, main [class*=cursor-pointer]").filter({ hasText: /\d+ open/i }).first();
    const title = (await card.innerText()).split("\n")[0];
    const open = async () => {
      await page.locator("main button, main [class*=cursor-pointer]").filter({ hasText: title }).first().click();
      await page.waitForTimeout(2500);
    };
    await open();
    const labels = () => page.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.innerText.trim().replace(/\s+/g, " ")).filter((t) => /appl|track/i.test(t)));
    log("  company:", title, "| before:", await labels());
    const applyBtn = page.locator("button").filter({ hasText: /appl|track/i }).last();
    log("  clicking:", (await applyBtn.innerText()).trim().replace(/\s+/g, " "));
    await applyBtn.click();
    await page.waitForTimeout(2500);
    log("  after apply:", hits.join(", "), "| shows Applied:", await page.evaluate(() => /\bApplied\b/.test(document.body.innerText)));
    await shot(page, "l-applied");
    hits = [];
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(3500);
    log("  after refresh panel open:", await page.evaluate(() => /Open Roles/.test(document.body.innerText)));
    await page.locator("button", { hasText: /^Grid$/ }).first().click();
    await page.waitForTimeout(2500);
    await open();
    log("  reopened: shows Applied:", await page.evaluate(() => /\bApplied\b/.test(document.body.innerText)), "| buttons:", await labels());
    await shot(page, "l-after-refresh");
    await page.goto("http://localhost:3333/tracker", { waitUntil: "load" });
    await page.waitForTimeout(3500);
    log("  tracker board has it:", await page.evaluate((t) => document.body.innerText.includes(t), title));
  });
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
