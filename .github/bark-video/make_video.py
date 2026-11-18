"""Turns a Daily Bark story page into a slow-scrolling phone video (1080x1920) with music.

Usage: python3 make_video.py stories/2026-11-18.html out.mp4
Writes out.mp4 plus out.json (title + description for YouTube).
Needs: a local web server for the repo on port 8766, Playwright (Chromium), ffmpeg, numpy.
"""
import html, json, os, re, subprocess, sys, tempfile
from playwright.sync_api import sync_playwright
from PIL import Image

story, out = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
tmp = tempfile.mkdtemp()
shot, wav = os.path.join(tmp, "full.png"), os.path.join(tmp, "music.wav")

# 1) Full-page screenshot of the story at phone size (2x = 1080 px wide)
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 540, "height": 960}, device_scale_factor=2)
    pg.goto("http://localhost:8766/" + story, wait_until="networkidle")
    pg.wait_for_timeout(2000)
    pg.screenshot(path=shot, full_page=True)
    b.close()

w, h = Image.open(shot).size
travel = max(0, h - 1920) // 2 * 2
# about 25 px per second: slow enough to read along
scroll = max(20, round(travel / 25)) if travel else 0
hold_start, hold_end = 4, 5
total = hold_start + scroll + hold_end

# 2) Original background music, as long as the video
subprocess.run([sys.executable, os.path.join(here, "music.py"), str(total), wav], check=True)

# 3) Pan down the screenshot slowly (gentle start and stop), add the music
if travel:
    y = (f"if(lt(t,{hold_start}),0,if(gt(t,{hold_start + scroll}),{travel},"
         f"{travel}*((t-{hold_start})/{scroll}-sin(2*PI*(t-{hold_start})/{scroll})/(2*PI))))")
else:
    y = "0"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", "30", "-i", shot, "-i", wav,
    "-filter_complex", f"[0:v]crop=1080:1920:0:'{y}',format=yuv420p[v]", "-map", "[v]", "-map", "1:a",
    "-t", str(total), "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "160k",
    "-movflags", "+faststart", out], check=True)

# 4) Title and description for YouTube, taken from the story page
src = open(story, encoding="utf-8").read()
def grab(pat):
    m = re.search(pat, src, re.S)
    return html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else ""
headline = grab(r"<h2>(.*?)</h2>") or "Today's dog news"
source = grab(r'class="src">(.*?)<')
url = "https://thedailybark.dog/" + story.replace(os.sep, "/")
desc = f"{headline}\n\nRead the full story: {url}\n"
if source:
    desc += f"Original news source: {source}\n"
desc += "\nThe Daily Bark: real, true dog news every day.\n\n#dogs #dognews #Shorts"
title = headline if len(headline) <= 90 else headline[:87].rstrip() + "..."
json.dump({"title": title, "description": desc, "seconds": total}, open(os.path.splitext(out)[0] + ".json", "w"), indent=2)
print(f"Made {out} ({total}s): {title}")
