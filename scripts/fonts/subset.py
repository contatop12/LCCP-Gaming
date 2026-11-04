"""
Gera as fontes do site a partir dos arquivos de scripts/fonts/source/ (subconjunto latino da Fontsource, licença OFL).
Uso (uma vez, quando o texto do site passar a usar caracteres novos):  python scripts/fonts/subset.py
Requer fonttools e brotli (pip install fonttools brotli). Não é dependência do projeto: o resultado fica versionado
em src/assets/fonts/ e o build não roda este script.

O que faz:
  - mantém só os caracteres do português do Brasil (ASCII, letras acentuadas e a pontuação usada no texto);
  - na IBM Plex Sans variável, limita o eixo de peso a 400-700 (o site não usa 100-300);
  - grava woff2 e imprime as métricas usadas nas fontes de reserva de src/styles/fonts.css.
"""
from io import BytesIO
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'source'
OUT = ROOT.parent.parent / 'src' / 'assets' / 'fonts'

ASCII = ''.join(chr(c) for c in range(0x20, 0x7F))
PT = 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ'
PUNCT = '\u00a0ºª°×·€\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u2212\u2122\u2192'
UNICODES = [ord(c) for c in ASCII + PT + PUNCT]


def make(source: str, target: str, limit_wght=None):
    font = TTFont(SRC / source)
    if limit_wght:
        font = instancer.instantiateVariableFont(font, {'wght': limit_wght})
        buffer = BytesIO()
        font.save(buffer)
        buffer.seek(0)
        font = TTFont(buffer)
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk']
    opts.notdef_outline = True
    opts.name_IDs = [1, 2]
    opts.hinting = False
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=UNICODES)
    sub.subset(font)
    font.flavor = 'woff2'
    font.save(OUT / target)
    print(f'{target}: {(OUT / target).stat().st_size} bytes')


make('ibm-plex-sans-latin-wght-normal.woff2', 'ibm-plex-sans-pt-wght-400-700.woff2', (400, 700))
make('saira-condensed-latin-600-normal.woff2', 'saira-condensed-pt-600.woff2')
make('saira-condensed-latin-700-normal.woff2', 'saira-condensed-pt-700.woff2')

# Largura média ponderada por um texto típico em português, para o size-adjust das fontes de reserva.
SAMPLE = (
    'Assistência técnica de computadores e notebooks. Conserto, manutenção e upgrade de PC gamer. '
    'Envie a marca, o modelo e o sintoma pelo WhatsApp para pedir o orçamento. Diagnóstico e laudo técnico.'
)


def width(path, text):
    font = TTFont(path)
    cmap = font.getBestCmap()
    hmtx = font['hmtx']
    total = sum(hmtx[cmap[ord(c)]][0] for c in text if ord(c) in cmap)
    return total / font['head'].unitsPerEm / len(text), font


for name, path, fallback in [
    ('Saira Condensed 700', OUT / 'saira-condensed-pt-700.woff2', 'C:/Windows/Fonts/arialbd.ttf'),
    ('Saira Condensed 600', OUT / 'saira-condensed-pt-600.woff2', 'C:/Windows/Fonts/arialbd.ttf'),
    ('IBM Plex Sans 400', OUT / 'ibm-plex-sans-pt-wght-400-700.woff2', 'C:/Windows/Fonts/arial.ttf'),
]:
    w, f = width(path, SAMPLE)
    fw, ff = width(fallback, SAMPLE)
    upm = f['head'].unitsPerEm
    adjust = w / fw
    asc = f['hhea'].ascent / upm / adjust
    desc = -f['hhea'].descent / upm / adjust
    gap = f['hhea'].lineGap / upm / adjust
    print(f'{name}: size-adjust {adjust * 100:.2f}%  ascent-override {asc * 100:.2f}%  descent-override {desc * 100:.2f}%  line-gap-override {gap * 100:.2f}%')
