/**
 * Geocode company names/addresses to lat/lng using Nominatim (OpenStreetMap).
 * Free, no API key required. Rate limit: 1 req/sec.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "DecodingJobs/1.0 (job-search-project)";

/**
 * Geocode a query string to { lat, lng } or null if not found.
 * @param {string} query - e.g. "Razorpay Bangalore" or "Koramangala Bangalore"
 * @param {string} city - fallback city context e.g. "Bengaluru"
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
export async function geocode(query, city = "Bengaluru") {
  // Try the specific query first, then with city context.
  for (const q of [query, `${query} ${city}`]) {
    try {
      const params = new URLSearchParams({
        q,
        format: "json",
        limit: "1",
        countrycodes: "in",
      });

      const response = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: { "User-Agent": USER_AGENT },
      });

      if (!response.ok) continue;

      const results = await response.json();
      if (results.length > 0) {
        return {
          lat: parseFloat(results[0].lat),
          lng: parseFloat(results[0].lon),
        };
      }
    } catch {
      // Continue to next query variant.
    }

    // Respect Nominatim rate limit: 1 req/sec.
    await new Promise((r) => setTimeout(r, 1100));
  }

  return null;
}

/**
 * Geocode a list of companies with fallback to city center coordinates.
 * @param {Array} companies - [{ name, area, city, address? }]
 * @returns {Map<string, { lat, lng }>}
 */
export async function geocodeCompanies(companies) {
  const CITY_CENTERS = {
    Bengaluru: { lat: 12.9716, lng: 77.5946 },
    Bangalore: { lat: 12.9716, lng: 77.5946 },
    Chennai: { lat: 13.0827, lng: 80.2707 },
  };

  const results = new Map();

  for (const company of companies) {
    // Try multiple query variants for better accuracy.
    const queries = [
      `${company.name} office ${company.area || ""} ${company.city || ""}`.trim(),
      `${company.name} ${company.city || "Bengaluru"}`,
      company.address || `${company.name} ${company.area || ""}`,
    ];

    let coords = null;
    for (const q of queries) {
      coords = await geocode(q, company.city || "Bengaluru");
      if (coords) break;
    }

    // Fallback to city center if geocoding fails.
    if (!coords) {
      const cityCenter = CITY_CENTERS[company.city] || CITY_CENTERS.Bengaluru;
      // Add small random offset so companies don't stack on top of each other.
      coords = {
        lat: cityCenter.lat + (Math.random() - 0.5) * 0.02,
        lng: cityCenter.lng + (Math.random() - 0.5) * 0.02,
      };
      console.log(`  ⚠ Could not geocode "${company.name}" — using city center offset`);
    } else {
      console.log(`  ✓ Geocoded "${company.name}" → (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
    }

    results.set(company.name, coords);

    // Rate limit: 1 req/sec for Nominatim.
    await new Promise((r) => setTimeout(r, 1100));
  }

  return results;
}

// Run as standalone script for testing.
if (import.meta.url === `file://${process.argv[1]}`) {
  const testQuery = process.argv[2] || "Razorpay Bangalore";
  console.log(`Geocoding: "${testQuery}"`);
  const result = await geocode(testQuery);
  console.log(result ? `Result: ${JSON.stringify(result)}` : "Not found");
}
