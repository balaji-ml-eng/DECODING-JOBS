# Design 2.0

**Goal:** make DECODING JOBS trustworthy and professional, on mobile first, based on what the 20 testers reported.

- **Branch:** `design-2.0`, started from `final` at `c348577` (the deployed code)
- **Baseline audit:** 2 Nov 2026, against the deployed site and live API
- **Evidence:** `design/2.0/baseline/` (screenshots), `design/2.0/audit/` (re-runnable scripts)
- **Related:** `DESIGN-AUDIT.md` (design-system numbers), `AUDIT-REPORT.md`

## Tester feedback: is it valid?

One tester's list checked so far. 7 of 10 are confirmed, and 3 need more detail or are partly confirmed.

| # | Report | Verdict | What we found | Where |
|---|---|---|---|---|
| 1 | Map zoom issue | **Likely on phones** | Zoom buttons worked in 6 of 6 steps on desktop, but they were hidden on phones, so pinching was the only way to zoom. Now fixed; confirm with the tester. | `MapWorkspace.tsx` zoom controls |
| 2 | Job description not shown fully | **Confirmed** | 412 of 442 sampled jobs (93%) are cut off with "…" in the stored data, so "Show more" can't reveal the rest. Nearly all jobs come from Adzuna. | `scripts/fetch-real-jobs.mjs`, `CompanySidePanel.tsx:679` |
| 3 | Refresh loses the data | **Confirmed** | The selected company isn't in the URL. The panel closes on refresh, and a company can't be shared by link. | `lib/store`, `ResponsiveShell.tsx:16` |
| 4 | After applying, refresh shows Apply again | **Confirmed** | Tested locally: after `SUBMIT` and a refresh, the panel offers `SUBMIT` again even though the Tracker shows the job under Applied. "Applied" only comes from in-memory state. | `CompanySidePanel.tsx:341` |
| 5 | Filters and layout are bad | **Confirmed** | Mobile filters scroll 4.7 screens with 55 rows and no "Show results" button. "Other" holds 614 of 696 Bengaluru companies. Type and Stage repeat Public and Growth. | `MapWorkspace.tsx` filter panel |
| 6 | DJ logo looks clickable | **Valid, small** | It links to `/`, which is normal for a logo, but it does nothing useful on the home page. | `TopNav.tsx:318` |
| 7 | Info on upper circles is hard to see | **Partly confirmed** | Desktop hover labels displayed fine in testing. Pins can slide under the toolbar, and the map popup always opens upward, so top pins are at risk. Tapping on a phone is untested. | `MapWorkspace.tsx:1504` |
| 8 | Green circles in the sea | **Confirmed** | 345 of 3,444 pins (10%) are outside the land outline: Mumbai 191, Kochi 81, Chennai 70. 307 are more than 300 m out, up to 4.7 km. Kochi's backwaters may account for some. | `scripts/geocode.mjs` (`declusterSharedPoints`) |
| 9 | Pallavaram or Porur shows no companies | **Confirmed** | The filter counts the whole city, but the results only cover the visible map. Zoomed in: "Pallavaram 2", then "0 companies in view". | `companies.py` `list_areas` vs `search_companies` |
| 10 | Map not showing, only grid | **Likely** | With WebGL off, the map is a blank white area with no message, while Grid works. Need the tester's device and browser to confirm. | `MapWorkspace.tsx` (no fallback) |

## Broken links

| Link | Checked | Working | Dead | Unknown |
|---|---|---|---|---|
| Apply links | 250 | 153 (61%) | **79 (32%)**: 64 gone (410), 15 not found (404) | 18 blocked our checker (403) |
| Company websites | 154 | 122 (79%) | 9 (6%) | 23: 16 blocked, 5 timeouts, 2 connection errors |

"Working" only means the page loaded. A loaded page can still show a closed job.

### Why apply links fail (checked 3 Nov 2026)

A new sample of 300 links from the live API, with 31 opened in real Chrome on a phone profile: 179 loaded, **113 returned 410 Gone**, and 8 failed in other ways. `design/2.0/audit/audit_link_age.py` and `audit_link_browser.cjs` reproduce it.

- **The job has closed at the source.** 289 of the 300 links go through Adzuna, and pages arrive quickly showing "Cannot find page" or "this job is no longer available". Slow loading isn't the cause.
- **Listings aren't being refreshed.** The newest job in the sample was added on 2 Oct, and it arrived in three batches (5 Sep, 7 Sep, 2 Oct). `scripts/fetch-real-jobs.mjs` is run by hand and nothing schedules it. The stale-job sweep only runs at the end of that script, so closed jobs stay active.
- **The app can't tell.** Every job shows Apply until something marks it inactive, and nothing checks the link.
- **The real posting date is thrown away.** The import doesn't store Adzuna's `created` date. Our `created_at` is the import date, and it doesn't predict failure: the 2 Oct batch failed more (50%) than the 7 Sep batch (34%).
- **Some direct links hide their errors.** Meesho and MakeMyTrip links return 200 but show "not found", so status checks alone miss them.
- **Working Adzuna links are still awkward on phones.** An email-alert popup and a cookie banner cover the job first.

Also: 1,858 of 3,444 companies (54%) have no website at all.

## Other problems found

- Demo companies are live: ByteForge Solutions, Innovex Technologies, Whitefield Cloud Labs.
- Bad data is shown to users, such as Kyndryl's description being a list of office codes, and "Bellandur" as a Chennai area.
- 3,248 of 3,444 companies (94%) have no area, so the Area filter covers only a small part of the data.
- Pins spread in a spiral around a city centre aren't real office locations. This is why they can land in the sea.
- Mobile home: 16 of 17 controls are under the 44px touch size, and 6 have no label for screen readers.
- Mobile Grid: the floating toolbar covers the company cards.
- There are two actions for applying: `APPLY` opens the job site without recording anything, and `SUBMIT` records it. Users won't know which one counts.
- Design system: 44 colours, 20 icon sizes and 12 font sizes (see `DESIGN-AUDIT.md`).

## Current UX state

From a walkthrough of every main screen in real Chrome (version 156) at 360px, 390px, 768px and 1440px, signed out and signed in. The contact sheets are in `design/2.0/baseline/`.

These are Chrome simulations of phone and tablet screens, so real devices still need checking. Ignore the round "N" badge in signed-in screenshots: it's the local dev server's badge and isn't on the live site.

### Across the app
- **No clear first screen:** the city picker says Bengaluru, but the map opens on all of India with "500 of 500+ companies" beside a count of 696.
- **Slow backend looks broken:** the API runs on Render's free plan, which sleeps after 15 minutes idle and takes about 50 seconds to wake. With a 40-second delay simulated, the app showed an empty map and no loading message for at least 15 seconds. In one run the city list and filters were empty and Grid said "No companies match these filters".
- **Too many green blocks:** the selected "All types" and "All stages" rows are the loudest things on screen, though they mean nothing is filtered.
- **Duplicate companies:** "Freshworks", "Freshworks Chennai" and "Freshworks (Velachery)" appear as separate cards.

### Phone
- **Top of the screen is crowded:** header plus 3 rows of floating controls take the top 31% of an iPhone 13 screen, before any results.
- **Grid is blocked:** the toolbar sits over the first card, and a tap at that spot hits the "All" button instead.
- **Navigation is icons only:** there are no text labels, and 6 controls have no name for screen readers. Icons are also small: 16 of 17 home controls are under 44px.
- **The company sheet is too long:** with many roles it ran 6 screens (3,094px). `SUBMIT` was at 2,774px and Job Description at 2,848px, so the main action is at the very end.
- **Tracker needs sideways scrolling:** the board is 1,076px wide in a 328px area. Touch dragging hasn't been tested.

### Tablet and small laptop
- **Sign-in is unreachable from the header:** at 768px, "For Companies" and "Sign in" are off-screen. At 900px, "Sign in" still is. It's fine from 1024px.
- **Header labels wrap:** "AI Assistant" and "App Tracker" break onto two lines at 768px and 900px.

### Desktop
- **The panel covers content:** it sits over the fourth column of Grid and the results count in the toolbar.
- **Odd panel structure:** "1 Open Roles, 2 Apply, 3 Job Description" reads like a wizard, but the sections aren't steps.

### What already works
- Search and suggestions, the map's clusters and pins, the assistant's empty state, the legend, and the "Couldn't load companies, Retry" message when the API fails outright.
- The 404, privacy and sign-in pages are clean and need only light changes.
- No page scrolled sideways at any tested size.

## Control size spec

Every button, link and field follows this. `design/2.0/audit/measure_controls.cjs` measures it on 9 screens at 5 widths.

| Control | Phone and tablet (under 1024px) | Laptop and desktop (1024px up) |
|---|---|---|
| Header links | 44px | 36px |
| Toolbar: search, city, All, group height | 44px | 40px |
| Buttons inside a toolbar group: Map, Grid, Filters, Saved | 44px | 32px |
| Icon buttons (zoom, locate) | 44 x 44px | 40 x 40px |
| Small icon buttons (close, save) | 44 x 44px | 32 x 32px |
| Filter and menu rows | At least 44px | At least 36px |
| Main action (Mark as applied, Show companies) | 44px | 44px |
| Form fields | 44px | 40px |

Icons are 16px in controls. Corners are 12px on outer controls and 8px on buttons inside a group.

**Exceptions**
- The recruiter visibility switch looks 36 x 20px, with an invisible 52 x 44px touch area.
- Google's sign-in button is drawn by Google at 40px.
- Map pins aren't included in this measurement.

### Before and after

| Measure | Before | After |
|---|---|---|
| Phone home controls under 44px | 16 of 17 | 0 of 13 |
| Different control heights on phone home | 6 (28 to 44px) | 1 (44px) |
| Controls with no name for screen readers, phone home | 6 | 0 |
| Header links off-screen at 768px | 2 | 0 |
| Top of the screen used by controls, iPhone 13 | 31% | 17%, plus an 8% bottom bar |
| Grid cards blocked by the toolbar | Yes | No |
| Roles listed before "Show all" in the company panel | All of them (30 in one company) | 4 |

## Plan

### Phase 1: Trust (data and links)
- [ ] Check whether the production job refresh is running, and how old the listings are
- [ ] Check whether the API keep-alive from `DEPLOY.md` step 6 is set up
- [ ] Merge duplicate companies
- [ ] Hide or mark dead apply links, and add a recurring link check (causes under "Why apply links fail"; 40% failed in the latest sample)
- [ ] Schedule the job refresh and store each job's real posting date
- [x] Be honest about short descriptions: show a "Read the full description" link
- [ ] Prefer full-text job sources
- [ ] Move sea pins onto land and label approximate locations
- [ ] Remove demo companies from production
- [ ] Clean bad company descriptions and areas

### Phase 2: Behaviour bugs
- [x] Keep the company, city, filters and view in the URL (#3), and make Back close a company
- [x] Load "Applied" from saved applications (#4)
- [x] Make `APPLY` and `SUBMIT` clear: "Apply" opens the job site, "Mark as applied" records it
- [x] Choosing a filter moves the map to its results, and counts match (#9)
- [x] Show a clear message and switch to Grid when the map can't load (#10)
- [x] Keep cluster lists on screen and clear of the toolbar (#7)
- [x] Logo does nothing on the home page (#6)
- [x] Show a real loading state, including "waking up" text for a slow API, and never say "no companies" before data arrives
- [x] Make the first map view match the selected city and its count
- [ ] Load the rest of a city past the 500-company limit (Bengaluru shows 500 of 892)

### Phase 3: Design system and mobile
- [ ] Adopt the design tokens: one green, fewer colours, sizes and shadows
- [ ] Build shared button, chip, sheet and card components
- [x] New mobile layout: search on top, thumb-reach bottom bar, no toolbar over content, 44px touch targets
- [x] Add visible text labels to phone navigation (in the tab bar)
- [x] Fix the header from 768px to 1023px so Sign in is always reachable
- [x] Rebuild the mobile filter sheet with a sticky "Show N companies" button
- [x] Keep the apply action near the top of the company panel by collapsing long role lists
- [x] Make the Tracker work on phones without a 3-screen-wide board: stage tabs, and a Stage picker on each card instead of dragging
- [x] One-handed map on phones: +/- within thumb reach, tapping a big cluster zooms in, swipe down closes the company sheet (`design/2.0/audit/verify_onehand.cjs`)
- [x] Bottom tab bar on phones: Map, AI Assistant, Tracker and Preferences, within thumb reach (`design/2.0/audit/verify_tabs.cjs`)
- [ ] Remove the duplicate Type and Stage filter groups
- [ ] Redesign the company panel and job description
- [x] Redesign the Assistant: input fixed at the bottom and kept above the phone keyboard, quieter messages, 44px controls (`design/2.0/audit/verify_assistant.cjs`)
- [ ] Apply the design to Tracker, Preferences and Companies pages

### Phase 4: Test with real people
- [ ] Re-run the audit scripts and compare with this baseline
- [ ] Test on real Android and iPhone devices
- [ ] Deploy a preview and send it to the same testers

## Targets

| Measure | Baseline | Target |
|---|---|---|
| Dead apply links | 32% | Under 2% |
| Pins in the sea | 345 | 0 clearly offshore |
| Mobile home controls under 44px | 16 of 17 | 0, except map pins |
| Refresh keeps the selected company | No | Yes |
| Applied state survives refresh | No | Yes |
| Area filter count matches results | No | Yes |
| Blank map with no message | Yes | Never |
| Screen height used by phone controls | 31% | Under 20% |
| Sign in reachable at 768px | No | Yes |
| Loading message while the API wakes | None | Always |

## Still needed

- The other testers' feedback (only one list reviewed so far)
- From tester #1: whether the phone zoom fix solves their zoom issue, and which device and browser showed no map
