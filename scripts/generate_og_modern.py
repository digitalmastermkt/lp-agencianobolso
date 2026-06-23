#!/usr/bin/env python3
"""
Gerador OG Images Modernas - Agencia no Bolso
Inspiracao: Vercel/Linear/Stripe/Anthropic (mesh gradient + dark neon + typography massive).

Layout final (1200x630):
  - Background: mesh gradient (ciano TL + purpura BR + navy meio + accent TR)
  - Grid sutil ciano 14 alpha
  - Top-left: logo (220px) + badge mono (bullet + caixa alta)
  - Centro: headline 2 linhas (96-104px InterDisplay Black, linha 2 ciano)
  - Sub direito: 2 linhas Inter Medium
  - Direita: glow dot grande + hex pattern textura
  - Bottom: footer mono (URL esquerda, tag direita)
"""
import os
import io
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import cairosvg

ROOT = Path("/opt/NAIA-MASTER/workspace/agencianobolso-deploy")
FONTS = ROOT / ".fonts"
OUT = ROOT / "assets"
LOGO_SVG = Path("/opt/NAIA-MASTER/workspace/agencianobolso-identidade-visual/logos/sources/logo-horizontal.svg")

W, H = 1200, 630

BG_DEEP = (10, 10, 15)
CYAN = (0, 212, 255)
PURPLE = (168, 85, 247)
NAVY = (15, 25, 60)
WHITE = (255, 255, 255)
GREY_LIGHT = (220, 225, 235)
GREY_MID = (130, 135, 155)


def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


def text_size(draw, txt, fnt):
    bbox = draw.textbbox((0, 0), txt, font=fnt)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


# ============================================================================
# MESH GRADIENT
# ============================================================================
def make_mesh_bg(w, h):
    base = Image.new("RGBA", (w, h), BG_DEEP + (255,))
    blobs = [
        (int(w * 0.12), int(h * 0.18), int(w * 0.60), CYAN, 200),
        (int(w * 0.95), int(h * 0.88), int(w * 0.55), PURPLE, 210),
        (int(w * 0.50), int(h * 0.55), int(w * 0.45), NAVY, 180),
        (int(w * 0.85), int(h * 0.15), int(w * 0.28), PURPLE, 150),
        (int(w * 0.05), int(h * 0.95), int(w * 0.30), CYAN, 120),
    ]
    for cx, cy, r, color, alpha in blobs:
        scale = 4
        small = Image.new("RGBA", (w // scale, h // scale), (0, 0, 0, 0))
        sd = ImageDraw.Draw(small)
        steps = 50
        for i in range(steps, 0, -1):
            radius = int(r * i / steps / scale)
            a = int(alpha * (1 - i / steps) ** 1.4)
            sd.ellipse(
                [cx // scale - radius, cy // scale - radius,
                 cx // scale + radius, cy // scale + radius],
                fill=(*color, a),
            )
        small = small.filter(ImageFilter.GaussianBlur(radius=14))
        layer = small.resize((w, h), Image.LANCZOS)
        layer = layer.filter(ImageFilter.GaussianBlur(radius=35))
        base = Image.alpha_composite(base, layer)

    # Vinheta sutil dark nas bordas pra fechar composicao
    vignette = Image.new("L", (w, h), 0)
    vd = ImageDraw.Draw(vignette)
    for i in range(80):
        a = int(180 * (i / 80) ** 2.2)
        vd.rectangle([i, i, w - i, h - i], outline=a)
    vignette = vignette.filter(ImageFilter.GaussianBlur(radius=50))
    vlayer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    vlayer.putalpha(vignette)
    base = Image.alpha_composite(base, vlayer)

    return base.convert("RGB")


# ============================================================================
# GRID
# ============================================================================
def add_grid(img, cell=48, alpha=14):
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    color = (*CYAN, alpha)
    for x in range(0, w, cell):
        d.line([(x, 0), (x, h)], fill=color, width=1)
    for y in range(0, h, cell):
        d.line([(0, y), (w, y)], fill=color, width=1)
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


# ============================================================================
# NOISE/GRAIN sutil (sofisticacao tipo Anthropic)
# ============================================================================
def add_noise(img, intensity=8):
    w, h = img.size
    noise = Image.new("L", (w, h))
    pixels = []
    rng = random.Random(42)
    for _ in range(w * h):
        pixels.append(rng.randint(-intensity, intensity) + 128)
    noise.putdata(pixels)
    noise_rgba = Image.merge("RGBA", (noise, noise, noise, Image.new("L", (w, h), 25)))
    result = Image.alpha_composite(img.convert("RGBA"), noise_rgba)
    return result.convert("RGB")


# ============================================================================
# LOGO
# ============================================================================
def render_logo(svg_path, target_width):
    png_bytes = cairosvg.svg2png(url=str(svg_path), output_width=target_width * 2)
    logo = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    ratio = logo.height / logo.width
    logo = logo.resize((target_width, int(target_width * ratio)), Image.LANCZOS)
    return logo


# ============================================================================
# GLOW DOT
# ============================================================================
def draw_glow_dot(img, cx, cy, core_r, glow_r, color, glow_alpha=160):
    w, h = img.size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    steps = 40
    for i in range(steps, 0, -1):
        r = int(glow_r * i / steps)
        a = int(glow_alpha * (1 - i / steps) ** 2.2)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color, a))
    layer = layer.filter(ImageFilter.GaussianBlur(radius=18))
    d2 = ImageDraw.Draw(layer)
    d2.ellipse([cx - core_r, cy - core_r, cx + core_r, cy + core_r], fill=(*color, 255))
    hr = max(2, core_r // 2)
    d2.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=(255, 255, 255, 240))
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


# ============================================================================
# HEX PATTERN (decorativo)
# ============================================================================
def draw_hex_pattern(img, x0, y0, rows, cols, size, color, alpha=70):
    w, h = img.size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    dx = size * 1.5
    dy = size * math.sqrt(3)
    for r in range(rows):
        for c in range(cols):
            cx = x0 + c * dx
            cy = y0 + r * dy + (size * math.sqrt(3) / 2 if c % 2 else 0)
            pts = [
                (cx + size * math.cos(math.radians(a)),
                 cy + size * math.sin(math.radians(a)))
                for a in range(0, 360, 60)
            ]
            d.polygon(pts, outline=(*color, alpha), width=1)
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


# ============================================================================
# BADGE
# ============================================================================
def draw_badge(img, x, y, text, color=CYAN):
    d = ImageDraw.Draw(img)
    fnt = font("IBMPlexMono-Medium.ttf", 18)
    bullet_r = 4
    d.ellipse([x, y + 9, x + bullet_r * 2, y + 9 + bullet_r * 2], fill=color)
    d.text((x + bullet_r * 2 + 14, y), text.upper(), font=fnt, fill=color)
    return img


# ============================================================================
# COMPOSICAO
# ============================================================================
def build_og(variant: str):
    if variant == "enterprise":
        badge_text = "Enterprise"
        line1 = "Sua empresa."
        line2 = "Com IA real."
        sub_lines = [
            "Naia + 7 agentes que orquestram tudo.",
            "Atendimento, vendas, marketing, operação.",
        ]
    elif variant == "sdr":
        badge_text = "SDR de IA"
        line1 = "Vendas em"
        line2 = "automático."
        sub_lines = [
            "SDR de IA pro seu WhatsApp. 24/7.",
            "Qualifica, agenda, vende.",
        ]
    else:
        raise ValueError(variant)

    # 1) Mesh gradient
    img = make_mesh_bg(W, H)

    # 2) Grid sutil
    img = add_grid(img, cell=48, alpha=14)

    # 3) Hex pattern decorativo no canto direito (tech texture)
    img = draw_hex_pattern(img, x0=W - 280, y0=420, rows=4, cols=5, size=20, color=CYAN, alpha=55)

    # 4) Logo top-left
    logo = render_logo(LOGO_SVG, target_width=220)
    img_rgba = img.convert("RGBA")
    img_rgba.paste(logo, (60, 50), logo)
    img = img_rgba.convert("RGB")

    # 5) Badge sob logo
    badge_y = 50 + logo.height + 14
    img = draw_badge(img, 60, badge_y, badge_text, color=CYAN)

    # 6) Headlines (size escolhido pra caber a maior linha em ~1000px)
    d = ImageDraw.Draw(img)
    # Calcular tamanho ideal: testa 110, reduz se ultrapassar 1000px
    max_width = 1000
    size = 110
    while size > 70:
        fnt = font("InterDisplay-Black.ttf", size)
        w1, _ = text_size(d, line1, fnt)
        w2, _ = text_size(d, line2, fnt)
        if max(w1, w2) <= max_width:
            break
        size -= 4
    headline_fnt = font("InterDisplay-Black.ttf", size)
    line_h = int(size * 1.02)
    headline_x = 60
    headline_y = 232

    d.text((headline_x, headline_y), line1, font=headline_fnt, fill=WHITE)
    d.text((headline_x, headline_y + line_h), line2, font=headline_fnt, fill=CYAN)

    # 7) Subtitulos abaixo das headlines (espaco generoso pro footer)
    sub_fnt = font("Inter-Medium.ttf", 26)
    sub_y = headline_y + line_h * 2 + 24
    d.text((headline_x, sub_y), sub_lines[0], font=sub_fnt, fill=GREY_LIGHT)
    d.text((headline_x, sub_y + 36), sub_lines[1], font=sub_fnt, fill=GREY_MID)

    # 8) Glow dot decorativo direita (acima do hex pattern)
    img = draw_glow_dot(img, cx=W - 150, cy=240, core_r=18, glow_r=140, color=CYAN)

    # 9) Glow secundario purple sutil
    img = draw_glow_dot(img, cx=W - 80, cy=420, core_r=8, glow_r=80, color=PURPLE, glow_alpha=100)

    # 10) Footer
    footer_fnt = font("IBMPlexMono-Medium.ttf", 17)
    d = ImageDraw.Draw(img)
    d.text((60, H - 45), "agencianobolso.com.br", font=footer_fnt, fill=GREY_MID)
    tag = f"// {variant.upper()}"
    tw, _ = text_size(d, tag, footer_fnt)
    d.text((W - 60 - tw, H - 45), tag, font=footer_fnt, fill=CYAN)

    # 11) Linha fina inferior (separador minimal)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    # Linha horizontal com gradient cyan->purple
    for i in range(W - 120):
        t = i / (W - 120)
        color = (
            int(CYAN[0] * (1 - t) + PURPLE[0] * t),
            int(CYAN[1] * (1 - t) + PURPLE[1] * t),
            int(CYAN[2] * (1 - t) + PURPLE[2] * t),
        )
        alpha = int(120 * math.sin(math.pi * (t * 0.8 + 0.1)))
        od.line([(60 + i, H - 65), (60 + i, H - 64)], fill=(*color, alpha))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

    # 12) Noise final pra sofisticacao
    img = add_noise(img, intensity=6)

    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for variant in ["enterprise", "sdr"]:
        img = build_og(variant)
        out_path = OUT / f"og-{variant}.png"
        img.save(out_path, "PNG", optimize=True)
        print(f"[ok] {out_path} ({out_path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
