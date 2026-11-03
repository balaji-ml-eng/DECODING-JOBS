// Pass/fail checks for the Assistant panel, with chat replies stubbed so they're repeatable.
// Usage: node verify_assistant.cjs <out-dir>
const { createRequire } = require("module");
const req = createRequire("D:/SW/personal/DECODING/DECODING-JOBS/apps/web/package.json");
const { chromium, devices } = req("playwright");
const OUT = process.argv[2] || ".";
const BASE = "http://localhost:3333";
let failed = 0;
const check = (name, ok, detail = "") => { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`); };

const SCREENS = [
  ["iphone", { ...devices["iPhone 13"] }],
  ["small-android", { viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true }],
  ["tablet", { viewport: { width: 768, height: 1024 }, hasTouch: true }],
  ["desktop", { viewport: { width: 1440, height: 900 } }],
];
const REPLY = {
  reply: "## Three good matches\n\nThese Bengaluru teams are hiring **frontend engineers** now.\n\n1. Check the role's stack\n2. Tailor your resume\n3. Apply this week\n\n" + "Each of them has posted in the last month, so it's worth applying soon. ".repeat(12),
  jobs: [
    { id: 1, title: "Senior Frontend Engineer, Design Systems and Platform", company_id: 1, company_name: "Swiggy", city: "Bengaluru", website_url: "https://swiggy.com" },
    { id: 2, title: "Frontend Engineer", company_id: 2, company_name: "Razorpay", city: "Bengaluru", website_url: "https://razorpay.com" },
  ],
  companies: [{ id: 3, name: "Zerodha", sector: "Fintech", city: "Bengaluru", website_url: "https://zerodha.com", active_job_count: 4 }],
  conversation_id: null,
};
const metrics = (page) => page.evaluate(() => {
  const r = (s) => document.querySelector(s)?.getBoundingClientRect();
  const form = r("form:has(textarea)");
  const ta = document.querySelector("form textarea");
  return {
    vh: innerHeight, formTop: form?.top, formBottom: form?.bottom,
    sideScroll: document.documentElement.scrollWidth > innerWidth,
    font: parseFloat(getComputedStyle(ta).fontSize),
    bar: ta.scrollHeight > ta.clientHeight,
  };
});
const small = (page) => page.evaluate(() => [...document.querySelectorAll("main button, form button, form textarea, button")].filter((b) => {
  const r = b.getBoundingClientRect();
  return r.width > 0 && innerWidth < 1024 && (r.height < 44 || r.width < 44) && !b.closest("header");
}).map((b) => `${b.getAttribute("aria-label") || b.innerText.slice(0, 24)} ${Math.round(b.getBoundingClientRect().width)}x${Math.round(b.getBoundingClientRect().height)}`));

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  for (const [label, opts] of SCREENS) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/api/v1/chat", async (r) => { await new Promise((s) => setTimeout(s, 900)); await r.fulfill({ json: REPLY, headers: { "access-control-allow-origin": "*" } }); });
    await page.goto(BASE + "/assistant", { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(2500);

    let m = await metrics(page);
    await page.screenshot({ path: `${OUT}/${label}-1-empty.png` });
    check(`${label}: empty chat has the input at the bottom`, m.vh - m.formBottom < 50, `${Math.round(m.vh - m.formBottom)}px from bottom`);
    check(`${label}: no sideways scroll, no scrollbar in the input`, !m.sideScroll && !m.bar);
    if (opts.isMobile) check(`${label}: input is 16px so iOS won't zoom`, m.font === 16, `${m.font}px`);
    const under = await small(page);
    check(`${label}: touch sizes`, under.length === 0, under.join(", "));

    const before = m.formTop;
    await page.locator("form textarea").fill("Line one\nLine two\nLine three");
    await page.waitForTimeout(150);
    m = await metrics(page);
    check(`${label}: input grows upward, bottom stays put`, m.formTop < before && m.vh - m.formBottom < 50);
    await page.screenshot({ path: `${OUT}/${label}-2-typing.png` });

    await page.locator("form textarea").fill("Remote frontend roles in Bengaluru");
    await page.locator("form textarea").focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(350);
    check(`${label}: input keeps focus after sending`, await page.evaluate(() => document.activeElement?.tagName === "TEXTAREA"));
    check(`${label}: shows a replying indicator`, (await page.getByRole("status", { name: "Assistant is replying" }).count()) === 1);
    await page.waitForTimeout(1800);
    m = await metrics(page);
    check(`${label}: input stays at the bottom after a reply`, m.vh - m.formBottom < 50 && !m.sideScroll);
    await page.screenshot({ path: `${OUT}/${label}-3-reply.png` });

    await page.locator(".overflow-y-auto").first().evaluate((el) => { el.scrollTop = 0; });
    await page.waitForTimeout(400);
    const jump = page.getByRole("button", { name: "Scroll to latest message" });
    if ((await page.locator(".overflow-y-auto").first().evaluate((el) => el.scrollHeight - el.clientHeight)) > 120) {
      check(`${label}: scrolling up offers a way back`, (await jump.count()) === 1);
      await jump.click();
      await page.waitForTimeout(900);
      check(`${label}: jump returns to the latest message`, (await jump.count()) === 0);
    }
    await page.getByRole("button", { name: "Start a new chat" }).click();
    await page.waitForTimeout(400);
    check(`${label}: New chat clears the conversation`, (await page.getByText("What are you looking for?").count()) === 1);

    if (opts.isMobile) {
      const { width } = page.viewportSize();
      await page.setViewportSize({ width, height: 340 });
      await page.waitForTimeout(500);
      m = await metrics(page);
      check(`${label}: keyboard-sized screen keeps the input visible`, m.formBottom <= m.vh && m.formTop > 0, `input ${Math.round(m.formTop)}-${Math.round(m.formBottom)} of ${m.vh}`);
      await page.screenshot({ path: `${OUT}/${label}-4-keyboard.png` });
    }
    check(`${label}: no page errors`, errors.length === 0, errors[0]);
    await ctx.close();
  }
  await browser.close();
  console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
  process.exit(failed ? 1 : 0);
})();
