# -*- coding: utf-8 -*-
"""
gen_agentes_magnata.py — avatares dos 7 agentes novos da MAIA Magnata.
Mesmo padrao do gen_infra_images.py: roda NA VPS (ssh naia) com o venv do bot,
le a GEMINI_API_KEY de /opt/NAIA-MASTER/bot/.env. Gera em paralelo.

Uso (na VPS):
  /opt/NAIA-MASTER/bot/venv/bin/python /tmp/gen_agentes_magnata.py [nome ...]
Saida: /tmp/agentes_magnata/<nome>.png  (converter p/ webp 800x800 no local)
Refs de estilo (opcionais): /tmp/agentes_magnata/ref/*.webp
"""
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path


def _load_env_key():
    if os.environ.get("GEMINI_API_KEY"):
        return
    env = Path("/opt/NAIA-MASTER/bot/.env")
    for raw in env.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw.strip()
        if line.startswith("GEMINI_API_KEY"):
            _, _, val = line.partition("=")
            os.environ["GEMINI_API_KEY"] = val.strip().strip('"').strip("'")
            return


_load_env_key()
from google import genai  # noqa: E402
from google.genai import types  # noqa: E402

MODEL = os.environ.get("IMG_MODEL", "gemini-3-pro-image")
DEST = Path("/tmp/agentes_magnata")
DEST.mkdir(parents=True, exist_ok=True)
REFS = sorted((DEST / "ref").glob("*.webp"))

STYLE = (
    "Square 1:1 photorealistic studio portrait photograph, head and shoulders, "
    "subject centered, face fully visible, shot on an 85mm lens, shallow depth of "
    "field. Plain dark near-black seamless studio background with a soft teal/cyan "
    "glow in the upper left corner fading to deep purple on the right. Cinematic "
    "two-tone gel lighting: cool teal-cyan key light from the left, magenta-purple "
    "rim light from the right on cheek, hair and shoulder. Natural realistic skin "
    "texture, true-to-life skin tone, real person, editorial corporate headshot. "
    "Dark elegant clothing. No hands in frame. No text, no letters, no logos, no "
    "watermark, no caption, no border. "
    "The attached images are STYLE REFERENCES ONLY (lighting, background, framing, "
    "realism): generate a completely different person, do not copy their faces."
)

AGENTES = {
    "bia": "A young Black Brazilian woman in her mid 20s, content strategist and "
           "scriptwriter, natural afro-textured coily hair worn out and proud, warm "
           "creative confident smile, black turtleneck, small gold earrings.",
    "aline": "An elegant Brazilian woman around 40 years old, corporate lawyer, "
             "shoulder-length sleek dark brown hair, composed serene expression with a "
             "subtle confident smile, tailored dark blazer over a black silk blouse, "
             "discreet pearl earrings.",
    "maria": "A Brazilian woman around 50 years old, tax accountant, warm welcoming "
             "kind smile, short wavy hair with some natural grey strands, dark "
             "cardigan over a dark blouse. Around her neck she wears a green lanyard "
             "printed with small yellow sunflowers (the Hidden Disabilities Sunflower "
             "lanyard), clearly visible but understated, worn naturally and with "
             "dignity. The lanyard has only the sunflower pattern, no words.",
    "boris": "A Black Brazilian man in his early 30s, software engineer, short hair "
             "and a neat short beard, calm focused friendly expression with a slight "
             "smile, dark crew-neck sweater. Matte black over-ear noise-cancelling "
             "headphones resting around his neck. On his chest a single small discreet "
             "enamel pin in the shape of a rainbow-colored infinity symbol (the "
             "neurodiversity symbol). Dignified, not a caricature.",
    "geane": "A Brazilian woman from the Northeast of Brazil in her mid 30s, HR "
             "manager, mixed-race (parda) with warm light-brown skin, long wavy dark "
             "hair, big open genuine joyful smile showing teeth, dark blouse, small "
             "hoop earrings.",
    "marcia": "A Black Brazilian woman around 45 years old, chief financial officer, "
              "long neat box braids pulled partly back, confident upright posture, "
              "assured calm expression with a slight smile, dark tailored blazer, "
              "small gold earrings.",
    "ruth": "A young Brazilian woman around 27 years old, B2B sales development rep, "
            "energetic bright enthusiastic smile, lively eyes, light-brown hair in a "
            "high ponytail, dark blazer over a black top, body slightly angled as if "
            "about to speak.",
}


def gerar(nome):
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    parts = [
        types.Part.from_bytes(data=r.read_bytes(), mime_type="image/webp") for r in REFS
    ]
    parts.append(types.Part.from_text(text=AGENTES[nome] + " " + STYLE))
    last = None
    for tentativa in range(3):
        try:
            resp = client.models.generate_content(
                model=MODEL,
                contents=[types.Content(role="user", parts=parts)],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    image_config=types.ImageConfig(aspect_ratio="1:1"),
                ),
            )
            for p in resp.candidates[0].content.parts:
                if getattr(p, "inline_data", None) and p.inline_data.data:
                    out = DEST / f"{nome}.png"
                    out.write_bytes(p.inline_data.data)
                    return f"OK {nome} {out.stat().st_size}"
            last = "sem imagem na resposta"
        except Exception as e:  # noqa: BLE001
            last = repr(e)[:300]
    return f"ERRO {nome}: {last}"


def main():
    nomes = sys.argv[1:] or list(AGENTES)
    print(f"modelo={MODEL} refs={len(REFS)}", flush=True)
    with ThreadPoolExecutor(max_workers=7) as ex:
        for r in ex.map(gerar, nomes):
            print(r, flush=True)


if __name__ == "__main__":
    main()
