"""명소 사진을 위키미디어 공용에서 내려받고, 화면이 읽는 사진 목록을 만든다.

    python scripts/fetch_spot_photos.py

입력은 scripts/spot-photos.json이다. 사람이 고른 목록이고, 한 줄이 명소 하나다.

    { "spotId": 1, "name": "강릉 안반데기", "file": "File:....jpg" }

공용의 작가 칸이 지저분하면 "artist"를 더해 화면에 적을 이름을 정한다.

출력은 public/spots/{spotId}.jpg와 lib/tonight/spot-photos.json이다.

사진은 공용 서버가 가로 1280px로 줄여 주는 것을 그대로 받는다. 자르거나 보정하지 않는다. CC BY-SA 사진을
고쳐서 쓰면 고친 것도 같은 조건으로 공개해야 하기 때문이다. 작가와 라이선스는 공용의 파일 정보에서 읽어 오고,
허용 목록(퍼블릭 도메인, CC0, CC BY, CC BY-SA, 공공누리 제1유형)에 없는 라이선스면 멈춘다.

위키미디어는 자동 요청에 누가 보내는지 밝힌 User-Agent를 요구한다.
https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "byeolbolil/1.0 (https://www.byeolbolil.com)"
WIDTH = 1280
ALLOWED = re.compile(r"^(cc0|public domain|pd|cc by(-sa)? [0-9.]+( [a-z]+)?|kogl type 1)$", re.I)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PICKS = os.path.join(ROOT, "scripts", "spot-photos.json")
PHOTO_DIR = os.path.join(ROOT, "public", "spots")
MANIFEST = os.path.join(ROOT, "lib", "tonight", "spot-photos.json")


def get(url):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def strip_html(text):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", text or "")).strip()


def license_label(name):
    """화면에 적는 라이선스 이름. 공용의 표기를 우리말 화면에 맞게 조금만 다듬는다."""
    lowered = name.lower()
    if lowered in ("public domain", "pd"):
        return "퍼블릭 도메인"
    if lowered == "kogl type 1":
        return "공공누리 제1유형"
    return name


def main():
    picks = json.load(open(PICKS, encoding="utf-8"))
    os.makedirs(PHOTO_DIR, exist_ok=True)
    manifest = {}
    for pick in picks:
        query = urllib.parse.urlencode({
            "action": "query", "format": "json", "formatversion": "2", "titles": pick["file"],
            "prop": "imageinfo", "iiprop": "url|size|extmetadata", "iiurlwidth": str(WIDTH),
            "iiextmetadatafilter": "LicenseShortName|Artist",
        })
        page = json.loads(get(f"{API}?{query}"))["query"]["pages"][0]
        if "imageinfo" not in page:
            sys.exit(f"공용에 없는 파일입니다: {pick['file']}")
        info = page["imageinfo"][0]
        meta = info.get("extmetadata") or {}
        license_name = strip_html((meta.get("LicenseShortName") or {}).get("value", ""))
        if not ALLOWED.match(license_name):
            sys.exit(f"허용하지 않는 라이선스입니다: {pick['file']} ({license_name})")
        # 공용의 작가 칸에 설명 문장이 섞여 있으면 목록의 artist로 바로잡는다
        artist = pick.get("artist") or strip_html((meta.get("Artist") or {}).get("value", "")) or "작가 미상"

        path = os.path.join(PHOTO_DIR, f"{pick['spotId']}.jpg")
        if not os.path.exists(path):
            with open(path, "wb") as handle:
                handle.write(get(info.get("thumburl") or info["url"]))
            time.sleep(0.5)

        manifest[str(pick["spotId"])] = {
            "src": f"/spots/{pick['spotId']}.jpg",
            "alt": f"{pick['name']}의 모습",
            "credit": f"{artist[:40]}, {license_label(license_name)}",
            "url": info["descriptionurl"],
        }
        print(pick["spotId"], pick["name"], "|", manifest[str(pick["spotId"])]["credit"])
        time.sleep(0.3)

    with open(MANIFEST, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(f"{len(manifest)}곳")


main()
