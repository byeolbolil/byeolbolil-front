"""지도의 광해 레이어를 만든다. 하늘 밝기와 위성 불빛을 겹쳐서, 어느 지역의 하늘이 어두운지와 그 자리 둘레에 불빛이
있는지를 한 화면에서 보게 한다.

    python scripts/render_light_layers.py <skyglow_korea.bin.gz> <vnl2024_korea.tif> public/map

rasterio와 matplotlib가 필요하다.

입력
    skyglow_korea.bin.gz  백엔드 저장소 src/main/resources/skyglow/. 밤 추천이 장소마다 읽는 하늘 밝기 격자(ALR,
                          하늘 전체에서 평균한 인공 불빛이 자연 밤하늘의 몇 배인지). 형식은 백엔드 저장소의
                          scripts/lightpollution/export_grid.py에 있다.
    vnl2024_korea.tif     VIIRS Nighttime Lights V2 2024 연간 합성을 한국 둘레로 자른 것. 백엔드 저장소의
                          scripts/lightpollution/crop_radiance.py가 만든다. 원본은 저장소 밖에 있다.

출력
    sky-dark.webp     하늘 밝기 2배 아래(장소 카드의 "어두운 하늘"부터 그보다 어두운 곳)를 옅은 푸른빛으로 칠한 그림
    sky-glow.webp     은하수가 보이지 않는 하늘(10배 이상) 둘레의 호박색 빛무리
    lights.webp       위성이 본 불빛. 마을, 도로, 스키장처럼 불빛이 나오는 자리를 점으로 보여 준다
    sky-lines.geojson 하늘 밝기 2, 3, 5, 10배의 경계선. 속성 level에 배수가 들어 있다

경계 2와 10은 장소 카드의 등급 경계와 같다(Duriscoe et al., JQSRT 214, 133 (2018)의 표 3. 백엔드 저장소 docs/SCORING.md
"광해"). 3과 5는 그 사이의 차이를 읽으려고 더한 눈금이고 등급의 경계가 아니다. 색과 투명도는 보기 좋게 고른 값이다.

하늘 밝기를 모두 칠하면 한국 내륙의 70%가 2~10배라서 국토 전체가 뿌옇게 덮인다. 그래서 관심 있는 양 끝만 칠하고
(어두운 곳은 푸르게, 도시 둘레는 빛무리로) 그 사이는 경계선으로만 읽게 한다.

MapLibre의 image 소스는 네 귀퉁이 사이를 웹 메르카토르 평면에서 선형으로 늘리므로, 그림의 세로축은 메르카토르 y에
비례하게 그린다. 범위는 하늘 밝기 격자의 범위를 쓰고 끝에 출력한다. 범위가 바뀌면 lib/tonight/night-overlay.ts의
좌표도 함께 바꾼다.
"""
import gzip
import json
import math
import struct
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import rasterio  # noqa: E402
from PIL import Image, ImageFilter  # noqa: E402

sky_path, lights_path, out_dir = sys.argv[1], sys.argv[2], Path(sys.argv[3])
out_dir.mkdir(parents=True, exist_ok=True)

# 하늘 밝기 격자. 값은 round(1000 * log10(ALR))이고 줄마다 서쪽에서 동쪽으로, 북쪽 줄부터다
raw = gzip.open(sky_path, "rb").read()
if raw[:4] != b"SKYG":
    raise SystemExit("하늘 밝기 격자 파일이 아니다")
version, rows, cols = struct.unpack(">iii", raw[4:16])
if version != 1:
    raise SystemExit(f"읽을 수 없는 격자 파일 버전: {version}")
north, west, step = struct.unpack(">ddd", raw[16:40])
log_alr = np.frombuffer(raw, ">i2", rows * cols, 40).reshape(rows, cols).astype(np.float32) / 1000
south, east = north - rows * step, west + cols * step


def merc(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


Y0, Y1 = merc(south), merc(north)


def pixel_centers(width):
    """그림 한 장의 픽셀 중심 위경도. 세로는 메르카토르로 고르게 나눈다"""
    height = int(round((Y1 - Y0) / math.radians(east - west) * width))
    merc_y = Y1 - (np.arange(height) + 0.5) / height * (Y1 - Y0)
    lat = np.degrees(2 * np.arctan(np.exp(merc_y)) - math.pi / 2)
    lon = west + (np.arange(width) + 0.5) / width * (east - west)
    return lat, lon


def sample(grid, g_north, g_west, g_step, lat, lon):
    """칸의 중심을 격자점으로 보고 쌍선형으로 보간한다(SkyBrightnessGrid와 같은 방식)"""
    g_rows, g_cols = grid.shape
    gy = np.clip((g_north - lat) / g_step - 0.5, 0, g_rows - 1)
    gx = np.clip((lon - g_west) / g_step - 0.5, 0, g_cols - 1)
    r0 = np.minimum(gy.astype(int), g_rows - 2)
    c0 = np.minimum(gx.astype(int), g_cols - 2)
    fy = (gy - r0)[:, None]
    fx = (gx - c0)[None, :]
    R, C = r0[:, None], c0[None, :]
    return (grid[R, C] * (1 - fx) + grid[R, C + 1] * fx) * (1 - fy) \
        + (grid[R + 1, C] * (1 - fx) + grid[R + 1, C + 1] * fx) * fy


def save(rgb, alpha, name):
    rgba = np.dstack([np.broadcast_to(rgb, alpha.shape + (3,)), np.clip(alpha, 0, 1) * 255]).astype(np.uint8)
    Image.fromarray(rgba).save(out_dir / name, quality=85, method=6)
    print(f"{name}: {alpha.shape[1]} x {alpha.shape[0]}px")


# 1. 하늘 밝기 그림 두 장. 하늘 밝기는 수십 km에 걸쳐 완만하게 바뀌므로 격자 한 칸을 가로 2px로 그리면 된다
lat, lon = pixel_centers(cols * 2)
sky = sample(log_alr, north, west, step, lat, lon)

# 어두운 하늘: 2배에서 옅게 시작해 1배 아래로 갈수록 조금 진해진다. 경계선과 겹치도록 2배 언저리만 부드럽게 넘긴다
edge = np.clip((math.log10(2) - sky) / 0.03 + 0.5, 0, 1)
depth = np.clip((math.log10(2) - sky) / math.log10(2), 0, 1)
save(np.array([111, 168, 255], np.float32), edge * (0.14 + 0.16 * depth), "sky-dark.webp")

# 도시 둘레의 빛무리: 8배에서 시작해 150배에서 가장 진하다
t = np.clip((sky - math.log10(8)) / math.log10(150 / 8), 0, 1)
warm = np.array([255, 184, 104], np.float32)
hot = np.array([255, 236, 205], np.float32)
glow_rgb = warm + (hot - warm) * np.clip((t - 0.5) / 0.5, 0, 1)[..., None]
save(glow_rgb, t ** 1.4 * 0.62, "sky-glow.webp")

# 2. 위성 불빛. 원본 격자(15초각, 약 0.42km)보다 조금 촘촘하게 그린다
with rasterio.open(lights_path) as src:
    radiance = src.read(1).astype(np.float32)
    tr = src.transform
radiance = np.nan_to_num(np.maximum(radiance, 0))
lat, lon = pixel_centers(2080)
rad = sample(radiance, tr.f, tr.c, tr.a, lat, lon)
# 로그로 밝기를 정한다. 0.6 nW/cm²/sr 아래는 배경 잡음이라 버리고 150에서 끝까지 찬다
level = np.clip((np.log1p(rad) - math.log1p(0.6)) / (math.log1p(150) - math.log1p(0.6)), 0, 1)
blurred = np.asarray(
    Image.fromarray((level * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6)), np.float32) / 255
spot = np.clip(level * 0.85 + blurred * 0.5, 0, 1)
light_rgb = warm + (hot - warm) * np.clip((spot - 0.55) / 0.45, 0, 1)[..., None]
save(light_rgb, spot ** 1.15 * 0.9, "lights.webp")

# 3. 경계선. 격자의 로그값에서 등고선을 뽑는다. 바다 위의 선은 지도에서 바다 아래에 깔려 가려진다
LEVELS = [2, 3, 5, 10]
grid_lat = north - (np.arange(rows) + 0.5) * step
grid_lon = west + (np.arange(cols) + 0.5) * step
contours = plt.contour(grid_lon, grid_lat, log_alr, levels=[math.log10(v) for v in LEVELS])
features = []
MIN_POINTS = 12  # 이보다 짧은 고리는 칸 몇 개짜리 잡음이라 버린다
for value, segments in zip(LEVELS, contours.allsegs):
    for segment in segments:
        if len(segment) < MIN_POINTS:
            continue
        coords = [[round(float(x), 3), round(float(y), 3)] for x, y in segment]  # 약 100m. 격자 간격(0.9km)보다 촘촘하다
        # 연속으로 같은 점이 된 것은 줄인다
        coords = [c for i, c in enumerate(coords) if i == 0 or c != coords[i - 1]]
        features.append({
            "type": "Feature",
            "properties": {"level": value},
            "geometry": {"type": "LineString", "coordinates": coords},
        })
(out_dir / "sky-lines.geojson").write_text(
    json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")), encoding="utf-8")
print(f"sky-lines.geojson: 선 {len(features)}개")

print(f"범위: 서 {west}, 동 {east:.6g}, 남 {south:.6g}, 북 {north}")
