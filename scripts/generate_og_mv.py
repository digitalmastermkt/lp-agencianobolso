#!/usr/bin/env python3
"""
Gerador OG Image - Imersao Maquina de Vendas (Salatiel Batista)
Adaptacao da OG da Agencia no Bolso (mesh gradient + Inter Display Black + Anthropic-noise)
pra paleta laranja oficial do site MV.

Layout final (1200x630):
  - Background: mesh gradient (laranja TL + amarelo TR + preto fundo + glow centro)
  - Grid sutil laranja 8 alpha
  - Top-left: marca "MV" tipografica + badge mono
  - Centro: headline 2 linhas (110px InterDisplay Black, linha 2 laranja)
  - Sub direito: 1 linha Inter Medium com data/lote/online
  - Direita: glow dot grande laranja
  - Bottom: footer mono (URL esquerda, tag direita)
  - Noise sutil tipo Anthropic
"""
import io
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path("/opt/NAIA-MASTER/workspace/agencianobolso-deploy")
FONTS = ROOT / ".fonts"
OUT = Path("/tmp/maquinadevendas-site/images")

W, H = 1200, 630

# ============================================================================
# PALETA IMERSAO MV
# ============================================================================
BG_DEEP = (10, 10, 10)            # #0A0A0A preto profundo do site
ORANGE = (249, 115, 22)           # #F97316 accent primario oficial
ORANGE_LIGHT = (253, 186, 116)    # #FDBA74 laranja claro
GOLD = (250, 204, 21)             # #FACC15 amarelo/ouro
WHITE = (255, 255, 255)
GREY_LIGHT = (220, 225, 235)
GREY_MID = (156, 163, 175)        # #9CA3AF
DARK_AMBER = (60, 30, 8)          # tom escuro pra profundidade


def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


def text_size(draw, txt, fnt):
    bbox = draw.textbbox((0, 0), txt, font=fnt)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


# ============================================================================
# MESH GRADIENT (paleta laranja-amarelo sobre preto)
# ============================================================================
def make_mesh_bg(w, h):
    base = Image.new("RGBA", (w, h), BG_DEEP + (255,))
    blobs = [
        # blob principal laranja brilhante centro-esquerda
        (int(w * 0.18), int(h * 0.32), int(w * 0.62), ORANGE, 210),
        # amarelo/ouro top-right
        (int(w * 0.92), int(h * 0.12), int(w * 0.45), GOLD, 170),
        # amber escuro centro pra profundidade
        (int(w * 0.55), int(h * 0.65), int(w * 0.45), DARK_AMBER, 200),
        # laranja claro bottom-right pra balancear
        (int(w * 0.85), int(h * 0.88), int(w * 0.38), ORANGE_LIGHT, 140),
        # toque laranja bottom-left
        (int(w * 0.08), int(h * 0.95), int(w * 0.30), ORANGE, 130),
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

    # Vinheta sutil dark nas bordas
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
def add_grid(img, cell=48, alpha=10):
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    color = (*ORANGE, alpha)
    for x in range(0, w, cell):
        d.line([(x, 0), (x, h)], fill=color, width=1)
    for y in range(0, h, cell):
        d.line([(0, y), (w, y)], fill=color, width=1)
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


# ============================================================================
# NOISE/GRAIN sutil (Anthropic style)
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
# BADGE (bullet + texto mono caixa alta)
# ============================================================================
def draw_badge(img, x, y, text, color=ORANGE):
    d = ImageDraw.Draw(img)
    fnt = font("IBMPlexMono-Medium.ttf", 18)
    bullet_r = 4
    d.ellipse([x, y + 9, x + bullet_r * 2, y + 9 + bullet_r * 2], fill=color)
    d.text((x + bullet_r * 2 + 14, y), text.upper(), font=fnt, fill=color)
    return img


# ============================================================================
# MARCA "MV" TIPOGRAFICA (top-left)
# ============================================================================
def draw_mv_mark(img, x, y):
    """Marca tipografica MV: 'MV' grande Black + 'IMERSAO' pequeno embaixo."""
    d = ImageDraw.Draw(img)
    mv_fnt = font("InterDisplay-Black.ttf", 56)
    d.text((x, y), "MV", font=mv_fnt, fill=WHITE)
    # subline pequena
    sub_fnt = font("IBMPlexMono-Medium.ttf", 13)
    d.text((x + 2, y + 60), "IMERSAO  ·  2026", font=sub_fnt, fill=ORANGE)
    return img


# ============================================================================
# COMPOSICAO
# ============================================================================
def build_og():
    line1 = "Sua máquina"
    line2 = "de vendas."
    sub_line = "13 de junho  ·  Online ao vivo  ·  Lote Fundadores R$47"

    # 1) Mesh gradient
    img = make_mesh_bg(W, H)

    # 2) Grid sutil
    img = add_grid(img, cell=48, alpha=10)

    # 3) Marca MV top-left
    img = draw_mv_mark(img, 60, 50)

    # 4) Badge sob marca
    badge_y = 50 + 56 + 28 + 14
    img = draw_badge(img, 60, badge_y, "Imersao  ·  1 dia", color=ORANGE)

    # 5) Headlines — calcular tamanho ideal pra caber em 1000px
    d = ImageDraw.Draw(img)
    max_width = 1050
    size = 120
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
    headline_y = 240

    d.text((headline_x, headline_y), line1, font=headline_fnt, fill=WHITE)
    d.text((headline_x, headline_y + line_h), line2, font=headline_fnt, fill=ORANGE)

    # 6) Subtitulo abaixo das headlines
    sub_fnt = font("Inter-Medium.ttf", 28)
    sub_y = headline_y + line_h * 2 + 28
    d.text((headline_x, sub_y), sub_line, font=sub_fnt, fill=GREY_LIGHT)

    # 7) Glow dot decorativo grande na direita (espelha conceito AnB)
    img = draw_glow_dot(img, cx=W - 150, cy=240, core_r=22, glow_r=160, color=ORANGE)

    # 8) Glow secundario amarelo sutil bottom-right
    img = draw_glow_dot(img, cx=W - 90, cy=460, core_r=8, glow_r=90, color=GOLD, glow_alpha=110)

    # 9) Footer mono
    footer_fnt = font("IBMPlexMono-Medium.ttf", 17)
    d = ImageDraw.Draw(img)
    d.text((60, H - 45), "maquinadevendas.salatielbatista.com.br", font=footer_fnt, fill=GREY_MID)
    tag = "// IMERSAO MV"
    tw, _ = text_size(d, tag, footer_fnt)
    d.text((W - 60 - tw, H - 45), tag, font=footer_fnt, fill=ORANGE)

    # 10) Linha fina gradient inferior (separador minimal)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for i in range(W - 120):
        t = i / (W - 120)
        color = (
            int(ORANGE[0] * (1 - t) + GOLD[0] * t),
            int(ORANGE[1] * (1 - t) + GOLD[1] * t),
            int(ORANGE[2] * (1 - t) + GOLD[2] * t),
        )
        alpha = int(120 * math.sin(math.pi * (t * 0.8 + 0.1)))
        od.line([(60 + i, H - 65), (60 + i, H - 64)], fill=(*color, alpha))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

    # 11) Noise final pra sofisticacao
    img = add_noise(img, intensity=6)

    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    img = build_og()
    out_path = OUT / "og-imersao-mv.png"
    img.save(out_path, "PNG", optimize=True)
    print(f"[ok] {out_path} ({out_path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
