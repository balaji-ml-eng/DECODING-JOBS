"""Why apply links fail: status against job age and source, from the live API.

Usage: python audit_link_age.py <out-dir> [sample-size]
Writes link_age.json for audit_link_browser.cjs to open in a real browser.
"""
import asyncio
import json
import random
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import httpx

API = "https://decoding-jobs-api.onrender.com/api/v1"
OUT = Path(sys.argv[1])
SAMPLE = int(sys.argv[2]) if len(sys.argv) > 2 else 300
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36"}
NOW = datetime.now(timezone.utc)
BUCKETS = [(0, 30, "under 30 days"), (30, 60, "30-59 days"), (60, 90, "60-89 days"), (90, 120, "90-119 days"), (120, 99999, "120+ days")]


def age_days(iso):
    if not iso:
        return None
    d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return (NOW - d).days


def bucket(days):
    if days is None:
        return "no date"
    return next(name for lo, hi, name in BUCKETS if lo <= days < hi)


async def check(client, sem, job):
    async with sem:
        url = job["apply_url"]
        try:
            r = await client.get(url)
            kind = "ok" if r.status_code < 400 else f"http {r.status_code}"
            hosts = [urlparse(str(h.url)).netloc for h in r.history] + [urlparse(str(r.url)).netloc]
            return {**job, "result": kind, "final": str(r.url), "hops": hosts, "seconds": round(r.elapsed.total_seconds(), 1)}
        except Exception as e:  # noqa: BLE001 - every failure is a result here
            return {**job, "result": f"failed ({type(e).__name__})", "final": url, "hops": [], "seconds": None}


async def main():
    cos = []
    async with httpx.AsyncClient(timeout=120) as c:
        for lat, lng in ((12.97, 77.59), (13.08, 80.27), (19.07, 72.87), (17.38, 78.48), (18.52, 73.85), (28.61, 77.2), (9.93, 76.26)):
            r = await c.get(f"{API}/companies/search", params={"min_lat": lat - 0.5, "min_lng": lng - 0.5, "max_lat": lat + 0.5, "max_lng": lng + 0.5})
            cos.extend(r.json() if r.status_code == 200 else [])
    cos = [x for x in {c["id"]: c for c in cos}.values() if x.get("active_job_count", 0) > 0]
    print("hiring companies:", len(cos))
    random.seed(11)
    random.shuffle(cos)
    jobs = []
    async with httpx.AsyncClient(timeout=120) as c:
        sem = asyncio.Semaphore(3)

        async def one(co):
            async with sem:
                r = await c.get(f"{API}/jobs", params={"company_id": co["id"]})
                return r.json() if r.status_code == 200 else []

        for rs in await asyncio.gather(*(one(x) for x in cos[:260])):
            jobs.extend(rs)
    print("jobs fetched:", len(jobs))
    if jobs:
        print("fields:", sorted(jobs[0].keys()))
    dates = [k for k in ("posted_at", "created_at", "updated_at", "expires_at", "last_seen_at") if jobs and k in jobs[0]]
    print("date fields:", dates)
    for k in dates:
        ages = sorted(a for a in (age_days(j.get(k)) for j in jobs) if a is not None)
        if ages:
            print(f"  {k}: newest {ages[0]}d, median {ages[len(ages) // 2]}d, oldest {ages[-1]}d, missing {len(jobs) - len(ages)}")
    print("sources:", Counter(j.get("source") for j in jobs).most_common(6))
    print("active flags:", Counter(str(j.get("is_active")) for j in jobs))
    print("apply hosts:", Counter(urlparse(j["apply_url"]).netloc for j in jobs if j.get("apply_url")).most_common(8))
    print("no apply url:", sum(not j.get("apply_url") for j in jobs))

    field = dates[0] if dates else None
    pool = [j for j in jobs if j.get("apply_url")]
    pool = random.sample(pool, min(SAMPLE, len(pool)))
    sem = asyncio.Semaphore(6)
    async with httpx.AsyncClient(timeout=25, follow_redirects=True, headers=UA) as c:
        results = await asyncio.gather(*(check(c, sem, j) for j in pool))
    print("\nresults:", Counter(r["result"] for r in results).most_common())

    table = defaultdict(Counter)
    for r in results:
        table[bucket(age_days(r.get(field)))][("ok" if r["result"] == "ok" else "fail")] += 1
    print(f"\nby age of {field}:")
    for name in [b[2] for b in BUCKETS] + ["no date"]:
        t = table.get(name)
        if t:
            total = t["ok"] + t["fail"]
            print(f"  {name:15} {total:4} checked, {t['fail']:4} failed ({100 * t['fail'] // total}%)")

    fails = defaultdict(Counter)
    for r in results:
        fails[urlparse(r["apply_url"]).netloc][r["result"]] += 1
    print("\nby first host:", {k: dict(v) for k, v in fails.items()})
    print("final hosts of working links:", Counter(urlparse(r["final"]).netloc for r in results if r["result"] == "ok").most_common(10))
    print("final hosts of failed links:", Counter(urlparse(r["final"]).netloc for r in results if r["result"] != "ok").most_common(10))
    secs = sorted(r["seconds"] for r in results if r["seconds"] is not None)
    if secs:
        print(f"seconds: median {secs[len(secs) // 2]}, p90 {secs[len(secs) * 9 // 10]}, max {secs[-1]}")
    (OUT / "link_age.json").write_text(json.dumps(results, indent=1), encoding="utf-8")


asyncio.run(main())
