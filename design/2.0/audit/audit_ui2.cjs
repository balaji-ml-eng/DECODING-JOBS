const { createRequire } = require("module");
const req = createRequire("D:/SW/personal/DECODING/DECODING-JOBS/apps/web/package.json");
const { chromium, devices } = req("playwright");
const out = process.argv[2];
const LIVE = "https://decoding-jobs.vercel.app/";
const log = (...a) => console.log(...a);
const shot = (p, n) => p.screenshot({ path: `${out}/${n}.png` });
const bar = (p) => p.evaluate(() => document.body.innerText.replace(/\s+/g, " ").match(/\d+( of \d+\+?)? compan[^|]{0,30}/)?.[0] ?? "(no count)");
async function step(name, fn) { try { await fn(); } catch (e) { log(`  !! ${name} FAILED: ${e.message.split("\n")[0].slice(0, 170)}`); } }

async function chennai(page) {
  await page.locator("button", { hasText: /^Bengaluru\s*\d*/ }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /^Chennai/ }).first().click();
  await page.waitForTimeout(5000);
}

(async () => {
  const browser = await chromium.launch();
  let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  let page = await ctx.newPage();
  const apiCalls = [];
  page.on("response", async (r) => {
    if (r.url().includes("/companies/search")) {
      const u = new globalThis.URL(r.url());
      let n = "?"; try { n = (await r.json()).length; } catch {}
      apiCalls.push(`${u.searchParams.get("area") ?? "-"} => ${n}`);
    }
  });
  await page.goto(LIVE, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(6000);
  await chennai(page);

  log("[#9 area filter]");
  await step("area", async () => {
    await page.locator("button", { hasText: /^Filters/ }).first().click();
    await page.waitForTimeout(700);
    const panel = page.locator(".scroll-thin").filter({ hasText: "AREA" }).first();
    for (const area of ["Pallavaram", "Porur", "Adyar", "Velachery"]) {
      const b = panel.locator("button", { hasText: area }).first();
      await b.scrollIntoViewIfNeeded();
      apiCalls.length = 0;
      await b.click();
      await page.waitForTimeout(3500);
      const vis = await page.locator(".maplibregl-marker").evaluateAll((els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.left > 240 && r.top > 120 && r.right < 1440 && r.bottom < 900; }).length);
      const empty = await page.evaluate(() => /No companies|None of this city|no compan/i.test(document.body.innerText));
      log(`  ${area}: label="${(await b.innerText()).replace(/\s+/g, " ")}" | ${await bar(page)} | pins clear of panel=${vis} | emptyMsg=${empty} | api: ${apiCalls.join("; ")}`);
      await shot(page, `d2-area-${area}`);
      await b.click();
      await page.waitForTimeout(1000);
    }
    await page.locator("button", { hasText: /^Filters/ }).first().click();
  });

  log("[#7 top pins]");
  await step("top", async () => {
    const pins = async () => page.locator(".maplibregl-marker").evaluateAll((els) => els.map((e, i) => { const r = e.getBoundingClientRect(); return { i, x: r.left + r.width / 2, y: r.top + r.height / 2, t: e.innerText.trim() }; }).filter((b) => b.y > 118 && b.x > 10 && b.x < 1380).sort((a, b) => a.y - b.y));
    let ps = await pins();
    log("  top pins:", ps.slice(0, 6).map((p) => `${p.t || "pin"}@${Math.round(p.y)}`).join(" "));
    // Drag the map so a pin sits just under the toolbar, as it does after a pan.
    const t = ps.find((p) => !/^\d+$/.test(p.t)) ?? ps[0];
    await page.mouse.move(700, 500); await page.mouse.down(); await page.mouse.move(700, 500 - (t.y - 150), { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(3500);
    ps = await pins();
    const under = ps.filter((p) => p.y < 240);
    log("  after pan, pins near toolbar:", under.slice(0, 6).map((p) => `${p.t || "pin"}@${Math.round(p.y)}`).join(" "));
    const p = under.find((x) => !/^\d+$/.test(x.t)) ?? under[0];
    await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(900);
    await shot(page, "d2-top-hover");
    const r = await page.evaluate((py) => {
      const tb = document.querySelector("input")?.getBoundingClientRect().bottom ?? 0;
      const box = [...document.querySelectorAll(".maplibregl-popup-content, .maplibregl-marker div")].filter((e) => getComputedStyle(e).position === "absolute" && e.innerText?.includes("hiring") || e.classList?.contains("maplibregl-popup-content"));
      const b = box[0]?.getBoundingClientRect();
      return b ? { top: Math.round(b.top), bottom: Math.round(b.bottom), toolbarBottom: Math.round(tb), behindToolbar: b.top < tb, placedBelow: b.top > py } : "no tooltip";
    }, p.y);
    log("  hover tooltip:", JSON.stringify(r));
    const cl = ps.find((x) => /^\d+$/.test(x.t) && x.y < 400);
    if (cl) log("  cluster sample", cl.t, Math.round(cl.y));
  });
  await ctx.close();

  log("[mobile filters + map toolbar]");
  ctx = await browser.newContext({ ...devices["iPhone 13"] });
  page = await ctx.newPage();
  await page.goto(LIVE, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(6000);
  await step("mfilters", async () => {
    await page.locator("button:has(svg.lucide-funnel), button:has(svg.lucide-filter)").first().tap();
    await page.waitForTimeout(800);
    await shot(page, "m2-filters");
    const r = await page.evaluate(() => {
      const p = [...document.querySelectorAll(".scroll-thin")].find((e) => /AREA/i.test(e.innerText));
      const b = p.getBoundingClientRect();
      const close = p.querySelector("button");
      return { panelH: Math.round(b.height), scrollH: p.scrollHeight, screens: +(p.scrollHeight / b.height).toFixed(1), rows: p.querySelectorAll("button").length, firstBtn: close && Math.round(close.getBoundingClientRect().height) };
    });
    log("  filter sheet:", JSON.stringify(r));
    log("  has sticky Apply/Show results:", await page.evaluate(() => /show \d|apply filter|show results/i.test(document.body.innerText)));
  });
  await page.evaluate(() => document.querySelector(".fixed.inset-0.z-40")?.click());
  await ctx.close();

  log("\n[#4 apply + refresh — LOCAL]");
  const API = "http://localhost:8000/api/v1";
  const link = await (await fetch(`${API}/auth/request-link`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "claude-verify-temp@example.com" }) })).json();
  ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await ctx.newPage();
  const hits = [];
  page.on("response", (r) => { if (/applications/.test(r.url()) && r.request().method() !== "OPTIONS") hits.push(`${r.request().method()} ${new globalThis.URL(r.url()).pathname} ${r.status()}`); });
  await page.goto(link.dev_magic_link, { waitUntil: "load" });
  await page.waitForTimeout(3000);
  await step("apply", async () => {
    await page.goto("http://localhost:3333/", { waitUntil: "load" });
    await page.waitForTimeout(4000);
    await page.locator("button", { hasText: /^Grid$/ }).first().click();
    await page.waitForTimeout(2500);
    const card = page.locator("main button, main [class*=cursor-pointer]").filter({ hasText: /\d+ open/i }).first();
    const title = (await card.innerText()).split("\n")[0];
    await card.click();
    await page.waitForTimeout(2500);
    const btn = page.getByRole("button", { name: /apply|track/i }).last();
    log("  company:", title, "| button before:", (await btn.innerText()).trim());
    await btn.click();
    await page.waitForTimeout(2500);
    const state = () => page.evaluate(() => [...document.body.innerText.matchAll(/Applied[^\n]*/g)].map((m) => m[0]).slice(0, 2));
    log("  after apply:", await state(), hits.join(", "));
    await shot(page, "l-applied");
    hits.length = 0;
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(3500);
    log("  after refresh, panel open:", await page.evaluate(() => /Open Roles/.test(document.body.innerText)));
    await page.locator("button", { hasText: /^Grid$/ }).first().click();
    await page.waitForTimeout(2500);
    await page.locator("main button, main [class*=cursor-pointer]").filter({ hasText: title }).first().click();
    await page.waitForTimeout(2500);
    const again = page.getByRole("button", { name: /apply|track/i }).last();
    log("  reopened same company: applied shown:", await state(), "| button:", (await again.innerText()).trim());
    await shot(page, "l-after-refresh");
    await again.click().catch(() => {});
    await page.waitForTimeout(2000);
    log("  applying again:", hits.join(", "), "|", await page.evaluate(() => [...document.querySelectorAll("[data-sonner-toast]")].map((e) => e.innerText).join(" / ")));
  });
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
