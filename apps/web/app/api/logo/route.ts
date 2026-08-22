import { NextRequest, NextResponse } from "next/server";

// 1x1 transparent PNG (avoids broken img icons on 404)
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

// Server-side LRU cache: domain → {body, contentType, status}
const MAX_CACHE = 500;
const logoCache = new Map<string, { body: Buffer; ct: string; ts: number }>();

function getCacheKey(domain: string): string {
  return domain;
}

/**
 * GET /api/logo?domain=razorpay.com
 * Proxies company logos from Google's favicon service with aggressive caching.
 */
export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain");
  if (!domain) {
    return transparentResponse(86400);
  }

  const clean = domain.replace(/[^a-zA-Z0-9.\-]/g, "").toLowerCase();
  if (!clean || !clean.includes(".")) {
    return transparentResponse(86400);
  }

  const key = getCacheKey(clean);
  const cached = logoCache.get(key);

  // Return cached if less than 6 hours old
  if (cached && Date.now() - cached.ts < 6 * 3600 * 1000) {
    return new NextResponse(cached.body, {
      status: 200,
      headers: {
        "Content-Type": cached.ct,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    const url = `https://www.google.com/s2/favicons?domain=${clean}&sz=128`;
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!res.ok) {
      // Cache the transparent PNG so we don't re-fetch failed domains
      cachePut(key, TRANSPARENT_PNG, "image/png");
      return transparentResponse(3600);
    }

    const contentType = res.headers.get("content-type") || "image/png";
    const body = Buffer.from(await res.arrayBuffer());

    // Cache the successful response
    cachePut(key, body, contentType);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        "X-Cache": "MISS",
      },
    });
  } catch {
    cachePut(key, TRANSPARENT_PNG, "image/png");
    return transparentResponse(3600);
  }
}

function cachePut(key: string, body: Buffer, ct: string) {
  // Evict oldest if at capacity
  if (logoCache.size >= MAX_CACHE) {
    const oldest = logoCache.keys().next().value;
    if (oldest) logoCache.delete(oldest);
  }
  logoCache.set(key, { body, ct, ts: Date.now() });
}

function transparentResponse(maxAge: number) {
  return new NextResponse(TRANSPARENT_PNG, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 7}`,
    },
  });
}
