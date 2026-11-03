// Opens every panel, sheet and menu on many screen sizes and flags controls that are covered,
// overlapping, clipped or off-screen. Usage: node audit_overlaps.cjs <out-dir> [viewport-name]
const fs = require("fs");
const { createRequire } = require("module");
const req = createRequire("D:/SW/personal/DECODING/DECODING-JOBS/apps/web/package.json");
const { chromium } = req("playwright");
const OUT = process.argv[2] || ".";
const ONLY = process.argv[3];
const BASE = "http://localhost:3333";
const API = "http://localhost:8000/api/v1";
const EMAIL = "claude-verify-temp@example.com";

const phone = (width, height) => ({ viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const desk = (width, height) => ({ viewport: { width, height }, deviceScaleFactor: 1 });
const VIEWPORTS = {
  "phone-360x640": phone(360, 640),
  "phone-390x664": phone(390, 664),
  "phone-430x800": phone(430, 800),
  "phone-landscape-740x360": phone(740, 360),
  "tablet-768x1024": phone(768, 1024),
  "tablet-landscape-1024x768": phone(1024, 768),
  "laptop-1280x720": desk(1280, 720),
  "laptop-1366x768": desk(1366, 768),
  "desktop-1440x900": desk(1440, 900),
  "desktop-1920x1080": desk(1920, 1080),
};

const REPLY = {
  reply: "## Three good matches\n\nThese teams are hiring now.\n\n| Company | Roles |\n|---|---|\n| Swiggy | 2 |\n\n" + "Each of them has posted recently, so it's worth applying soon. ".repeat(10),
  jobs: [{ id: 1, title: "Senior Frontend Engineer, Design Systems and Platform", company_id: 1, company_name: "Swiggy", city: "Bengaluru", website_url: "https://swiggy.com" }],
  companies: [{ id: 3, name: "Zerodha", sector: "Fintech", city: "Bengaluru", website_url: "https://zerodha.com", active_job_count: 4 }],
  conversation_id: null,
};

// Runs in the page.
function inspect() {
  const SEL = "a[href],button,input:not([type=hidden]):not([type=file]),select,textarea,[role=button],[role=tab],[role=menuitem]";
  const name = (e) => (e.getAttribute("aria-label") || e.getAttribute("placeholder") || e.innerText || e.tagName).replace(/\s+/g, " ").trim().slice(0, 40);
  const desc = (e) => e ? (e.getAttribute("aria-label") || (e.innerText || "").replace(/\s+/g, " ").trim().slice(0, 30) || `${e.tagName}.${String(e.className.baseVal ?? e.className).split(" ").slice(0, 3).join(".")}`) : "nothing";
  const vw = innerWidth, vh = innerHeight;
  const styleOf = (e) => getComputedStyle(e);
  const fixedParent = (e) => { for (let p = e; p && p !== document.body; p = p.parentElement) if (styleOf(p).position === "fixed") return p; return null; };
  // A full-screen backdrop means a modal is up, and what's behind it is meant to be covered.
  const modal = [...document.querySelectorAll("div")].some((d) => {
    const s = styleOf(d), r = d.getBoundingClientRect();
    return s.position === "fixed" && r.width >= vw - 1 && r.height >= vh - 1 && s.pointerEvents !== "none" && s.visibility !== "hidden";
  });
  const issues = [];
  const add = (type, el, detail = "") => issues.push({ type, control: typeof el === "string" ? el : name(el), detail });

  if (document.documentElement.scrollWidth > vw + 1) add("page scrolls sideways", "page", `${document.documentElement.scrollWidth}px wide`);

  const items = [];
  for (const el of document.querySelectorAll(SEL)) {
    if (el.closest(".maplibregl-marker")) continue;
    const s = styleOf(el);
    let r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || s.visibility === "hidden" || s.display === "none" || +s.opacity === 0) continue;
    const fp = fixedParent(el);
    if (modal && (!fp || (fp.hasAttribute("data-phone-dock")))) continue;
    // What's left after every clipping ancestor, and whether scrolling can reveal the rest.
    let box = { l: r.left, t: r.top, r: r.right, b: r.bottom };
    let scrollable = false, hiddenClip = false;
    let insideScroller = false;
    for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
      if (p !== el && p.parentElement && styleOf(p).position === "fixed" && !/(auto|scroll|hidden|clip)/.test(styleOf(p).overflowX + styleOf(p).overflowY)) break;
      const ps = styleOf(p);
      if (p === el) { if (ps.position === "fixed") break; continue; }
      if (/(auto|scroll)/.test(ps.overflowY)) insideScroller = true;
      if (/(auto|scroll|hidden|clip)/.test(ps.overflowX + ps.overflowY)) {
        const pr = p.getBoundingClientRect();
        const before = (box.r - box.l) * (box.b - box.t);
        box = { l: Math.max(box.l, pr.left), t: Math.max(box.t, pr.top), r: Math.min(box.r, pr.right), b: Math.min(box.b, pr.bottom) };
        const after = Math.max(0, box.r - box.l) * Math.max(0, box.b - box.t);
        if (after < before - 1) {
          if (/(auto|scroll)/.test(ps.overflowX + ps.overflowY) && (p.scrollHeight > p.clientHeight + 1 || p.scrollWidth > p.clientWidth + 1)) scrollable = true;
          else hiddenClip = true;
        }
      }
      if (ps.position === "fixed") break;
    }
    box = { l: Math.max(box.l, 0), t: Math.max(box.t, 0), r: Math.min(box.r, vw), b: Math.min(box.b, vh) };
    const w = box.r - box.l, h = box.b - box.t;
    if (w <= 1 || h <= 1 || w * h < r.width * r.height * 0.6) {
      if (scrollable) continue;
      if (hiddenClip) add("clipped, can't be reached", el, `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      else if (w <= 1 || h <= 1 || r.right > vw + 1 || r.bottom > vh + 1 || r.left < -1 || r.top < -1) {
        // Nothing scrolls it back, or a scrolling page would.
        if (document.documentElement.scrollHeight <= vh + 1) add("off screen", el, `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      continue;
    }
    const cx = (box.l + box.r) / 2, cy = (box.t + box.b) / 2;
    const hit = document.elementFromPoint(cx, cy);
    const related = (a) => a && (a === el || el.contains(a) || a.contains(el));
    if (!related(hit)) add("covered", el, `by ${desc(hit)}`);
    else {
      for (const [x, y] of [[box.l + 8, box.t + 8], [box.r - 8, box.t + 8], [box.l + 8, box.b - 8], [box.r - 8, box.b - 8]]) {
        const c = document.elementFromPoint(x, y);
        if (c && !related(c) && c.closest(SEL) && !c.closest(SEL).contains(el) && !el.contains(c.closest(SEL))) { add("partly covered", el, `by ${desc(c.closest(SEL))}`); break; }
      }
    }
    items.push({ el, box, insideScroller, floating: !!fp });
  }

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      // Content scrolling behind a fixed bar, or a field's own clear button, isn't a clash.
      if (a.floating !== b.floating && (a.insideScroller || b.insideScroller)) continue;
      if (a.el.getAttribute("aria-label") === "Clear search" || b.el.getAttribute("aria-label") === "Clear search") continue;
      const w = Math.min(a.box.r, b.box.r) - Math.max(a.box.l, b.box.l);
      const h = Math.min(a.box.b, b.box.b) - Math.max(a.box.t, b.box.t);
      if (w > 4 && h > 4) add("controls overlap", a.el, `with ${name(b.el)} (${Math.round(w)}x${Math.round(h)}px)`);
    }
  }

  // Readable text that's cut off with no ellipsis, or that runs past the screen.
  for (const el of document.querySelectorAll("p,h1,h2,h3,h4,span,a,button,li,td,th,label")) {
    if (el.closest(".maplibregl-marker,.maplibregl-map") && !el.closest(".maplibregl-popup")) continue;
    if (el.children.length || !el.innerText?.trim()) continue;
    const s = styleOf(el), r = el.getBoundingClientRect();
    if (r.width < 2 || s.visibility === "hidden") continue;
    if (modal && !fixedParent(el)) continue;
    if (el.scrollWidth > el.clientWidth + 1 && s.overflowX !== "visible" && s.textOverflow !== "ellipsis" && s.display !== "inline" && !/(auto|scroll)/.test(s.overflowX)) add("text cut off", el.innerText.trim().slice(0, 40));
    const inScroller = (() => { for (let p = el.parentElement; p; p = p.parentElement) { if (/(auto|scroll)/.test(styleOf(p).overflowX)) return true; } return false; })();
    if (!inScroller && r.right > vw + 1 && r.left < vw) add("text runs off screen", el.innerText.trim().slice(0, 40), `right edge ${Math.round(r.right)}`);
  }

  // Big panels that sit on top of floating controls.
  return issues;
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const all = [];

  const cos = await (await fetch(`${API}/companies/search?min_lat=12.8&min_lng=77.4&max_lat=13.2&max_lng=77.8`)).json();
  const hiring = cos.filter((c) => c.active_job_count > 0);
  const companyId = (hiring.find((c) => /swiggy/i.test(c.name)) || hiring[0]).id;

  const link = await (await fetch(`${API}/auth/request-link`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: EMAIL }) })).json();
  if (!link.dev_magic_link) throw new Error("no magic link, rate limited?");
  const seed = await browser.newContext();
  const seedPage = await seed.newPage();
  await seedPage.goto(link.dev_magic_link, { waitUntil: "load" });
  await seedPage.waitForTimeout(3000);
  const signedIn = await seed.storageState();
  await seed.close();

  const card = (id, name, status) => ({ id, status, applied_at: new Date(Date.now() - 5 * 864e5).toISOString(), auto_tracked: true, interview_round: 2, resume_filename: "My_Very_Long_Resume_File_Name_Final_v3.pdf", job: { id, title: "Senior Frontend Engineer, Design Systems", company: { id, name, website_url: null, area: "Koramangala", city: "Bengaluru" } } });
  const BOARD = [card(1, "Swiggy", "saved"), card(2, "Razorpay Software Private Limited", "interview"), card(3, "Zerodha", "applied"), card(4, "Meesho", "offer")];

  const STATES = [
    ["map", "/", async () => {}],
    ["legend", "/", async (p, act) => act(p.locator('button[aria-label*="map legend"]:visible').first())],
    ["city list", "/", async (p, act) => act(p.locator("[data-city-dropdown] button").first())],
    ["filters", "/", async (p, act) => act(p.locator("[data-filters-toggle]"))],
    ["search results", "/", async (p) => { await p.getByPlaceholder("Search job roles").fill("engineer"); await p.waitForTimeout(1800); }],
    ["saved searches", "/", async (p, act) => act(p.locator('button[aria-label="Saved searches"]'))],
    ["for companies menu", "/", async (p, act) => act(p.locator('header button[aria-label*="For Companies"], header button:has-text("For Companies")').first())],
    ["feedback", "/", async (p, act) => act(p.locator('header button[aria-label*="eedback"]').first())],
    ["account menu", "/", async (p, act) => act(p.locator('header button[aria-label*="Account"]').first()), true],
    ["cluster list", "/", async (p) => {
      const t = await p.locator(".maplibregl-marker").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, t: e.innerText.trim() }; }).filter((m) => /^\d+$/.test(m.t) && +m.t <= 10 && m.y > 130 && m.y < innerHeight - 170 && m.x > 20 && m.x < innerWidth - 80)[0]);
      if (!t) return "no small cluster on screen";
      await p.mouse.click(t.x, t.y);
    }],
    ["company on map", `/?company=${companyId}`, async () => {}],
    ["company in grid", `/?view=grid&company=${companyId}`, async () => {}],
    ["grid", "/?view=grid", async () => {}],
    ["assistant", "/assistant", async () => {}],
    ["assistant reply", "/assistant", async (p) => { await p.locator("form textarea").fill("Frontend roles"); await p.keyboard.press("Enter"); await p.waitForTimeout(1500); }],
    ["assistant history", "/assistant", async (p, act) => { const b = p.locator('button[aria-label="Conversation history"]:visible'); if (await b.count()) await act(b); else return "not on this size"; }, true],
    ["tracker", "/tracker", async () => {}, true],
    ["preferences", "/profile", async () => {}, true],
    ["sign in", "/tracker", async () => {}],
    ["recruiters", "/recruiters", async () => {}, true],
    ["register", "/register", async () => {}, true],
    ["privacy", "/privacy", async () => {}],
  ];

  for (const [vpName, opts] of Object.entries(VIEWPORTS)) {
    if (ONLY && !vpName.includes(ONLY)) continue;
    const plain = await browser.newContext(opts);
    const member = await browser.newContext({ ...opts, storageState: signedIn });
    for (const ctx of [plain, member]) {
      await ctx.route("**/api/v1/chat", (r) => r.fulfill({ json: REPLY, headers: { "access-control-allow-origin": "*" } }));
      await ctx.route("**/api/v1/applications/board", (r) => r.fulfill({ json: BOARD, headers: { "access-control-allow-origin": "*" } }));
    }
    const act = (l) => (opts.hasTouch ? l.tap({ timeout: 6000 }) : l.click({ timeout: 6000 }));
    for (const [state, url, setup, needsMember] of STATES) {
      const page = await (needsMember ? member : plain).newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message.slice(0, 100)));
      let note;
      try {
        await page.goto(BASE + url, { waitUntil: "load", timeout: 45000 });
        await page.waitForTimeout(url.startsWith("/?") || url === "/" ? 3200 : 1500);
        note = await setup(page, act);
        await page.waitForTimeout(600);
        const issues = await page.evaluate(inspect);
        errors.forEach((e) => issues.push({ type: "page error", control: e, detail: "" }));
        // An open menu is meant to cover what's behind it.
        const LAYERED = ["city list", "saved searches", "for companies menu", "account menu", "search results", "legend", "cluster list"];
        const STACKING = ["covered", "partly covered", "controls overlap"];
        if (LAYERED.includes(state)) issues.splice(0, issues.length, ...issues.filter((i) => !STACKING.includes(i.type) || i.detail.includes("Close")));
        const seen = new Set();
        const unique = issues.filter((i) => { const k = `${i.type}|${i.control}|${i.detail}`; if (seen.has(k)) return false; seen.add(k); return true; });
        unique.forEach((i) => all.push({ viewport: vpName, state, ...i }));
        console.log(`${vpName.padEnd(27)} ${state.padEnd(20)} ${unique.length ? `${unique.length} ISSUES` : note ? `skipped: ${note}` : "ok"}`);
        await page.screenshot({ path: `${OUT}/${vpName}--${state.replace(/\W+/g, "-")}.png` });
      } catch (e) {
        all.push({ viewport: vpName, state, type: "couldn't open this state", control: e.message.split("\n")[0].slice(0, 90), detail: "" });
        console.log(`${vpName.padEnd(27)} ${state.padEnd(20)} COULD NOT OPEN`);
      }
      await page.close();
    }
    await plain.close();
    await member.close();
  }
  await browser.close();

  fs.writeFileSync(`${OUT}/overlaps.json`, JSON.stringify(all, null, 1));
  const grouped = {};
  for (const i of all) {
    const k = `${i.type} | ${i.control} | ${i.detail}`;
    (grouped[k] ||= new Set()).add(`${i.viewport.split("-").slice(0, -1).join("-") || i.viewport}:${i.state}`);
  }
  console.log(`\n=== ${all.length} findings, ${Object.keys(grouped).length} distinct ===`);
  Object.entries(grouped).sort((a, b) => b[1].size - a[1].size).forEach(([k, v]) => console.log(`[${v.size}] ${k}\n     ${[...v].slice(0, 6).join(", ")}${v.size > 6 ? " …" : ""}`));
})().catch((e) => { console.log("FATAL", e.message); process.exit(1); });
