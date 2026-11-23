"""Refreshes blockfix/videos.json with each creator's newest YouTube videos.

Runs in GitHub Actions (see .github/workflows/blockfix-videos.yml).
Uses only YouTube's public channel pages and RSS feeds, so no API key is needed.
If a creator can't be reached, their previous videos are kept.
"""
import json, re, sys, time, urllib.request, xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE / "videos.json"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Cookie": "CONSENT=YES+1; SOCS=CAI",
}
NS = {"a": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015",
      "media": "http://search.yahoo.com/mrss/"}
PER_CREATOR = 15


def get(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read().decode("utf-8", "replace")


def channel_page(c):
    url = f"https://www.youtube.com/channel/{c['id']}" if c.get("id") else f"https://www.youtube.com/@{c['handle']}"
    html = get(url)
    cid = c.get("id")
    if not cid:
        m = (re.search(r'<meta itemprop="identifier" content="(UC[\w-]{22})"', html)
             or re.search(r'"externalId":"(UC[\w-]{22})"', html)
             or re.search(r'<link rel="canonical" href="https://www\.youtube\.com/channel/(UC[\w-]{22})"', html))
        cid = m.group(1) if m else None
    m = re.search(r'<meta property="og:image" content="([^"]+)"', html)
    avatar = m.group(1).replace("&amp;", "&") if m else ""
    return cid, avatar


def feed(cid):
    root = ET.fromstring(get(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}"))
    vids = []
    for e in root.findall("a:entry", NS):
        vid = e.findtext("yt:videoId", namespaces=NS)
        title = e.findtext("a:title", namespaces=NS) or ""
        pub = e.findtext("a:published", namespaces=NS) or ""
        stats = e.find("media:group/media:community/media:statistics", NS)
        views = int(stats.get("views", 0)) if stats is not None else 0
        link = e.find("a:link", NS)
        href = link.get("href", "") if link is not None else ""
        vids.append({"id": vid, "title": title, "published": pub, "views": views,
                     "short": "/shorts/" in href})
    return vids[:PER_CREATOR]


def main():
    creators = json.loads((HERE / "creators.json").read_text())
    old = {}
    if OUT.exists():
        try:
            old = {c["name"]: c for c in json.loads(OUT.read_text()).get("creators", [])}
        except Exception:
            pass
    out, ok = [], 0
    for c in creators:
        prev = old.get(c["name"], {})
        entry = {k: c[k] for k in ("name", "game", "genre", "desc", "handle") if k in c}
        entry["id"] = c.get("id") or prev.get("id")
        entry["avatar"] = prev.get("avatar", "")
        entry["videos"] = prev.get("videos", [])
        try:
            cid, avatar = channel_page({**c, "id": entry["id"]})
            entry["id"] = cid or entry["id"]
            entry["avatar"] = avatar or entry["avatar"]
        except Exception as ex:
            print(f"  ! {c['name']}: channel page failed ({ex})", file=sys.stderr)
        if entry["id"]:
            try:
                entry["videos"] = feed(entry["id"])
                ok += 1
                print(f"  {c['name']}: {len(entry['videos'])} videos")
            except Exception as ex:
                print(f"  ! {c['name']}: feed failed ({ex})", file=sys.stderr)
        else:
            print(f"  ! {c['name']}: no channel id found", file=sys.stderr)
        out.append(entry)
        time.sleep(0.4)
    if ok == 0 and OUT.exists():
        print("Nothing could be fetched; keeping the old file.")
        return
    OUT.write_text(json.dumps({"updated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "creators": out},
                              ensure_ascii=False, separators=(",", ":")))
    print(f"Updated {ok}/{len(creators)} creators.")


if __name__ == "__main__":
    main()
