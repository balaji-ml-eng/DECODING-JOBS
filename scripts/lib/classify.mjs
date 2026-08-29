/**
 * Shared classification helpers used by every ingestion script.
 * Kept in one place so the LinkedIn scraper and the real-data fetcher
 * agree on sector/work-mode/employment-type labels.
 */

export function classifySector(description, title) {
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

export function classifyWorkMode(description) {
  const lower = (description || "").toLowerCase();
  if (lower.includes("remote")) return "remote";
  if (lower.includes("hybrid")) return "hybrid";
  return null;
}

export function classifyEmploymentType(title) {
  const lower = (title || "").toLowerCase();
  if (lower.includes("intern")) return "internship";
  if (lower.includes("contract")) return "contract";
  if (lower.includes("part-time") || lower.includes("part time")) return "part_time";
  return "full_time";
}

export function classifyArea(place, areaHints) {
  if (!place || !areaHints) return null;
  const lower = place.toLowerCase();
  for (const [area, keywords] of Object.entries(areaHints)) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return area;
    }
  }
  return null;
}
