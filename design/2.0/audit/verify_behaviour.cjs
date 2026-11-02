// Pass/fail checks for the Design 2.0 behaviour fixes, against the local stack.
// Usage: node verify_behaviour.cjs <out-dir>
const { createRequire } = require("module");
const req = createRequire("D:/SW/personal/DECODING/DECODING-JOBS/apps/web/package.json");
const { chromium, devices } = req("playwright");
const OUT = process.argv[2] || ".";
const BASE = "http://localhost:3333";
const API = "http://localhost:8000";
const EMAIL = "claude-verify-temp@example.com";
const IPHONE = { ...devices["iPhone 13"] };
const DESKTOP = { viewport: { width: 1440, height: 900 } };
let failed = 0;
const check = (name, ok, detail = "") => { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`); };
const text = (p) => p.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
const open = async (browser, opts, url = "/") => {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(BASE + url, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(4000);
  return { ctx, page };
};
const safely = async (name, fn) => { try { await fn(); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message.split("\n")[0].slice(0, 140)}`); } };

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });

  await safely("first view", async () => {
    const { ctx, page } = await open(browser, DESKTOP);
    const t = await text(page);
    check("First view matches the selected city", !/of 500\+ companies zoom/.test(t) || /of \d+ companies/.test(t), t.match(/\d+( of \d+\+?)? compan[^|]{0,14}/)?.[0]);
    check("Opens on the city, not all of India", await page.evaluate(() => !document.body.innerText.includes("BANGLADESH")));
    await ctx.close();
  });

  await safely("logo", async () => {
    const { ctx, page } = await open(browser, DESKTOP);
    check("Logo isn't a link on the home page", (await page.locator('header a[aria-label="DECODING JOBS home"]').count()) === 0);
    await page.goto(BASE + "/privacy", { waitUntil: "load" });
    check("Logo is a link on other pages", (await page.locator('header a[aria-label="DECODING JOBS home"]').count()) === 1);
    await ctx.close();
  });

  await safely("url", async () => {
    const { ctx, page } = await open(browser, DESKTOP);
    await page.locator("button", { hasText: /^Bengaluru/ }).first().click();
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /^Chennai/ }).first().click();
    await page.waitForTimeout(2500);
    await page.getByRole("button", { name: /^Grid$/ }).first().click();
    await page.waitForTimeout(2000);
    const name = (await page.locator("main button, main [class*=cursor-pointer]").filter({ hasText: /\d+ open/i }).first().innerText()).split("\n")[0];
    await page.locator("main button, main [class*=cursor-pointer]").filter({ hasText: /\d+ open/i }).first().click();
    await page.waitForTimeout(2000);
    const url = page.url();
    check("URL holds city, view and company", /city=Chennai/.test(url) && /view=grid/.test(url) && /company=\d+/.test(url), url.split("/").pop());
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(4000);
    const t = await text(page);
    check("Refresh keeps the company open (#3)", /Open Roles/.test(t) && t.includes(name), name);
    check("Refresh keeps the city", (await page.locator("[data-city-dropdown] button").first().innerText()).includes("Chennai"));
    check("Refresh keeps Grid view", await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.innerText.trim() === "Grid")?.className.includes("bg-gray-900")));
    await page.goBack().catch(() => {});
    await ctx.close();
  });

  await safely("back", async () => {
    const { ctx, page } = await open(browser, IPHONE, "/?view=grid");
    await page.locator("main button, main [class*=cursor-pointer]").filter({ hasText: /\d+ open/i }).first().tap();
    await page.waitForTimeout(2000);
    check("Phone: company opens", page.url().includes("company="));
    await page.goBack();
    await page.waitForTimeout(1500);
    check("Phone: Back closes the company, stays on the page", !page.url().includes("company=") && !/Open Roles/.test(await text(page)) && page.url().startsWith(BASE));
    await ctx.close();
  });

  await safely("area", async () => {
    const { ctx, page } = await open(browser, DESKTOP, "/?city=Bengaluru");
    const areas = await (await fetch(`${API}/api/v1/companies/areas?city=Chennai`)).json();
    const small = areas.filter((a) => a.count >= 1 && a.count <= 5).at(-1) ?? areas[0];
    await page.goto(`${BASE}/?city=Chennai`, { waitUntil: "load" });
    await page.waitForTimeout(3500);
    for (let i = 0; i < 3; i++) { await page.getByRole("button", { name: "Zoom in" }).click(); await page.waitForTimeout(900); }
    await page.locator("[data-filters-toggle]").click();
    await page.waitForTimeout(500);
    const b = page.locator(".scroll-thin").filter({ hasText: /Area/i }).first().locator("button", { hasText: small.area }).first();
    await b.scrollIntoViewIfNeeded();
    await b.click();
    await page.waitForTimeout(3000);
    const t = await text(page);
    const count = Number(t.match(/(\d+) compan(?:y|ies)\b/)?.[1] ?? -1);
    check(`Area filter shows its companies when zoomed elsewhere (#9): ${small.area}`, count > 0 && !/No companies/.test(t), `listed ${small.count}, shown ${count}`);
    const onScreen = await page.locator(".maplibregl-marker").evaluateAll((els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.left > 240 && r.right < innerWidth && r.top > 60 && r.bottom < innerHeight; }).length);
    check("Map moves to show the filtered companies", onScreen > 0, `${onScreen} on screen`);
    await page.screenshot({ path: `${OUT}/area-filter.png` });
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(3500);
    check("Refresh keeps the area filter", page.url().includes("area=") && Number((await text(page)).match(/(\d+) compan(?:y|ies)\b/)?.[1] ?? -1) === count);
    await ctx.close();
  });

  await safely("webgl", async () => {
    const noGl = await chromium.launch({ channel: "chrome", args: ["--disable-webgl", "--disable-webgl2", "--disable-3d-apis", "--disable-gpu", "--disable-software-rasterizer"] });
    const { ctx, page } = await open(noGl, DESKTOP);
    const hasGl = await page.evaluate(() => !!document.createElement("canvas").getContext("webgl"));
    if (hasGl) console.log("SKIP  WebGL could not be turned off in this browser");
    else {
      const t = await text(page);
      check("No WebGL: says so and switches to the list (#10)", /can't show the map/.test(t) && /\d+ open role|No open roles/.test(t));
      check("No WebGL: Map button is disabled", await page.getByRole("button", { name: /^Map$/ }).first().isDisabled());
      await page.screenshot({ path: `${OUT}/no-webgl.png` });
    }
    await ctx.close();
    await noGl.close();
  });

  for (const [label, handler, expects] of [
    ["slow API", async (r) => { await new Promise((s) => setTimeout(s, 12000)); await r.continue().catch(() => {}); }, /Waking up the server/],
    ["failed API", (r) => r.abort(), /Couldn.t load companies/],
  ]) {
    await safely(label, async () => {
      const ctx = await browser.newContext(IPHONE);
      const page = await ctx.newPage();
      await page.route("**/localhost:8000/**", handler);
      await page.goto(BASE + "/?view=grid", { waitUntil: "load" });
      await page.waitForTimeout(label === "slow API" ? 6500 : 5000);
      const t = await text(page);
      check(`${label}: clear message, not "no companies"`, expects.test(t) && !/No companies match/.test(t), t.slice(0, 80));
      await page.screenshot({ path: `${OUT}/${label.replace(" ", "-")}.png` });
      await ctx.close();
    });
  }

  await safely("apply", async () => {
    const link = await (await fetch(`${API}/api/v1/auth/request-link`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: EMAIL }) })).json();
    const ctx = await browser.newContext(DESKTOP);
    const page = await ctx.newPage();
    await page.goto(link.dev_magic_link, { waitUntil: "load" });
    await page.waitForTimeout(3000);
    await page.goto(BASE + "/?view=grid", { waitUntil: "load" });
    await page.waitForTimeout(3500);
    await page.locator("main button, main [class*=cursor-pointer]").filter({ hasText: /Swiggy/ }).first().click();
    await page.waitForTimeout(2500);
    const panel = page.locator("main .absolute.z-30").last();
    check("Clear action name", (await panel.getByRole("button", { name: /Mark as applied/ }).count()) === 1);
    await panel.getByRole("button", { name: /Mark as applied/ }).click();
    await page.waitForTimeout(2200);
    check("Shows Applied after marking", (await panel.getByText("Applied", { exact: true }).count()) > 0);
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(4500);
    const again = page.locator("main .absolute.z-30").last();
    check("Refresh keeps Applied (#4)", (await again.getByText("Applied", { exact: true }).count()) > 0 && (await again.getByRole("button", { name: /Mark as applied/ }).count()) === 0);
    await page.screenshot({ path: `${OUT}/applied-after-refresh.png` });
    await ctx.close();
  });

  await safely("many roles", async () => {
    const { ctx, page } = await open(browser, IPHONE, "/?view=grid");
    const cards = page.locator("main button, main [class*=cursor-pointer]").filter({ hasText: /\d+ open/i });
    await cards.first().tap();
    await page.waitForTimeout(2500);
    const g = await page.evaluate(() => {
      const sc = document.querySelector(".fixed.inset-0.z-40 .overflow-y-auto");
      return sc ? { h: sc.scrollHeight, c: sc.clientHeight } : null;
    });
    console.log(`INFO  company sheet ${g?.h}px in ${g?.c}px = ${(g?.h / g?.c).toFixed(1)} screens`);
    await ctx.close();
  });

  await safely("cluster popup", async () => {
    for (const [label, opts, toolbarBottom] of [["Desktop", DESKTOP, 116], ["Phone", IPHONE, 124]]) {
      const { ctx, page } = await open(browser, opts);
      const top = await page.locator(".maplibregl-marker").evaluateAll((els, min) => els.map((e) => {
        const r = e.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: e.innerText.trim() };
      }).filter((p) => /^\d+$/.test(p.t) && p.y > min && p.x > 30 && p.x < innerWidth - 60 && p.y < innerHeight - 140).sort((a, b) => a.y - b.y)[0], toolbarBottom + 20);
      if (!top) { console.log(`SKIP  ${label}: no cluster on screen`); await ctx.close(); continue; }
      await page.mouse.click(top.x, top.y);
      await page.waitForTimeout(900);
      const box = await page.locator(".maplibregl-popup-content").first().boundingBox();
      const vw = page.viewportSize().width;
      check(`${label}: top cluster list (#7) stays clear of the toolbar and on screen`, !!box && box.y >= toolbarBottom - 1 && box.x >= 0 && box.x + box.width <= vw + 1, box ? `pin y=${Math.round(top.y)}, list y=${Math.round(box.y)}-${Math.round(box.y + box.height)}` : "no list");
      await page.screenshot({ path: `${OUT}/cluster-${label.toLowerCase()}.png` });
      await ctx.close();
    }
  });

  await browser.close();
  console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
  process.exit(failed ? 1 : 0);
})();
