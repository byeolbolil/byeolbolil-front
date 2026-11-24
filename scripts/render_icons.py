"""앱 아이콘을 만든다. 화면 머리의 별 모양을 밤하늘 색 바탕에 올린 그림이다.

    python scripts/render_icons.py public/icons

만드는 파일:
    icon-192.png, icon-512.png       홈 화면과 설치 화면용
    icon-maskable-512.png            기기가 모양을 잘라 쓰는 아이콘. 별을 가운데 안전 영역 안에 둔다
    apple-touch-icon.png (180px)     iOS 홈 화면용
"""
import pathlib
import sys

from PIL import Image, ImageDraw

out = pathlib.Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)

NIGHT = (6, 11, 29)  # --night-1
STAR = (251, 210, 118)  # --star
# components/tonight/icons.tsx의 BrandMark와 같은 모양 (-10..10 좌표)
POINTS = [(0, -9), (2.2, -2.2), (9, 0), (2.2, 2.2), (0, 9), (-2.2, 2.2), (-9, 0), (-2.2, -2.2)]
SS = 4  # 크게 그린 뒤 줄여서 가장자리를 부드럽게 한다


def render(size, star_ratio):
    big = size * SS
    image = Image.new("RGB", (big, big), NIGHT)
    scale = big * star_ratio / 18
    center = big / 2
    ImageDraw.Draw(image).polygon([(center + x * scale, center + y * scale) for x, y in POINTS], fill=STAR)
    return image.resize((size, size), Image.LANCZOS)


render(192, 0.62).save(out / "icon-192.png", optimize=True)
render(512, 0.62).save(out / "icon-512.png", optimize=True)
render(512, 0.46).save(out / "icon-maskable-512.png", optimize=True)
render(180, 0.62).save(out / "apple-touch-icon.png", optimize=True)
print(sorted(p.name for p in out.iterdir()))
