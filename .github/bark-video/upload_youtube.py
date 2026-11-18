"""Uploads a Daily Bark video to YouTube.

Usage: python3 upload_youtube.py video.mp4 video.json
Needs these repository secrets as environment variables:
  YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN
Note: until Google approves the Cloud project, YouTube keeps API uploads private.
"""
import json, os, sys, urllib.parse, urllib.request

video, meta = sys.argv[1], json.load(open(sys.argv[2]))

def post(url, data, headers):
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    return urllib.request.urlopen(req)

# 1) Swap the long-lived refresh token for a short-lived access token
tok = json.load(post("https://oauth2.googleapis.com/token", urllib.parse.urlencode({
    "client_id": os.environ["YT_CLIENT_ID"], "client_secret": os.environ["YT_CLIENT_SECRET"],
    "refresh_token": os.environ["YT_REFRESH_TOKEN"], "grant_type": "refresh_token"}).encode(),
    {"Content-Type": "application/x-www-form-urlencoded"}))["access_token"]

# 2) Start an upload with the title, description and settings
body = {
    "snippet": {"title": meta["title"], "description": meta["description"],
                "tags": ["dogs", "dog news", "The Daily Bark", "Shorts"], "categoryId": "15"},  # 15 = Pets & Animals
    "status": {"privacyStatus": os.environ.get("YT_PRIVACY", "public"),
               "selfDeclaredMadeForKids": True,   # The Daily Bark is written for kids
               "embeddable": True},
}
size = os.path.getsize(video)
r = post("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    json.dumps(body).encode(), {"Authorization": "Bearer " + tok, "Content-Type": "application/json; charset=UTF-8",
    "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": str(size)})
upload_url = r.headers["Location"]

# 3) Send the video file
with open(video, "rb") as f:
    req = urllib.request.Request(upload_url, data=f.read(), method="PUT",
        headers={"Authorization": "Bearer " + tok, "Content-Type": "video/mp4"})
res = json.load(urllib.request.urlopen(req))
print("Uploaded: https://www.youtube.com/shorts/" + res["id"], "| privacy:", res.get("status", {}).get("privacyStatus"))
