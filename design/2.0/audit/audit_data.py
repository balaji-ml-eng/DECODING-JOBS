"""Read-only audit of the deployed API: pins in water, area-filter counts, link health."""
import asyncio
import json
import random
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

import httpx
from shapely import STRtree, points
from shapely.geometry import shape

API = "https://decoding-jobs-api.onrender.com/api/v1"
OUT = Path(sys.argv[1])
LAND_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36"}


async def tile(client, box, seen, depth=0):
    r = await client.get(f"{API}/companies/search", params=dict(zip(("min_lat", "min_lng", "max_lat", "max_lng"), box)))
    r.raise_for_status()
    for c in r.json():
        seen[c["id"]] = c
    if r.headers.get("x-result-capped") == "true" and depth < 8:
        a, b, c_, d = box
        mx, my = (a + c_) / 2, (b + d) / 2
        for sub in ((a, b, mx, my), (a, my, mx, d), (mx, b, c_, my), (mx, my, c_, d)):
            await tile(client, sub, seen, depth + 1)


def classify(exc_or_status):
    if isinstance(exc_or_status, int):
        s = exc_or_status
        if 200 <= s < 400:
            return "ok"
        if s in (401, 403, 405, 406, 429, 503, 999):
            return f"blocked-bot ({s})"
        return f"broken ({s})"
    name = type(exc_or_status).__name__
    if name in ("ConnectError",):
        return "broken (dns/connection)"
    if "Timeout" in name:
        return "timeout"
    return f"error ({name})"


async def check(client, sem, url):
    async with sem:
        for method in ("HEAD", "GET"):
            try:
                r = await client.request(method, url)
                if method == "HEAD" and r.status_code >= 400:
                    continue
                return classify(r.status_code), str(r.url)
            except Exception as e:  # noqa: BLE001 - every failure is a result here
                res = classify(e)
        return res, url


async def main():
    async with httpx.AsyncClient(timeout=90) as c:
        seen = {}
        await tile(c, (6.0, 68.0, 37.0, 98.0), seen)
    cos = list(seen.values())
    print("live companies fetched:", len(cos), "hiring:", sum(1 for x in cos if x["active_job_count"] > 0))
    (OUT / "companies.json").write_text(json.dumps(cos), encoding="utf-8")

    # 1. Water
    land_path = OUT / "land.geojson"
    if not land_path.exists():
        async with httpx.AsyncClient(timeout=180, follow_redirects=True) as c:
            land_path.write_bytes((await c.get(LAND_URL)).content)
    polys = [shape(f["geometry"]) for f in json.loads(land_path.read_text(encoding="utf-8"))["features"]]
    tree = STRtree(polys)
    pts = points([[x["longitude"], x["latitude"]] for x in cos])
    idx, _ = tree.query(pts, predicate="intersects")
    on_land = set(int(i) for i in idx)
    wet = [(cos[i], pts[i]) for i in range(len(cos)) if i not in on_land]
    print(f"\n[water] outside land polygon: {len(wet)}/{len(cos)}")
    dist = []
    for co, pt in wet:
        d = min(polys[int(j)].distance(pt) for j in tree.query(pt, predicate="dwithin", distance=1.0)) if len(tree.query(pt, predicate="dwithin", distance=1.0)) else 9
        dist.append((d * 111, co))
    print("  by city:", Counter(co["city"] for _, co in dist).most_common())
    bands = Counter("<300m" if d < .3 else "300m-1km" if d < 1 else "1-3km" if d < 3 else ">3km" for d, _ in dist)
    print("  distance from coast:", dict(bands))
    for d, co in sorted(dist, key=lambda t: -t[0])[:12]:
        print(f"   {d:6.1f} km  {co['name'][:34]:34} {co['city']} ({co['latitude']:.4f},{co['longitude']:.4f}) jobs={co['active_job_count']}")
    (OUT / "wet.json").write_text(json.dumps([{"km": d, **co} for d, co in dist]), encoding="utf-8")

    # 2. Areas: the count shown in the filter vs what the map's own request returns
    async with httpx.AsyncClient(timeout=90) as c:
        areas = (await c.get(f"{API}/companies/areas", params={"city": "Chennai"})).json()
        print("\n[areas] Chennai")
        for a in areas:
            rows = [x for x in cos if x["city"] == "Chennai" and x.get("area") == a["area"]]
            print(f"   {a['area'][:30]:30} shown={a['count']:3} on_map_all_india_bbox={len(rows):3}", [(round(r['latitude'], 3), round(r['longitude'], 3)) for r in rows[:3]])
        nulls = sum(1 for x in cos if x.get("area") is None)
        print(f"   companies with no area at all: {nulls}/{len(cos)}")

    # 3. Links. Same seed, so reruns check the same companies.
    random.seed(7)
    fmt = Counter()
    for x in cos:
        u = x.get("website_url")
        fmt["no website" if not u else "bad scheme" if urlparse(u).scheme not in ("http", "https") else "http(s)"] += 1
    print("\n[website format]", dict(fmt))

    sample = random.sample(cos, 300)
    jobs = []
    async with httpx.AsyncClient(timeout=90) as c:
        sem = asyncio.Semaphore(3)

        async def jobs_for(co):
            async with sem:
                r = await c.get(f"{API}/jobs/company/{co['id']}")
                if r.status_code == 200:
                    return r.json()
                fmt[f"jobs endpoint {r.status_code}"] += 1
                return []

        for result in await asyncio.gather(*(jobs_for(x) for x in sample)):
            jobs.extend(result)
    print("jobs fetched from sampled companies:", len(jobs), "|", dict(fmt))
    print("job sources:", Counter(j.get("source") for j in jobs).most_common(8))
    print("description length: ", {b: sum(1 for j in jobs if lo <= len(j.get("description") or "") < hi) for b, lo, hi in (("empty", 0, 1), ("<300", 1, 300), ("300-600", 300, 600), ("600+", 600, 10**7))})
    print("ends with ellipsis (truncated at source):", sum(1 for j in jobs if (j.get("description") or "").rstrip().endswith(("…", "..."))), "of", len(jobs))
    print("no apply url:", sum(1 for j in jobs if not j.get("apply_url")))

    sem = asyncio.Semaphore(20)
    async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers=UA, verify=False) as c:
        sites = [x["website_url"] for x in sample if x.get("website_url")]
        applies = [j["apply_url"] for j in jobs if j.get("apply_url")]
        applies = random.sample(applies, min(250, len(applies)))
        site_res = await asyncio.gather(*(check(c, sem, u) for u in sites))
        apply_res = await asyncio.gather(*(check(c, sem, u) for u in applies))

    print(f"\n[company website links] n={len(sites)}", Counter(r[0] for r in site_res).most_common())
    print(f"[apply links] n={len(applies)}", Counter(r[0] for r in apply_res).most_common())
    print("  apply hosts:", Counter(urlparse(u).hostname for u in applies).most_common(8))
    print("  broken websites:", [u for u, r in zip(sites, site_res) if r[0].startswith("broken")][:12])
    print("  broken applies:", [u[:90] for u, r in zip(applies, apply_res) if r[0].startswith("broken")][:10])
    print("  final hosts of ok applies:", Counter(urlparse(r[1]).hostname for r in apply_res if r[0] == "ok").most_common(6))
    (OUT / "links.json").write_text(json.dumps({"sites": list(zip(sites, site_res)), "applies": list(zip(applies, apply_res))}), encoding="utf-8")


asyncio.run(main())
