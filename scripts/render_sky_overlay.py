"""지도의 광해 레이어에 얹을 하늘 밝기 그림을 만든다.

    python scripts/render_sky_overlay.py <skyglow_korea.bin.gz> public/map/sky-brightness.webp

입력은 백엔드 저장소의 src/main/resources/skyglow/skyglow_korea.bin.gz다. 밤 추천이 장소마다 읽는 것과 같은 격자라서,
지도의 색과 장소 카드의 하늘 밝기가 같은 값에서 나온다. 형식은 백엔드 저장소의 scripts/lightpollution/export_grid.py에
적혀 있고, 값은 하늘 전체에서 평균한 인공 불빛이 자연 밤하늘 밝기의 몇 배인지(ALR)다.

한국 내륙은 70%가 ALR 2~10이라, 그 구간을 옅게라도 칠하면 국토 전체에 뿌연 막이 덮인다. 그래서 ALR 3 아래는 비워
두고(어두운 곳은 지도 바탕 그대로 어둡다), 3에서 60까지를 로그로 펴서 불투명도를 2제곱에 가깝게 올린다. 빛은 호박색에서
가장 밝은 곳만 흰빛으로 간다. 이 범위와 곡선은 보기 좋게 고른 그림의 값이고 등급의 경계가 아니다. 등급의 경계는 백엔드
저장소 docs/SCORING.md의 "광해" 절에 있고, 범례에는 그중 은하수가 보이지 않게 되는 ALR 10의 자리를 표시한다.

MapLibre의 image 소스는 네 귀퉁이 좌표 사이를 웹 메르카토르 평면에서 선형으로 늘린다. 그래서 그림의 세로축은 위도가
아니라 메르카토르 y에 비례하게 그린다. 범위는 격자의 범위를 그대로 쓰고, 끝에 그 범위를 출력한다.
범위가 바뀌면 lib/tonight/night-overlay.ts의 좌표도 함께 바꿔야 한다.
"""
import gzip
import math
import struct
import sys

import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]

with gzip.open(src, "rb") as f:
    raw = f.read()
if raw[:4] != b"SKYG":
    raise SystemExit("하늘 밝기 격자 파일이 아니다")
version, rows, cols = struct.unpack(">iii", raw[4:16])
if version != 1:
    raise SystemExit(f"읽을 수 없는 격자 파일 버전: {version}")
north, west, step = struct.unpack(">ddd", raw[16:40])
# 첫 층이 하늘 밝기다. 값은 round(1000 * log10(ALR))
log_alr = np.frombuffer(raw, ">i2", rows * cols, 40).reshape(rows, cols).astype(np.float32) / 1000
south, east = north - rows * step, west + cols * step

S = 2  # 격자 한 칸을 가로 2px로 그린다
W = cols * S


def merc(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


Y0, Y1 = merc(south), merc(north)
H = int(round((Y1 - Y0) / math.radians(east - west) * W))

# 픽셀 중심의 위경도를 구하고, 칸의 중심을 격자점으로 보아 로그값을 쌍선형으로 보간한다(SkyBrightnessGrid와 같다)
merc_y = Y1 - (np.arange(H) + 0.5) / H * (Y1 - Y0)
lat = np.degrees(2 * np.arctan(np.exp(merc_y)) - math.pi / 2)
lon = west + (np.arange(W) + 0.5) / W * (east - west)
gy = np.clip((north - lat) / step - 0.5, 0, rows - 1)
gx = np.clip((lon - west) / step - 0.5, 0, cols - 1)
r0 = np.minimum(gy.astype(int), rows - 2)
c0 = np.minimum(gx.astype(int), cols - 2)
fy = (gy - r0)[:, None]
fx = (gx - c0)[None, :]
R, C = r0[:, None], c0[None, :]
value = (log_alr[R, C] * (1 - fx) + log_alr[R, C + 1] * fx) * (1 - fy) \
    + (log_alr[R + 1, C] * (1 - fx) + log_alr[R + 1, C + 1] * fx) * fy
alr = 10 ** value

LOW, HIGH = 3, 60  # 이 사이를 로그로 편다. LOW 아래는 투명, HIGH 위는 가장 진하게
GAMMA = 1.8
MAX_OPACITY = 0.9
WARM = np.array([255, 184, 104], np.float32)
HOT = np.array([255, 244, 220], np.float32)


def position(a):
    return np.clip(np.log(a / LOW) / math.log(HIGH / LOW), 0, 1)


def color(t):
    heat = np.clip((t - 0.6) / 0.4, 0, 1)[..., None]
    return WARM + (HOT - WARM) * heat


def opacity(t):
    return t ** GAMMA * MAX_OPACITY


t = position(alr)
rgba = np.dstack([color(t), opacity(t) * 255]).astype(np.uint8)
Image.fromarray(rgba).save(out, quality=85, method=6)

print(f"{W} x {H}px, 서 {west}, 동 {east:.6g}, 남 {south:.6g}, 북 {north}")

# 범례의 색. 지도 바탕(#0b0f22)에 얹었을 때의 색을 다섯 자리에서 뽑고, ALR 10의 자리를 함께 적는다
base = np.array([0x0B, 0x0F, 0x22], np.float32)
stops = []
for at in (0, 0.25, 0.5, 0.75, 1):
    t = np.array([at], np.float32)
    a = float(opacity(t)[0])
    mixed = color(t)[0] * a + base * (1 - a)
    stops.append("#%02x%02x%02x %d%%" % (*np.round(mixed).astype(int), round(at * 100)))
print("범례: linear-gradient(90deg, " + ", ".join(stops) + ")")
print(f"은하수 경계(ALR 10)의 자리: {float(position(np.array([10.0]))[0]) * 100:.0f}%")
