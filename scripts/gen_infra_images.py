# -*- coding: utf-8 -*-
"""
gen_infra_images.py — 3 ilustracoes-conceito tech para a secao #infraestrutura
do site agencianobolso.com.br. Familia coerente: fundo quase preto, glow neon
cyan (#00D4FF) + roxo (#A855F7), render 3D tech premium, sem texto, composicao
central com respiro.

Conceitos:
  1. corpo-servidor  -> datacenter elegante em forma de casa, neon
  2. cerebro-llm     -> cerebro neural brilhante (sinapses de luz) [PEDIDO EXPLICITO]
  3. skills          -> constelacao de ferramentas/icones conectados (caixa de ferramentas de luz)

Gera 2 variacoes (n=2) de cada via Imagen 4. 16:9 pra entrar grande no layout.
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, "/opt/NAIA-MASTER/bot")


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
from gemini_image import generate_image  # noqa: E402

DEST = Path("/opt/NAIA-MASTER/workspace/agencianobolso-deploy/assets/img/infra")
DEST.mkdir(parents=True, exist_ok=True)

# Estilo comum (familia de ilustracoes) — repetido em todos os prompts.
STYLE = (
    "Premium 3D render, high-end tech illustration, dark near-black background "
    "(#08080d), dramatic glowing neon lighting in cyan (#00D4FF) and electric "
    "purple (#A855F7), subtle volumetric haze, soft reflections, futuristic and "
    "elegant, cinematic depth of field, central composition with generous "
    "breathing space around the subject, no text, no words, no letters, no logos, "
    "no watermark, clean and uncluttered, ultra detailed, 8k, octane render quality."
)

CONCEITOS = [
    (
        "corpo-servidor",
        "A futuristic data-center server rack shaped like a sleek modern house, "
        "glowing server blades and fiber-optic light streams, cyan and purple "
        "neon edge lighting outlining the house silhouette, a calm always-on "
        "machine humming in the dark, a few floating light particles. "
        "Symbol of the body / the home where the AI lives. " + STYLE,
    ),
    (
        "cerebro-llm",
        "A glowing translucent human brain made of luminous neural networks, "
        "bright synapses firing as points of cyan and purple light, delicate "
        "interconnected nodes and light filaments forming the brain shape, "
        "energy flowing through the connections, floating gently in dark space, "
        "highly detailed neural sci-fi aesthetic. The thinking core of the AI. "
        + STYLE,
    ),
    (
        "skills",
        "A constellation of glowing tool icons and capability nodes connected by "
        "thin neon light lines, like a futuristic toolbox made of light: small "
        "luminous orbs and geometric tool symbols (gear, chat bubble, chart, "
        "lightning bolt, document) orbiting a central glowing core, cyan and "
        "purple energy links between them, organized network of skills. "
        "Symbol of abilities that execute the work. " + STYLE,
    ),
]


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for name, prompt in CONCEITOS:
        if only and only != name:
            continue
        print(f"--> gerando {name} (2 variacoes) ...", flush=True)
        try:
            paths = generate_image(
                prompt=prompt,
                model="imagen-4.0-generate-001",
                aspect_ratio="16:9",
                n=2,
                output_dir=str(DEST),
                file_prefix=f"raw_{name}",
            )
            for p in paths:
                print(f"    OK {p}", flush=True)
        except Exception as e:
            print(f"    ERRO {name}: {e!r}", flush=True)


if __name__ == "__main__":
    main()
