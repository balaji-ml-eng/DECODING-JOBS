// Pass/fail checks that the phone UI works with one thumb: real touch input, never two fingers.
// Usage: node verify_onehand.cjs <out-dir>
const { createRequire } = require("module");
const req = createRequire("D:/SW/personal/DECODING/DECODING-JOBS/apps/web/package.json");
const { chromium, devices } = req("playwright");
const OUT = process.argv[2] || ".";
const BASE = "http://localhost:3333";
const API = "http://localhost:8000";
const EMAIL = "claude-verify-temp@example.com";
const IPHONE = devices["iPhone 13"];
let failed = 0;
const check = (name, ok, detail = "") => { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`); };
const safely = async (name, fn) => { try { await fn(); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message.split("\n")[0].slice(0, 140)}`); } };

const open = async (browser, opts, url = "/") => {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(BASE + url, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(4500);
  return { ctx, page };
};
const swipe = async (page, x, y1, y2, x2 = x) => {
  const cdp = await page.context().newCDPSession(page);
  const t = (type, px, py) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: px, y: py }] });
  await t("touchStart", x, y1);
  for (let i = 1; i <= 12; i++) { await t("touchMove", x + ((x2 - x) * i) / 12, y1 + ((y2 - y1) * i) / 12); await page.waitForTimeout(16); }
  await t("touchEnd");
};
// Pins in screen order. Marker spread tells us the zoom changed, since the map isn't exposed.
const pins = (page) => page.locator(".maplibregl-marker").evaluateAll((els) => els.map((e) => {
  const r = e.getBoundingClientRect();
  return { label: e.getAttribute("aria-label") || "", x: r.left + r.width / 2, y: r.top + r.height / 2, text: e.innerText.trim() };
}));
const spread = async (page) => {
  const list = (await pins(page)).filter((p) => /companies clustered|open role|Not hiring/.test(p.label));
  return { n: list.length, labels: list.map((p) => p.label).sort().join("|").length };
};
const anchor = async (page) => {
  const list = await pins(page);
  const p = list.find((m) => m.x > 60 && m.x < 330 && m.y > 180 && m.y < 600);
  return p ? { x: p.x, y: p.y, label: p.label } : null;
};
const zoomLevel = (page) => page.evaluate(() => {
  const root = document.querySelector(".maplibregl-map");
  const key = Object.keys(root).find((k) => k.startsWith("__reactFiber"));
  let f = root[key];
  while (f) {
    const ref = f.ref?.current ?? f.memoizedState?.memoizedState?.current;
    if (f.memoizedProps?.mapStyle && f.ref?.current?.getZoom) return f.ref.current.getZoom();
    f = f.return;
  }
  return null;
}).catch(() => null);
const clusters = async (page) => (await pins(page))
  .filter((p) => /companies clustered/.test(p.label) && p.y > 150 && p.y < 620 && p.x > 30 && p.x < 300)
  .map((p) => ({ ...p, count: Number(p.label.match(/^(\d+)/)[1]) }));

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });

  await safely("zoom buttons", async () => {
    const { ctx, page } = await open(browser, IPHONE);
    const vh = page.viewportSize().height;
    for (const name of ["Zoom in", "Zoom out"]) {
      const b = await page.getByRole("button", { name, exact: true }).boundingBox();
      check(`${name} is on the phone, 44px, in the thumb zone`, !!b && b.width >= 44 && b.height >= 44 && b.y > vh / 2 && b.x > page.viewportSize().width / 2, b && `${b.width}x${b.height} at y=${Math.round(b.y)} of ${vh}`);
    }
    const before = await zoomLevel(page);
    await page.getByRole("button", { name: "Zoom in", exact: true }).tap();
    await page.waitForTimeout(600);
    const inZ = await zoomLevel(page);
    check("One tap on + zooms in", inZ > before, `${before} -> ${inZ}`);
    await page.getByRole("button", { name: "Zoom out", exact: true }).tap();
    await page.waitForTimeout(600);
    check("One tap on − zooms out", (await zoomLevel(page)) < inZ);
    await page.screenshot({ path: `${OUT}/map-phone.png` });
    await ctx.close();
  });

  await safely("gestures", async () => {
    const { ctx, page } = await open(browser, IPHONE);
    const a = await anchor(page);
    await swipe(page, 195, 420, 300, 120);
    await page.waitForTimeout(700);
    const moved = (await pins(page)).find((p) => p.label === a.label);
    check("One finger drags the map", !moved || Math.hypot(moved.x - a.x, moved.y - a.y) > 50);
    const z0 = await zoomLevel(page);
    // Somewhere with no pin under the finger, or the taps would open that pin.
    const taken = await pins(page);
    const spots = [];
    for (let y = 170; y < 520; y += 20) for (let x = 30; x < 340; x += 20) spots.push({ x, y });
    const empty = spots.find((s) => taken.every((p) => Math.hypot(p.x - s.x, p.y - s.y) > 60));
    await page.touchscreen.tap(empty.x, empty.y);
    await page.waitForTimeout(90);
    await page.touchscreen.tap(empty.x, empty.y);
    await page.waitForTimeout(800);
    check("Double-tap zooms in", (await zoomLevel(page)) > z0, `${z0} -> ${await zoomLevel(page)}`);
    await ctx.close();
  });

  await safely("tap to a company", async () => {
    const { ctx, page } = await open(browser, IPHONE);
    let taps = 0;
    let popped = false;
    let sawZoom = false;
    for (; taps < 8; taps++) {
      const list = await clusters(page);
      if (!list.length) break;
      const big = list.sort((a, b) => b.count - a.count)[0];
      const z = await zoomLevel(page);
      await page.touchscreen.tap(big.x, big.y);
      await page.waitForTimeout(1000);
      popped = (await page.locator(".maplibregl-popup-content").count()) > 0;
      if (big.count > 10 && !popped && (await zoomLevel(page)) > z) sawZoom = true;
      if (big.count > 10 && popped) console.log(`INFO  ${big.count} in one spot, so it lists instead of zooming`);
      if (popped) break;
    }
    check("Tapping a big cluster zooms into it, no pinch", sawZoom);
    await page.screenshot({ path: `${OUT}/map-after-taps.png` });
    if (popped) {
      const close = await page.getByRole("button", { name: "Close list" }).boundingBox();
      check("Cluster list close button is 44px", close.width >= 44 && close.height >= 44);
      const row = page.locator(".maplibregl-popup-content button").nth(1);
      await row.tap();
    } else {
      const p = (await pins(page)).find((m) => /open role|Not hiring/.test(m.label) && m.y > 150 && m.y < 620);
      await page.touchscreen.tap(p.x, p.y);
    }
    await page.waitForTimeout(2000);
    check("Reached a company using taps only", page.url().includes("company="), `${taps + 1} cluster taps`);
    await ctx.close();
  });

  await safely("sheet", async () => {
    const { ctx, page } = await open(browser, IPHONE, "/?view=grid");
    await page.locator("main button, main [class*=cursor-pointer]").filter({ hasText: /\d+ open/i }).first().tap();
    await page.waitForTimeout(2500);
    const sheet = page.locator(".fixed.inset-0.z-40 > div").nth(1);
    const b = await sheet.boundingBox();
    const midY = b.y + 200;
    await swipe(page, 195, midY, midY + 40);
    await page.waitForTimeout(400);
    check("A short drag doesn't close the sheet", page.url().includes("company="));
    await swipe(page, 195, midY + 150, midY - 60);
    await page.waitForTimeout(500);
    const scrolled = await page.locator(".fixed.inset-0.z-40 .overflow-y-auto").evaluateAll((els) => Math.max(...els.map((e) => e.scrollTop)));
    check("Scrolling up still scrolls the sheet", scrolled > 0, `scrollTop ${scrolled}`);
    await swipe(page, 195, midY - 100, midY + 80);
    await page.waitForTimeout(400);
    check("Dragging down while scrolled just scrolls back", page.url().includes("company="));
    await page.locator(".fixed.inset-0.z-40 .overflow-y-auto").evaluateAll((els) => els.forEach((e) => { e.scrollTop = 0; }));
    await page.waitForTimeout(100);
    await swipe(page, 195, midY, midY + 180);
    await page.waitForTimeout(500);
    check("Swiping down closes the sheet", !page.url().includes("company=") && (await page.locator(".fixed.inset-0.z-40").count()) === 0);
    await ctx.close();
  });

  await safely("tracker", async () => {
    const link = await (await fetch(`${API}/api/v1/auth/request-link`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: EMAIL }) })).json();
    if (!link.dev_magic_link) throw new Error("no magic link, rate limited?");
    const card = (id, name, status) => ({ id, status, applied_at: new Date().toISOString(), auto_tracked: false, interview_round: 1, resume_filename: null, job: { id, title: "Frontend Engineer", company: { id, name, website_url: null, area: "Koramangala", city: "Bengaluru" } } });
    let board = [card(1, "Swiggy", "applied"), card(2, "Razorpay", "applied"), card(3, "Zerodha", "interview")];
    const moves = [];
    for (const [label, opts] of [["Phone", IPHONE], ["Desktop", { viewport: { width: 1440, height: 900 } }]]) {
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();
      await page.route("**/api/v1/applications/**", async (r) => {
        if (r.request().method() === "GET") return r.fulfill({ json: board });
        const id = Number(r.request().url().match(/applications\/(\d+)/)?.[1]);
        const status = r.request().postDataJSON()?.status;
        moves.push({ id, status });
        board = board.map((c) => (c.id === id ? { ...c, status } : c));
        return r.fulfill({ json: { ok: true } });
      });
      const l = label === "Phone" ? link : await (await fetch(`${API}/api/v1/auth/request-link`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: EMAIL }) })).json();
      await page.goto(l.dev_magic_link, { waitUntil: "load" });
      await page.waitForTimeout(2500);
      await page.goto(BASE + "/tracker", { waitUntil: "load" });
      await page.waitForTimeout(3500);
      if (label === "Phone") {
        const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || [...document.querySelectorAll("main *, div")].some((e) => e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === "auto"));
        check("Phone Tracker needs no sideways scrolling", !wide);
        check("Opens on the first stage with cards", (await page.getByRole("tab", { selected: true }).innerText()).includes("Applied"));
        await page.screenshot({ path: `${OUT}/tracker-phone.png` });
        const sel = page.getByRole("combobox", { name: /Move Swiggy/ });
        const box = await sel.boundingBox();
        check("Stage picker is 44px", box.height >= 44, `${Math.round(box.height)}px`);
        await sel.selectOption("interview");
        await page.waitForTimeout(1500);
        check("Moving a card saves the new stage", moves.at(-1)?.status === "interview", JSON.stringify(moves.at(-1)));
        check("Card leaves the current stage", (await page.getByRole("combobox", { name: /Move Swiggy/ }).count()) === 0);
        check("Tab counts update", /^2/.test((await page.getByRole("tab", { name: /Interviewing/ }).innerText()).trim()));
        await page.getByRole("tab", { name: /Interviewing/ }).tap();
        await page.waitForTimeout(400);
        check("Tapping a stage shows its cards", await page.getByRole("combobox", { name: /Move Swiggy/ }).isVisible());
        await page.screenshot({ path: `${OUT}/tracker-phone-moved.png` });
      } else {
        check("Desktop keeps all four columns", await page.getByRole("heading", { name: "Saved" }).isVisible() && await page.getByRole("heading", { name: "Offered" }).isVisible());
        check("Desktop has no stage tabs", !(await page.getByRole("tablist").isVisible()));
        check("Desktop has no stage picker (drag instead)", !(await page.getByRole("combobox", { name: /Move Razorpay/ }).isVisible()));
        const c = await page.getByText("Razorpay").first().boundingBox();
        const off = await page.getByRole("heading", { name: "Offered" }).boundingBox();
        await page.mouse.move(c.x + 10, c.y + 10);
        await page.mouse.down();
        await page.mouse.move(c.x + 40, c.y + 40, { steps: 5 });
        await page.mouse.move(off.x + 20, off.y + 120, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(1200);
        check("Desktop drag still moves a card", moves.at(-1)?.status === "offer", JSON.stringify(moves.at(-1)));
        await page.screenshot({ path: `${OUT}/tracker-desktop.png` });
      }
      await ctx.close();
    }
  });

  await safely("desktop map", async () => {
    const { ctx, page } = await open(browser, { viewport: { width: 1440, height: 900 } });
    const zoom = await page.getByRole("button", { name: "Zoom in", exact: true }).boundingBox();
    check("Desktop zoom buttons stay top right", zoom.y < 120 && zoom.x > 1300, `${zoom.x},${zoom.y}`);
    const big = (await pins(page)).filter((p) => /companies clustered/.test(p.label) && p.y > 150 && p.y < 800).map((p) => ({ ...p, count: Number(p.label.match(/^(\d+)/)[1]) })).sort((a, b) => b.count - a.count)[0];
    await page.mouse.click(big.x, big.y);
    await page.waitForTimeout(800);
    check("Desktop cluster click still opens the list", (await page.locator(".maplibregl-popup-content").count()) > 0, `${big.count} companies`);
    await ctx.close();
  });

  await browser.close();
  console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
  process.exit(failed ? 1 : 0);
})();
