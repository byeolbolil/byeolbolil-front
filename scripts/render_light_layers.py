"""지도의 광해 레이어를 만든다. 하늘 밝기와 위성 불빛을 겹쳐서, 어느 지역의 하늘이 어두운지와 그 자리 둘레에 불빛이
있는지를 한 화면에서 보게 한다. 처음 보는 사람도 "더 푸른 곳으로 가면 된다"만 알면 읽을 수 있게 숫자는 지도에 적지 않는다.

    python scripts/render_light_layers.py <skyglow_korea.bin.gz> <vnl2024_korea.tif> public/map

rasterio가 필요하다.

입력
    skyglow_korea.bin.gz  백엔드 저장소 src/main/resources/skyglow/. 밤 추천이 장소마다 읽는 하늘 밝기 격자(ALR,
                          하늘 전체에서 평균한 인공 불빛이 자연 밤하늘의 몇 배인지). 형식은 백엔드 저장소의
                          scripts/lightpollution/export_grid.py에 있다.
    vnl2024_korea.tif     VIIRS Nighttime Lights V2 2024 연간 합성을 한국 둘레로 자른 것. 백엔드 저장소의
                          scripts/lightpollution/crop_radiance.py가 만든다. 원본은 저장소 밖에 있다.

출력
    sky-dark.webp     하늘이 어두운 곳을 푸른빛으로 칠한 그림. 어두울수록 진하고 5배쯤에서 사라진다
    sky-glow.webp     은하수가 보이지 않는 하늘(10배 이상) 둘레의 호박색 빛무리
    lights.webp       위성이 본 불빛. 마을, 도로, 스키장처럼 불빛이 나오는 자리를 점으로 보여 준다

빛무리가 시작하는 10배는 은하수가 보이지 않게 되는 경계로, 장소 카드의 등급 경계와 같다(Duriscoe et al., JQSRT 214, 133
(2018)의 표 3. 백엔드 저장소 docs/SCORING.md "광해"). 푸른빛이 끝나는 5배와 색, 투명도는 보기 좋게 고른 값이다.

하늘 밝기를 한 눈금으로 모두 칠하면 한국 내륙의 70%가 2~10배라서 국토 전체가 뿌옇게 덮인다. 그래서 양 끝만 칠한다.
어두운 쪽은 지도 바탕과 어울리는 푸른빛이라 넓게 칠해도 막처럼 보이지 않고, 진하기로 어두운 정도를 읽는다.

MapLibre의 image 소스는 네 귀퉁이 사이를 웹 메르카토르 평면에서 선형으로 늘리므로, 그림의 세로축은 메르카토르 y에
비례하게 그린다. 범위는 하늘 밝기 격자의 범위를 쓰고 끝에 출력한다. 범위가 바뀌면 lib/tonight/night-overlay.ts의
좌표도 함께 바꾼다.
"""
import gzip
import math
import struct
import sys
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image, ImageFilter

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

# 어두운 하늘: 5배에서 옅게 시작해 1배 아래에서 가장 진하다. 투명도는 1.2제곱으로 올려서 어두운 쪽 차이를 키운다
dark = np.clip((math.log10(5) - sky) / math.log10(5), 0, 1)
save(np.array([111, 168, 255], np.float32), dark ** 1.2 * 0.45, "sky-dark.webp")

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

print(f"범위: 서 {west}, 동 {east:.6g}, 남 {south:.6g}, 북 {north}")
