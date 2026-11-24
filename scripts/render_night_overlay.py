"""지도의 밤 불빛 레이어에 얹을 이미지를 만든다.

    python scripts/render_night_overlay.py <light_pollution_korea.csv> public/map/night-lights.webp

입력은 백엔드 저장소의 src/main/resources/light_pollution_korea.csv (lat, lon, radiance, bortle)다.
VIIRS Nighttime Lights 2024 (Earth Observation Group, Payne Institute) 값을 한국 범위로 잘라 둔 파일이다.

MapLibre의 image 소스는 네 귀퉁이 좌표 사이를 웹 메르카토르 평면에서 선형으로 늘린다. 그래서 이미지의 세로축은
위도가 아니라 메르카토르 y에 비례해야 한다. 목업의 korea-night.jpg는 경도에 cos(36°)를 곱한 등장방형이라
그대로 얹으면 범위 가운데에서 남북으로 5km쯤 어긋난다. 이 스크립트는 같은 색 처리를 메르카토르로 다시 그린다.

범위(LON0, LON1, LAT0, LAT1)를 바꾸면 lib/tonight/night-overlay.ts의 좌표도 함께 바꿔야 한다.

radiance는 로그 스케일로 밝기를 정하고 가우시안 블러 세 단계로 번짐을 만든다. 보기 좋게 그린 그림이고
등급 판정에는 쓰지 않는다. 불빛이 없는 곳은 투명하게 두어서 아래의 지도가 비친다.
"""
import csv
import math
import sys

import numpy as np
from PIL import Image, ImageFilter

src, out = sys.argv[1], sys.argv[2]
LON0, LON1, LAT0, LAT1 = 124.5, 131.0, 33.0, 38.75
W = 2080  # 경도 1px이 0.003125°. 원본 격자(약 0.004°)보다 조금 촘촘하다
S = 2  # 절반 해상도로 모은 뒤 확대한다. 메르카토르에서는 위도 간격이 벌어져 줄무늬가 생기기 때문이다


def merc(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


Y0, Y1 = merc(LAT0), merc(LAT1)
H = int(round((Y1 - Y0) / math.radians(LON1 - LON0) * W))
w, h = W // S, H // S

rad = np.zeros((h, w), np.float32)
with open(src, encoding="utf-8") as f:
    reader = csv.reader(f)
    next(reader)
    for lat, lon, radiance, _ in reader:
        x = int((float(lon) - LON0) / (LON1 - LON0) * w)
        y = int((Y1 - merc(float(lat))) / (Y1 - Y0) * h)
        if 0 <= x < w and 0 <= y < h:
            rad[y, x] = max(rad[y, x], float(radiance))


def blur(a, radius):
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius))
    return np.asarray(im).astype(np.float32) / 255


rad = np.asarray(Image.fromarray(rad).resize((W, H), Image.BILINEAR))
level = np.clip((np.log1p(rad) - math.log1p(0.6)) / (math.log1p(150) - math.log1p(0.6)), 0, 1)
k = W / 1100  # 블러 반경은 목업 이미지(가로 1100px)에서 정한 값을 같은 지리적 크기로 옮긴다
glow = np.clip(blur(level, 0.7 * k) * 0.95 + blur(level, 5 * k) * 0.55 + blur(level, 16 * k) * 0.35, 0, 1.3)

warm = np.array([255, 184, 104], np.float32)
hot = np.array([255, 244, 220], np.float32)
heat = np.clip((glow - 0.8) / 0.5, 0, 1)[..., None] * 0.85
color = warm + (hot - warm) * heat
alpha = np.clip(np.clip(glow, 0, 1) ** 1.25 * 0.8 + heat[..., 0] * 0.2, 0, 1)

rgba = np.dstack([np.clip(color, 0, 255), alpha * 255]).astype(np.uint8)
Image.fromarray(rgba).save(out, quality=82, method=6)
print(W, H)
