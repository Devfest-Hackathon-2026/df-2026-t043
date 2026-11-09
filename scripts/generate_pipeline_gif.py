"""Render the Tonari Door pipeline using Pillow and installed Windows fonts.

Run from any directory: python path/to/scripts/generate_pipeline_gif.py
Requires Python 3.10+ and Pillow (python -m pip install Pillow).
All illustrations are drawn here; no external images or font files are bundled.
"""

from functools import lru_cache
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "assets" / "pipeline.gif"
SIZE = (1280, 960)
FRAME_COUNT = 32
FRAME_MS = 400
FONT_DIR = Path("C:/Windows/Fonts")
INK = "#44372F"
MUTED = "#76695F"
PAPER = "#FFFDF7"
BLUE = "#4567AD"
INDIGO = "#4C4D8C"
ORANGE = "#CC843D"
GREEN = "#547D65"
STAGES = (
    (40, 152, 604, 440),
    (676, 152, 1240, 440),
    (676, 600, 1240, 888),
    (40, 600, 604, 888),
)
TITLES = ("4つのドアの明かりを見る", "ノックして部屋に入る", "顔を見て、団らんする", "安心をノートに残す")
COLORS = (BLUE, ORANGE, GREEN, INDIGO)


@lru_cache(maxsize=None)
def font(size, bold=False):
    names = ("YuGothB.ttc", "meiryo.ttc", "msgothic.ttc") if bold else (
        "meiryo.ttc", "YuGothB.ttc", "msgothic.ttc"
    )
    for name in names:
        path = FONT_DIR / name
        if path.is_file():
            return ImageFont.truetype(str(path), size)
    raise FileNotFoundError("Install YuGothB.ttc, meiryo.ttc or msgothic.ttc in C:/Windows/Fonts.")


def text(draw, xy, value, size=16, fill=INK, bold=False, max_width=None):
    face = font(size, bold)
    if max_width is not None and draw.textlength(value, font=face) > max_width:
        raise ValueError(f"Text exceeds {max_width}px: {value}")
    draw.text(xy, value, font=face, fill=fill, anchor="lt")


def centered(draw, x, y, value, size=16, **kwargs):
    width = draw.textlength(value, font=font(size, kwargs.get("bold", False)))
    text(draw, (x - width / 2, y), value, size, **kwargs)


def box(draw, rect, fill=PAPER, outline=None, width=1, radius=16):
    draw.rounded_rectangle(rect, radius=radius, fill=fill, outline=outline, width=width)


def arrow(draw, points, color, width=3):
    draw.line(points, fill=color, width=width, joint="curve")
    x, y = points[-1]
    px, py = points[-2]
    angle = math.atan2(y - py, x - px)
    draw.polygon([
        (x, y),
        (x - 10 * math.cos(angle - 0.5), y - 10 * math.sin(angle - 0.5)),
        (x - 10 * math.cos(angle + 0.5), y - 10 * math.sin(angle + 0.5)),
    ], fill=color)


def packet(draw, points, progress, color):
    lengths = [math.dist(a, b) for a, b in zip(points, points[1:])]
    distance = progress * sum(lengths)
    for (a, b), length in zip(zip(points, points[1:]), lengths):
        if distance <= length:
            t = distance / length
            x, y = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
            for r, fill in ((11, "#F5E3B3"), (7, color), (3, "#FFFFFF")):
                draw.ellipse((x - r, y - r, x + r, y + r), fill=fill)
            return
        distance -= length


def person(draw, x, y, color, elder=False):
    draw.ellipse((x - 23, y + 14, x + 23, y + 61), fill=color)
    draw.ellipse((x - 17, y - 23, x + 17, y + 15), fill="#EFC6A2")
    draw.arc((x - 18, y - 26, x + 18, y + 7), 180, 350,
             fill="#C5C4BD" if elder else "#625147", width=8)
    for eye in (x - 6, x + 6):
        draw.ellipse((eye - 1, y - 5, eye + 1, y - 3), fill=INK)
    draw.arc((x - 6, y - 4, x + 6, y + 7), 15, 165, fill=INK, width=2)


def stage_shell(draw, number, active):
    x1, y1, x2, y2 = STAGES[number]
    color = COLORS[number]
    box(draw, (x1 + 2, y1 + 5, x2 + 2, y2 + 5), "#E8DFD3")
    box(draw, (x1, y1, x2, y2), "#FFF8E8" if active else PAPER,
        color if active else "#D9CEC1", 4 if active else 1)
    box(draw, (x1 + 18, y1 + 17, x1 + 107, y1 + 48), color, radius=9)
    centered(draw, x1 + 62, y1 + 23, f"STEP {number + 1}", 16, fill="white", bold=True)
    text(draw, (x1 + 122, y1 + 20), TITLES[number], 23, bold=True, max_width=420)


def hallway_doors(draw, active, phase):
    text(draw, (62, 216), "GET /api/doors  +  WebSocket /ws (doors_update)", 16, fill=BLUE, bold=True)
    names = ("①茶の間", "②縁側", "③ダイニング", "④趣味部屋")
    for i, name in enumerate(names):
        x = 68 + i * 130
        lit = i == 0
        glow = int(16 * math.sin(phase * math.pi)) if active and lit else 0
        box(draw, (x - 9, 248, x + 89, 350), "#F6E2AE" if lit else "#EEE5D6", radius=10)
        box(draw, (x, 255, x + 80, 350), "#B78659", outline="#936540", width=2, radius=5)
        for offset in (18, 40, 62):
            draw.line((x + offset, 258, x + offset, 347), fill="#A7774D", width=1)
        box(draw, (x + 13, 266, x + 67, 306),
            (255, 218 + glow, 143) if lit else "#D8C3A0", radius=4)
        draw.line((x + 40, 267, x + 40, 305), fill="#B78659", width=3)
        draw.ellipse((x + 64, 321, x + 71, 328), fill="#FCE5A4")
        centered(draw, x + 40, 357, name, 13)
    box(draw, (62, 384, 582, 424), "#EAF0FA", radius=9)
    centered(draw, 322, 396, "ドア1点灯：-yoikoarmor-がくつろいでいます。", 18, fill=BLUE, bold=True)


def knock_and_enter(draw, active, phase):
    text(draw, (699, 216), "knock_door  →  enter_door  →  room_state", 17, fill=ORANGE, bold=True)
    box(draw, (702, 250, 910, 366), "#F6E8C8", outline="#CC843D", width=2, radius=10)
    person(draw, 756, 296, "#9C9980", elder=True)
    person(draw, 854, 296, "#7B9DA7")
    centered(draw, 806, 346, "同じドアに2人が入室", 13, bold=True)
    text(draw, (932, 254), "4つの独立ルームインスタンス", 17, bold=True)
    text(draw, (932, 284), "入ったドアだけ明かりが灯る", 16, max_width=290)
    box(draw, (930, 316, 1218, 360), "#FFF3D4", outline="#DDB879", radius=10)
    shift = round(2 * math.sin(phase * math.pi)) if active else 0
    text(draw, (944, 329 - shift), "📹 カメラ常時ONで入室", 17, fill=ORANGE, bold=True)
    box(draw, (698, 384, 1218, 424), "#F6E8C8", radius=9)
    centered(draw, 958, 396, "-yoikoarmor-ほか計2人が団らん中", 19, bold=True)


def danran(draw, active, phase):
    text(draw, (699, 658), "WebRTC 映像・音声 P2P (相手の映像 + 自分の映像)", 16, fill=GREEN, bold=True)
    box(draw, (700, 687, 918, 786), "#DDE7DE", outline="#99B3A1", radius=9)
    box(draw, (708, 694, 807, 777), "#F6EAD8", radius=5)
    box(draw, (812, 694, 910, 777), "#E9EDDF", radius=5)
    person(draw, 756, 724, "#A58B9B", elder=True)
    person(draw, 862, 724, "#7B9DA7")
    draw.ellipse((887, 699, 896, 708), fill="#729E69")
    shift = round(3 * math.sin(phase * math.pi)) if active else 0
    box(draw, (954, 693, 1215, 784), "#E4D8BF", outline="#C4B594", radius=8)
    box(draw, (947, 686 - shift, 1208, 777 - shift), "#FFF3D4", outline="#DDB879", radius=8)
    text(draw, (960, 699 - shift), "団らん話題カード", 18, bold=True)
    text(draw, (960, 730 - shift), "「昔、好きだった遊びは？」", 15)
    text(draw, (699, 800), "実カメラ / バーチャル茶の間カメラ 常時ON", 16, bold=True)
    text(draw, (699, 826), "webrtc_signal でP2P接続  |  share_topic で同室同期", 13, max_width=520)
    text(draw, (699, 848), "100選のランダム抽選: GET /api/topics/random", 13, fill=GREEN)
    text(draw, (699, 868), "AI話題カード生成 (Gemini): TBW", 13, fill=MUTED)


def notebook(draw):
    box(draw, (65, 663, 237, 815), "#E9E8F2", outline="#B5B1CE", radius=8)
    box(draw, (78, 675, 227, 806), "#FFFDF7", radius=5)
    for y in (691, 721, 751, 781):
        draw.ellipse((71, y, 83, y + 7), fill="#B5B1CE")
    text(draw, (94, 690), "安心見守りノート", 14, fill=INDIGO, bold=True)
    for y, width in ((728, 110), (749, 94), (770, 104)):
        draw.line((98, y, 98 + width, y), fill="#D2C9BA", width=3)
    text(draw, (258, 665), "退室  →  Cloud Run  →  Gemini", 16, bold=True)
    text(draw, (258, 700), "時間・話題・気づきメモから要約", 16, max_width=323)
    text(draw, (258, 737), "元気度・様子・次回の話題提案", 17, fill=INDIGO, bold=True)
    text(draw, (258, 775), "顔を見て話した安心を、家族に。", 16)
    text(draw, (63, 832), "POST /api/summary → 安心見守りノート", 15, fill=INDIGO)
    text(draw, (63, 862), "元気度は会話の参考値（医療的な判定ではありません）", 13, fill=MUTED)


def render(frame):
    stage, tick = divmod(frame, 8)
    phase = tick / 7
    image = Image.new("RGB", SIZE, "#F5F0E7")
    draw = ImageDraw.Draw(image)
    # Gentle wood lines evoke a family room without obscuring the text.
    for y in range(0, SIZE[1], 16):
        draw.line((0, y, SIZE[0], y), fill="#F0E9DD")
    text(draw, (40, 23), "となりドア", 34, bold=True)
    text(draw, (249, 34), "4つのドアから始まる、離れて暮らす家族のビデオ団らん。", 23, bold=True)
    text(draw, (42, 78), "電話のタイミングに迷う  /  監視カメラは抵抗がある  /  Web会議は業務的", 17, fill=MUTED)
    text(draw, (42, 111), "ドアの明かりを見る  →  ノックして入室  →  顔を見て団らん  →  安心を残す", 18, fill=BLUE, bold=True)
    text(draw, (1025, 115), "医療・福祉 / 遠距離家族ケア", 13, fill=MUTED)

    for i in range(4):
        stage_shell(draw, i, stage == i)
    hallway_doors(draw, stage == 0, phase)
    knock_and_enter(draw, stage == 1, phase)
    danran(draw, stage == 2, phase)
    notebook(draw)

    # The narrow middle band is the shared service layer, not a media relay.
    box(draw, (126, 473, 1154, 567), "#E8EEF8", outline="#B5C4E0", radius=16)
    box(draw, (143, 488, 484, 550), BLUE, radius=10)
    centered(draw, 313, 496, "Google Cloud Run", 23, fill="white", bold=True)
    centered(draw, 313, 529, "Express + WebSocket /ws (4ドア管理)", 13, fill="white")
    box(draw, (532, 488, 935, 550), INDIGO, radius=10)
    centered(draw, 733, 496, "Gemini 2.5 Flash", 23, fill="white", bold=True)
    centered(draw, 733, 529, "@google/genai / Vertex AI  |  見守り要約 (話題生成: TBW)", 13, fill="white")
    arrow(draw, [(492, 518), (523, 518)], BLUE)
    text(draw, (958, 491), "映像音声はWebRTC", 15, bold=True)
    text(draw, (958, 519), "家族のブラウザ間へ", 15, fill=MUTED)
    # Light up the core box used by the active step.
    core_rect = (139, 484, 488, 554) if stage in (0, 1) else (528, 484, 939, 554)
    box(draw, core_rect, fill=None, outline="#D7A450", width=3, radius=12)
    for points in (
        [(350, 440), (350, 473)], [(962, 440), (962, 473)],
        [(350, 567), (350, 600)], [(962, 567), (962, 600)],
    ):
        draw.line(points, fill="#ACBBD3", width=2)

    # Main experience path: 1 -> 2 -> 3 -> 4, clockwise.
    paths = (
        [(606, 296), (672, 296)],
        [(1241, 348), (1260, 348), (1260, 730), (1242, 730)],
        [(674, 744), (608, 744)],
        [(38, 748), (20, 748), (20, 297), (38, 297)],
    )
    for i, points in enumerate(paths):
        arrow(draw, points, COLORS[i] if stage == i else "#CBBFAC")
    packet(draw, paths[stage], 0.08 + phase * 0.84, COLORS[stage])
    # The final segment represents a return to everyday presence after the note.
    for i in range(4):
        x = 530 + i * 27
        draw.ellipse((x, 922, x + 11, 933), fill=COLORS[i] if stage == i else "#D4C9B9")
    text(draw, (42, 918), "ドアの明かりで気配を知り、顔を見てつながる。", 16, bold=True)
    text(draw, (718, 919), f"{stage + 1} / 4   {TITLES[stage]}", 16, fill=COLORS[stage], bold=True)
    return image


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    # A shared palette keeps small text and warm surfaces stable across frames.
    samples = Image.new("RGB", (640, 480 * 4))
    for stage in range(4):
        samples.paste(render(stage * 8 + 4).resize((640, 480)), (0, stage * 480))
    palette = samples.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
    frames = [render(i).quantize(palette=palette, dither=Image.Dither.NONE)
              for i in range(FRAME_COUNT)]
    frames[0].save(
        OUTPUT, save_all=True, append_images=frames[1:], duration=FRAME_MS,
        loop=0, disposal=2, optimize=False,
    )
    with Image.open(OUTPUT) as gif:
        if gif.size != SIZE or gif.n_frames != FRAME_COUNT or gif.info.get("loop") != 0:
            raise RuntimeError("GIF size, frame count or loop verification failed")
        for index in range(gif.n_frames):
            gif.seek(index)
            gif.load()
            if gif.info.get("duration") != FRAME_MS:
                raise RuntimeError(f"Unexpected duration at frame {index}")
    print(f"Generated {OUTPUT}: {SIZE[0]}x{SIZE[1]}, {FRAME_COUNT} frames, "
          f"{FRAME_COUNT * FRAME_MS / 1000:.1f}s loop, {OUTPUT.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
