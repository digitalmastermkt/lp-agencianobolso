# agencianobolso.com.br

Site institucional e páginas de venda da Agência no Bolso. Estático (HTML5 + CSS), hospedado no GitHub Pages com Cloudflare proxy.

## Estrutura

- `/index.html` — Homepage Naia Enterprise (high-ticket consultivo)
- `/sdr/index.html` — Planos SDR Starter R$ 497 + Premium R$ 997
- `/assets/style.css` — Design system completo (paleta navy + dourado)
- `/assets/salatiel.jpg` — Foto autoridade
- `/assets/logo.svg`, `logo-mark.svg`, `favicon.svg` — Identidade visual
- `CNAME` — Domínio custom GitHub Pages
- `sitemap.xml`, `robots.txt` — SEO

## Stack

- HTML5 semântico
- CSS inline customizado (sem Tailwind CDN — performance em conexão fraca)
- Google Fonts (Playfair Display, IBM Plex Sans, JetBrains Mono, Crimson Pro)
- Schema.org JSON-LD (Organization, Product, FAQPage)
- Zero JS framework (FAQ usa `<details>` nativo)

## Deploy

GitHub Pages com domínio `agencianobolso.com.br`. DNS Cloudflare proxied=true.

## Copy + Briefing

Fontes em `/opt/NAIA-MASTER/workspace/agencianobolso-v4-sdr-enterprise/`.

---
Build: 2026-05-15 · Paulo, Dev Full-stack · equipe Naia
