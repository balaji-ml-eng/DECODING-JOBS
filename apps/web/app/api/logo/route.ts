import { NextRequest, NextResponse } from "next/server";

// 1x1 transparent PNG (avoids broken img icons on error)
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Small in-memory L1 cache purely to shave latency on hot repeat requests
// within this process — NOT the source of truth. The durable, shared cache
// lives in Postgres behind core-api's /api/v1/logos (see services/core-api/
// app/api/logos.py), so a restart/redeploy or a second frontend instance
// never has to re-fetch from Google — it just re-hits that endpoint.
const MAX_L1_CACHE = 200;
const l1Cache = new Map<string, { body: Buffer; ct: string; ts: number }>();
const L1_TTL_MS = 10 * 60 * 1000; // 10 minutes — short, since core-api owns durability

/**
 * GET /api/logo?domain=razorpay.com
 * Proxies company logos through core-api's durable Postgres-backed cache.
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

  const cached = l1Cache.get(clean);
  if (cached && Date.now() - cached.ts < L1_TTL_MS) {
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
    const res = await fetch(`${API_BASE_URL}/api/v1/logos?domain=${encodeURIComponent(clean)}`, {
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return transparentResponse(3600);
    }

    const contentType = res.headers.get("content-type") || "image/png";
    const body = Buffer.from(await res.arrayBuffer());

    cachePut(clean, body, contentType);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        "X-Cache": "MISS",
      },
    });
  } catch {
    return transparentResponse(3600);
  }
}

function cachePut(key: string, body: Buffer, ct: string) {
  if (l1Cache.size >= MAX_L1_CACHE) {
    const oldest = l1Cache.keys().next().value;
    if (oldest) l1Cache.delete(oldest);
  }
  l1Cache.set(key, { body, ct, ts: Date.now() });
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
