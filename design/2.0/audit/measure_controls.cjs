// Measures every visible control on every main screen, against the size spec in
// DESIGN-2.0.md. Usage: node measure_controls.cjs <base-url> <out-dir> [--signin-api=URL]
const { createRequire } = require("module");
const fs = require("fs");
const req = createRequire("D:/SW/personal/DECODING/DECODING-JOBS/apps/web/package.json");
const { chromium, devices } = req("playwright");

const BASE = process.argv[2] || "http://localhost:3333";
const OUT = process.argv[3] || ".";
const API = (process.argv.find((a) => a.startsWith("--signin-api=")) || "").split("=")[1];
const EMAIL = "claude-verify-temp@example.com";
const VIEWPORTS = {
  "phone-360": { ...devices["Pixel 5"], viewport: { width: 360, height: 640 } },
  "phone-390": { ...devices["iPhone 13"] },
  "tablet-768": { viewport: { width: 768, height: 1024 }, hasTouch: true },
  "laptop-1024": { viewport: { width: 1024, height: 768 } },
  "desktop-1440": { viewport: { width: 1440, height: 900 } },
};

const collect = () => {
  const name = (e) => (e.getAttribute("aria-label") || e.innerText || e.getAttribute("placeholder") || e.title || "").trim().replace(/\s+/g, " ").slice(0, 34);
  const seen = (e) => {
    const b = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < innerHeight && s.visibility !== "hidden" && s.display !== "none";
  };
  const proseLink = (e) => e.tagName === "A" && e.closest("p,li") && !e.className.includes("flex");
  const controls = [...document.querySelectorAll("a,button,input:not([type=hidden]):not([type=file]),select,textarea,[role=button]")]
    .filter((e) => seen(e) && !e.closest(".maplibregl-marker,.maplibregl-ctrl,nextjs-portal") && !proseLink(e));
  const rows = controls.map((e) => {
    const b = e.getBoundingClientRect();
    return { n: name(e), tag: e.tagName.toLowerCase(), w: Math.round(b.width), h: Math.round(b.height), x: Math.round(b.left), r: Math.round(b.right), y: Math.round(b.top), b: Math.round(b.bottom), off: b.right > innerWidth + 1 || b.left < -1, unnamed: !name(e) };
  });
  // A control whose centre is covered by something else can't be pressed there.
  const covered = controls.filter((e) => {
    const b = e.getBoundingClientRect();
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    if (cx < 0 || cx > innerWidth || cy < 0 || cy > innerHeight) return false;
    const top = document.elementFromPoint(cx, cy);
    return top && !e.contains(top) && !top.contains(e);
  }).map(name);
  return { rows, covered, overflowX: document.documentElement.scrollWidth > innerWidth, screen: innerHeight };
};

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const report = {};
  let cookieSetup = null;
  if (API) {
    const link = await (await fetch(`${API}/auth/request-link`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: EMAIL }) })).json();
    cookieSetup = link.dev_magic_link;
    if (!cookieSetup) throw new Error(`No sign-in link (rate limited?): ${JSON.stringify(link).slice(0, 120)}`);
  }
  let storage;
  if (cookieSetup) {
    const c = await browser.newContext();
    const p = await c.newPage();
    await p.goto(cookieSetup, { waitUntil: "load" });
    await p.waitForTimeout(3000);
    storage = await c.storageState();
    await c.close();
  }

  for (const [vp, opts] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext({ ...opts, storageState: storage });
    const page = await ctx.newPage();
    const press = (l) => (opts.hasTouch ? l.tap({ timeout: 6000 }) : l.click({ timeout: 6000 }));
    const save = async (screen) => {
      await page.waitForTimeout(600);
      const d = await page.evaluate(collect);
      (report[vp] ??= {})[screen] = d;
      await page.screenshot({ path: `${OUT}/${vp}-${screen}.png` });
    };
    const tryStep = async (fn) => { try { await fn(); } catch (e) { console.log(`  ${vp}: ${e.message.split("\n")[0].slice(0, 100)}`); } };

    await page.goto(BASE + "/", { waitUntil: "load", timeout: 90000 });
    await page.waitForTimeout(4500);
    await save("home");
    await tryStep(async () => {
      await press(page.locator("[data-filters-toggle]").first());
      await save("filters");
      await press(page.locator("[data-filters-toggle]").first()).catch(() => page.keyboard.press("Escape"));
    });
    await page.goto(BASE + "/", { waitUntil: "load" });
    await page.waitForTimeout(3000);
    await tryStep(async () => {
      await press(page.getByRole("button", { name: /^Grid$/ }).first());
      await page.waitForTimeout(1800);
      await save("grid");
      await press(page.locator("main button, main [class*=cursor-pointer]").filter({ hasText: /\d+ open/i }).first());
      await page.waitForTimeout(2200);
      await save("company");
    });
    for (const p of ["assistant", "tracker", "profile", "recruiters", "register"]) {
      await tryStep(async () => {
        await page.goto(`${BASE}/${p}`, { waitUntil: "load", timeout: 60000 });
        await page.waitForTimeout(2200);
        await save(p);
      });
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(`${OUT}/controls.json`, JSON.stringify(report, null, 1));

  for (const [vp, screens] of Object.entries(report)) {
    const min = vp.startsWith("phone") || vp.startsWith("tablet") ? 44 : 32;
    console.log(`\n=== ${vp} (minimum ${min}px) ===`);
    for (const [s, d] of Object.entries(screens)) {
      const small = d.rows.filter((r) => r.h < min || (r.w < min && r.tag !== "input"));
      const heights = [...new Set(d.rows.map((r) => r.h))].sort((a, b) => a - b);
      console.log(`${s.padEnd(11)} controls=${String(d.rows.length).padEnd(3)} tooSmall=${String(small.length).padEnd(3)} offscreen=${d.rows.filter((r) => r.off).length} unnamed=${d.rows.filter((r) => r.unnamed).length} covered=${d.covered.length} overflowX=${d.overflowX} heights=${heights.join(",")}`);
      if (process.argv.includes("--list")) for (const r of small) console.log(`    ${String(r.w).padStart(3)}x${String(r.h).padEnd(3)} ${r.n || `(no name ${r.tag})`}`);
      if (process.argv.includes("--list") && d.covered.length) console.log("    covered:", d.covered.slice(0, 8).join(" | "));
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
