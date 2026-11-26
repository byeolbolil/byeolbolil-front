"""지도의 광해 레이어에 얹을 하늘 밝기 그림을 만든다.

    python scripts/render_sky_overlay.py <skyglow_korea.bin.gz> public/map/sky-brightness.webp

입력은 백엔드 저장소의 src/main/resources/skyglow/skyglow_korea.bin.gz다. 밤 추천이 장소마다 읽는 것과 같은 격자라서,
지도의 색과 장소 카드의 하늘 밝기가 같은 값에서 나온다. 형식은 백엔드 저장소의 scripts/lightpollution/export_grid.py에
적혀 있고, 값은 하늘 전체에서 평균한 인공 불빛이 자연 밤하늘 밝기의 몇 배인지(ALR)다.

색은 lib/tonight/sky.ts의 skyScalePosition과 같은 눈금으로 정한다. 다섯 등급(경계 0.33, 2, 10, 50)에 한 칸씩을 주고
칸 안에서는 밝기의 로그로 자리를 잡는다. 그래서 장소 카드의 다섯 칸 눈금과 지도의 색이 같은 자리를 가리킨다.
경계값과 그 출처는 백엔드 저장소 docs/SCORING.md의 "광해" 절에 있다. 색 자체는 보기 좋게 고른 것이다.

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

# lib/tonight/sky.ts의 눈금. 양 끝 0.05와 250 사이에 등급 경계 넷을 둔다
EDGES = [0.05, 0.33, 2, 10, 50, 250]


def scale_position(a):
    a = np.clip(a, EDGES[0], EDGES[-1])
    p = np.zeros_like(a)
    for cell in range(len(EDGES) - 1):
        low, high = EDGES[cell], EDGES[cell + 1]
        inside = (a > low) & (a <= high) if cell else (a <= high)
        p[inside] = (cell + np.log(a[inside] / low) / math.log(high / low)) / (len(EDGES) - 1)
    return p


def oklch_to_srgb(l, c, h):
    a, b = c * math.cos(math.radians(h)), c * math.sin(math.radians(h))
    l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s_ = (l - 0.0894841775 * a - 1.2914855480 * b) ** 3
    linear = (
        4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
        -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
        -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_,
    )
    gamma = [12.92 * v if v <= 0.0031308 else 1.055 * v ** (1 / 2.4) - 0.055 for v in linear]
    return [min(255, max(0, round(v * 255))) for v in gamma]


# 장소 카드의 눈금(components/tonight/gauges.tsx의 DarknessScale)과 같은 두 색 사이를 oklch로 섞고, 가장 밝은 끝은
# 흰빛으로 보낸다. 색상각은 짧은 쪽으로 돌아서 남보라에서 붉은빛을 지나 호박색이 된다
STOPS = [(0.0, (0.30, 0.09, 275)), (0.8, (0.90, 0.11, 80)), (1.0, (0.98, 0.035, 90))]


def ramp(p):
    for (p0, c0), (p1, c1) in zip(STOPS, STOPS[1:]):
        if p <= p1:
            t = (p - p0) / (p1 - p0)
            dh = (c1[2] - c0[2] + 180) % 360 - 180
            return oklch_to_srgb(c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + dh * t)
    return oklch_to_srgb(*STOPS[-1][1])


def opacity(p):
    # 자연 그대로의 하늘은 비워서 아래 지도가 보이게 하고, 밝아질수록 진하게 덮는다
    return np.clip((p - 0.1) / 0.75, 0, 1) ** 1.3 * 0.88


LUT = np.array([ramp(i / 255) for i in range(256)], np.float32)
p = scale_position(alr)
index = np.round(p * 255).astype(int)
rgba = np.dstack([LUT[index], opacity(p) * 255]).astype(np.uint8)
Image.fromarray(rgba).save(out, quality=85, method=6)

print(f"{W} x {H}px, 서 {west}, 동 {east:.6g}, 남 {south:.6g}, 북 {north}")

# 범례의 색. 지도 바탕(#0b0f22)에 얹었을 때의 색을 눈금의 여섯 자리에서 뽑는다
base = np.array([0x0B, 0x0F, 0x22], np.float32)
stops = []
for at in (0, 0.2, 0.4, 0.6, 0.8, 1):
    a = float(opacity(np.array([at]))[0])
    color = LUT[round(at * 255)] * a + base * (1 - a)
    stops.append("#%02x%02x%02x %d%%" % (*np.round(color).astype(int), round(at * 100)))
print("범례: linear-gradient(90deg, " + ", ".join(stops) + ")")
