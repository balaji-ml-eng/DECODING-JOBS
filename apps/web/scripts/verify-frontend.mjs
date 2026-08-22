/**
 * Browser-level verification for the DECODING JOBS web app.
 *
 * Confirms, against a Next.js dev server already running at
 * http://localhost:3000 (see scripts/verify-stack.sh for the orchestrated
 * full-stack run):
 *   1. The app boots with zero compilation errors (no Next.js dev error
 *      overlay) and zero console/hydration errors.
 *   2. The map-driven Zustand `selectedCompanyId` selection actually
 *      propagates: clicking a live company marker updates CompanySidePanel
 *      to show that company's real name, proving the store → query →
 *      re-render chain works end to end (not just that the store variable
 *      changed in isolation).
 *
 * Usage: node scripts/verify-frontend.mjs
 * Requires: `npx playwright install chromium` (one-time, cached afterward).
 */

import { chromium } from "playwright";

const WEB_URL = process.env.WEB_URL ?? "http://localhost:3000";
const TIMEOUT_MS = 15_000;

let exitCode = 0;

function pass(message) {
  console.log(`✅ ${message}`);
}

function fail(message) {
  console.error(`❌ ${message}`);
  exitCode = 1;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

try {
  await page.goto(WEB_URL, { waitUntil: "load", timeout: TIMEOUT_MS });
} catch (err) {
  fail(`Could not reach ${WEB_URL}: ${err.message}`);
  await browser.close();
  process.exit(1);
}

// 1. No Next.js dev-mode compilation error overlay. Note: <nextjs-portal>
// itself is Next's *persistent* dev-mode indicator (the "N" badge, always
// present in dev regardless of errors) — checking for its mere existence is
// a false positive. What actually indicates a blocking compile/runtime
// error is specific error-dialog text, which Playwright can find even
// inside the portal's shadow DOM.
const errorOverlayCount = await page
  .getByText(/Failed to compile|Build Error|Unhandled Runtime Error/i)
  .count();
if (errorOverlayCount === 0) {
  pass("No Next.js compilation error overlay detected");
} else {
  fail("Next.js dev error overlay is present — a compile error is blocking the app");
}

// 2. App shell actually rendered (proves no silent white-screen failure).
try {
  await page.waitForSelector("text=My Vault", { timeout: TIMEOUT_MS });
  pass('App shell rendered ("My Vault" nav visible)');
} catch {
  fail('App shell did not render — "My Vault" nav never appeared');
}

// 3. Empty state renders before any company is selected (selectedCompanyId
//    starts null in the Zustand store).
try {
  await page.waitForSelector("text=Select a company on the map", { timeout: TIMEOUT_MS });
  pass("Empty state rendered — confirms selectedCompanyId starts null");
} catch {
  fail("Empty state did not render for the initial (unselected) state");
}

// 4. Live map markers loaded from the backend.
let markerHandle;
try {
  markerHandle = await page.waitForSelector('button[aria-label^="View "]', {
    timeout: TIMEOUT_MS,
  });
  const markerLabel = await markerHandle.getAttribute("aria-label");
  pass(`Live company marker rendered from backend data (${markerLabel})`);
} catch {
  fail("No company markers rendered — map/backend data did not load");
}

// 5. Clicking a marker propagates selectedCompanyId through the Zustand
//    store into a TanStack Query fetch and back out into the DOM — the
//    clearest possible proof that the state selection logic actually works,
//    not just that a variable changed somewhere unobserved.
if (markerHandle) {
  const companyName = (await markerHandle.getAttribute("aria-label")).replace("View ", "");
  await markerHandle.click();
  try {
    await page.waitForSelector(`h1:has-text("${companyName}")`, { timeout: TIMEOUT_MS });
    pass(
      `Zustand selectedCompanyId propagated correctly: clicking the "${companyName}" marker ` +
        `updated CompanySidePanel's header to "${companyName}"`
    );
  } catch {
    fail(
      `Clicked the "${companyName}" marker but CompanySidePanel never updated to show it — ` +
        "selectedCompanyId did not propagate"
    );
  }
}

// 6. No console/hydration errors accumulated across the whole run.
if (consoleErrors.length === 0) {
  pass("Zero console errors (no hydration mismatches or runtime exceptions)");
} else {
  fail(`${consoleErrors.length} console error(s) detected:\n  ${consoleErrors.join("\n  ")}`);
}

await browser.close();

console.log("");
if (exitCode === 0) {
  console.log("✅ Frontend verification passed.");
} else {
  console.log("❌ Frontend verification FAILED — see above.");
}

process.exit(exitCode);
