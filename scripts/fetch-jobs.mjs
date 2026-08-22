/**
 * LinkedIn Job Scraper for DECODING JOBS
 *
 * Fetches real job postings from LinkedIn for Bangalore and Chennai,
 * extracts company data, geocodes addresses, and seeds into PostGIS.
 *
 * Usage:
 *   node scripts/fetch-jobs.mjs --city bangalore
 *   node scripts/fetch-jobs.mjs --city chennai
 *   node scripts/fetch-jobs.mjs --city all
 *
 * Requires: npm install linkedin-jobs-scraper (in scripts/ or project root)
 */

import { LinkedinScraper, events, typeFilter, timeFilter } from "linkedin-jobs-scraper";
import { geocodeCompanies } from "./geocode.mjs";
import fs from "fs";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_BASE = process.env.API_URL || "http://localhost:8000";
const OUTPUT_DIR = "scripts/seed-data";

// Job title queries to search for — covers the main tech roles.
const SEARCH_QUERIES = [
  "Software Engineer",
  "Backend Engineer",
  "Frontend Engineer",
  "Full Stack Developer",
  "Data Scientist",
  "Machine Learning Engineer",
  "Product Manager",
  "DevOps Engineer",
  "iOS Developer",
  "Android Developer",
];

const CITY_CONFIG = {
  bangalore: {
    name: "Bengaluru",
    location: "Bengaluru, Karnataka, India",
    areaHints: {
      // Known tech hubs in Bangalore for area classification.
      "HSR Layout": ["HSR", "HSR Layout"],
      Koramangala: ["Koramangala"],
      Indiranagar: ["Indiranagar"],
      Whitefield: ["Whitefield"],
      "Electronic City": ["Electronic City"],
      "Sarjapur Road": ["Sarjapur"],
      Bellandur: ["Bellandur"],
      Marathahalli: ["Marathahalli"],
      "BTM Layout": ["BTM"],
      Jayanagar: ["Jayanagar"],
      "MG Road": ["MG Road", "M.G. Road"],
      "Manyata Tech Park": ["Manyata"],
    },
  },
  chennai: {
    name: "Chennai",
    location: "Chennai, Tamil Nadu, India",
    areaHints: {
      "OMR (Old Mahabalipuram Road)": ["OMR", "Old Mahabalipuram"],
      "IT Corridor": ["Sholinganallur", "Perungudi", "Taramani"],
      "Guindy": ["Guindy"],
      "T. Nagar": ["T. Nagar", "Thyagaraya Nagar"],
      "Anna Nagar": ["Anna Nagar"],
      "Adyar": ["Adyar"],
      "Velachery": ["Velachery"],
      "Porur": ["Porur"],
      "Ambattur": ["Ambattur"],
      "Nungambakkam": ["Nungambakkam"],
    },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function classifyArea(place, areaHints) {
  if (!place) return null;
  const lower = place.toLowerCase();
  for (const [area, keywords] of Object.entries(areaHints)) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return area;
    }
  }
  return null;
}

function classifySector(description, title) {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes("machine learning") || text.includes("ml ") || text.includes("ai ") || text.includes("artificial intelligence"))
    return "AI";
  if (text.includes("fintech") || text.includes("payment") || text.includes("banking") || text.includes("finance"))
    return "Fintech";
  if (text.includes("saas") || text.includes("enterprise") || text.includes("b2b"))
    return "SaaS";
  if (text.includes("consumer") || text.includes("d2c") || text.includes("ecommerce") || text.includes("e-commerce"))
    return "Consumer";
  if (text.includes("health") || text.includes("medical") || text.includes("biotech"))
    return "Healthtech";
  if (text.includes("edtech") || text.includes("education") || text.includes("learning"))
    return "Edtech";
  if (text.includes("cloud") || text.includes("devops") || text.includes("infrastructure"))
    return "Cloud/Infra";
  if (text.includes("mobile") || text.includes("ios") || text.includes("android"))
    return "Mobile";
  return "Other";
}

function classifyWorkMode(description) {
  const lower = (description || "").toLowerCase();
  if (lower.includes("remote")) return "remote";
  if (lower.includes("hybrid")) return "hybrid";
  return null; // unknown → don't set
}

function classifyEmploymentType(title) {
  const lower = (title || "").toLowerCase();
  if (lower.includes("intern")) return "internship";
  if (lower.includes("contract")) return "contract";
  if (lower.includes("part-time") || lower.includes("part time")) return "part_time";
  return "full_time";
}

// ---------------------------------------------------------------------------
// Main scraper
// ---------------------------------------------------------------------------

async function scrapeCity(cityKey) {
  const config = CITY_CONFIG[cityKey];
  if (!config) {
    console.error(`Unknown city: ${cityKey}. Use: bangalore, chennai, or all`);
    process.exit(1);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(` Scraping LinkedIn jobs for ${config.name}`);
  console.log(`${"=".repeat(60)}\n`);

  const scraper = new LinkedinScraper({
    headless: "new",
    slowMo: 500,
    args: ["--lang=en-GB", "--disable-blink-features=AutomationControlled"],
  });

  const allJobs = [];

  scraper.on(events.scraper.data, (data) => {
    allJobs.push({
      jobId: data.jobId,
      title: data.title,
      company: data.company,
      companyLink: data.companyLink || null,
      place: data.place || null,
      date: data.date || null,
      link: data.link || null,
      applyLink: data.applyLink || null,
      description: (data.description || "").substring(0, 2000), // truncate for storage
      query: data.query,
    });
  });

  scraper.on(events.scraper.error, (err) => {
    console.error("  ⚠ Scraper error:", err.message);
  });

  scraper.on(events.scraper.end, () => {
    console.log(`\n  Scraping complete. Total jobs found: ${allJobs.length}`);
  });

  // Build query objects in the format the library expects.
  const queries = SEARCH_QUERIES.map((query) => ({
    query,
    options: {
      locations: [config.location],
      limit: 25,
      applyLink: true,
      skipPromotedJobs: true,
    },
  }));

  console.log(`  Running ${queries.length} search queries...`);

  try {
    await scraper.run(queries, {
      locations: [config.location],
      limit: 25,
      time: timeFilter.MONTH,
    });
  } catch (err) {
    console.error(`  ⚠ Scraper run failed: ${err.message}`);
  }

  await scraper.close();

  // Deduplicate by jobId.
  const seen = new Set();
  const uniqueJobs = allJobs.filter((j) => {
    if (seen.has(j.jobId)) return false;
    seen.add(j.jobId);
    return true;
  });

  console.log(`\n  Unique jobs after dedup: ${uniqueJobs.length}`);

  // Group jobs by company.
  const companyMap = new Map();
  for (const job of uniqueJobs) {
    const name = job.company?.trim();
    if (!name) continue;

    if (!companyMap.has(name)) {
      companyMap.set(name, {
        name,
        linkedin_url: job.companyLink,
        area: classifyArea(job.place, config.areaHints),
        city: config.name,
        jobs: [],
      });
    }
    companyMap.get(name).jobs.push(job);
  }

  const companies = Array.from(companyMap.values());
  console.log(`\n  Unique companies: ${companies.length}`);

  // Geocode companies.
  console.log(`\n  Geocoding ${companies.length} companies...`);
  const coords = await geocodeCompanies(
    companies.map((c) => ({ name: c.name, area: c.area, city: c.city }))
  );

  // Build final seed data.
  const seedData = companies.map((company) => ({
    name: company.name,
    description: company.jobs[0]?.description?.substring(0, 500) || null,
    sector: classifySector(
      company.jobs.map((j) => j.description).join(" "),
      company.jobs.map((j) => j.title).join(" ")
    ),
    area: company.area,
    city: company.city,
    address: company.jobs[0]?.place || `${company.area || ""}, ${company.city}`,
    lat: coords.get(company.name)?.lat || 0,
    lng: coords.get(company.name)?.lng || 0,
    linkedin_url: company.linkedin_url,
    jobs_url: null,
    status: "active",
    jobs: company.jobs.map((j) => ({
      title: j.title,
      description: j.description?.substring(0, 1000) || "",
      employment_type: classifyEmploymentType(j.title),
      work_mode: classifyWorkMode(j.description),
      apply_url: j.applyLink || j.link,
      source_url: j.link,
      source: "linkedin",
    })),
  }));

  // Save seed data.
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = `${OUTPUT_DIR}/${cityKey}-companies.json`;
  fs.writeFileSync(outputPath, JSON.stringify(seedData, null, 2));
  console.log(`\n  ✅ Saved ${seedData.length} companies to ${outputPath}`);

  // Print summary.
  console.log(`\n  Summary for ${config.name}:`);
  console.log(`    Companies: ${seedData.length}`);
  console.log(`    Total jobs: ${seedData.reduce((sum, c) => sum + c.jobs.length, 0)}`);

  const sectors = {};
  seedData.forEach((c) => { sectors[c.sector] = (sectors[c.sector] || 0) + 1; });
  console.log(`    Sectors: ${Object.entries(sectors).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join(", ")}`);

  return seedData;
}

// ---------------------------------------------------------------------------
// Seed into database via API
// ---------------------------------------------------------------------------

async function seedToDatabase(companies) {
  console.log(`\n  Seeding ${companies.length} companies into database...`);

  let inserted = 0;
  for (const company of companies) {
    try {
      // Insert company.
      const companyPayload = {
        name: company.name,
        description: company.description,
        address: company.address || `${company.area || ""}, ${company.city}`,
        latitude: company.lat,
        longitude: company.lng,
        sector: company.sector,
        area: company.area,
        city: company.city,
        linkedin_url: company.linkedin_url,
        jobs_url: company.jobs_url,
        status: company.status || "active",
      };

      const res = await fetch(`${API_BASE}/api/v1/companies/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyPayload),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error(`  ⚠ Failed to seed "${company.name}": ${err}`);
        continue;
      }

      const created = await res.json();
      inserted++;

      // Insert jobs for this company.
      for (const job of company.jobs.slice(0, 5)) { // max 5 jobs per company
        await fetch(`${API_BASE}/api/v1/jobs/seed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_id: created.id,
            title: job.title,
            description: job.description,
            employment_type: job.employment_type,
            work_mode: job.work_mode,
            apply_url: job.apply_url,
            source: job.source || "linkedin",
            source_url: job.source_url,
          }),
        });
      }
    } catch (err) {
      console.error(`  ⚠ Error seeding "${company.name}": ${err.message}`);
    }
  }

  console.log(`  ✅ Seeded ${inserted}/${companies.length} companies`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const cityArg = process.argv.find((a) => a.startsWith("--city="))?.split("=")[1]
  || process.argv[process.argv.indexOf("--city") + 1]
  || "all";

console.log(`\n🚀 DECODING JOBS — LinkedIn Job Scraper`);
console.log(`   Target: ${cityArg}`);

let allData = [];

if (cityArg === "all") {
  for (const city of Object.keys(CITY_CONFIG)) {
    const data = await scrapeCity(city);
    allData.push(...data);
  }
} else {
  allData = await scrapeCity(cityArg);
}

// Seed into database.
console.log(`\n${"=".repeat(60)}`);
console.log(` Seeding into database`);
console.log(`${"=".repeat(60)}`);

await seedToDatabase(allData);

console.log(`\n✅ Done!`);
