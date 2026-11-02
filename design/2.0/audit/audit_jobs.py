import asyncio
import json
import random
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

import httpx

API = "https://decoding-jobs-api.onrender.com/api/v1"
OUT = Path(sys.argv[1])
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36"}


async def check(client, sem, url):
    async with sem:
        res = "error", url
        for method in ("HEAD", "GET"):
            try:
                r = await client.request(method, url)
                if method == "HEAD" and r.status_code >= 400:
                    continue
                s = r.status_code
                text = r.text[:60000].lower() if method == "GET" and s == 200 else ""
                gone = any(k in text for k in ("no longer available", "job has expired", "position has been filled", "this job is closed", "job not found", "no longer accepting"))
                kind = "ok but posting closed" if gone else "ok" if s < 400 else f"blocked ({s})" if s in (401, 403, 405, 406, 429, 503, 999) else f"broken ({s})"
                return kind, str(r.url)
            except Exception as e:  # noqa: BLE001 - every failure is a result here
                n = type(e).__name__
                res = ("broken (dns/connection)" if n == "ConnectError" else "timeout" if "Timeout" in n else f"error ({n})"), url
        return res


async def main():
    cos = [c for c in json.loads((OUT / "companies.json").read_text(encoding="utf-8")) if c["active_job_count"] > 0]
    random.seed(7)
    sample = random.sample(cos, 200)
    jobs = []
    async with httpx.AsyncClient(timeout=90) as c:
        sem = asyncio.Semaphore(3)

        async def one(co):
            async with sem:
                r = await c.get(f"{API}/jobs", params={"company_id": co["id"]})
                return r.json() if r.status_code == 200 else []

        for rs in await asyncio.gather(*(one(x) for x in sample)):
            jobs.extend(rs)
    print("jobs:", len(jobs), "sources:", Counter(j.get("source") for j in jobs).most_common(8))
    ld = [len((j.get("description") or "").strip()) for j in jobs]
    print("description chars: empty", sum(x == 0 for x in ld), "| <300", sum(0 < x < 300 for x in ld), "| 300-600", sum(300 <= x < 600 for x in ld), "| 600+", sum(x >= 600 for x in ld), "| max", max(ld))
    print("ending in ellipsis (cut off in the data itself):", sum((j.get("description") or "").rstrip().endswith(("…", "...")) for j in jobs))
    print("no apply url:", sum(not j.get("apply_url") for j in jobs))
    print("sample desc:", repr((jobs[0].get("description") or "")[-120:]))

    urls = [j["apply_url"] for j in jobs if j.get("apply_url")]
    print("scheme:", Counter(urlparse(u).scheme for u in urls))
    urls = random.sample(urls, min(250, len(urls)))
    sem = asyncio.Semaphore(12)
    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=UA, verify=False) as c:
        res = await asyncio.gather(*(check(c, sem, u) for u in urls))
    print(f"\n[apply links] n={len(urls)}", Counter(r[0] for r in res).most_common())
    print("start hosts:", Counter(urlparse(u).hostname for u in urls).most_common(6))
    print("final hosts:", Counter(urlparse(r[1]).hostname for r in res).most_common(8))
    print("failures:", [(u[:70], r[0]) for u, r in zip(urls, res) if r[0] not in ("ok",)][:12])


asyncio.run(main())
