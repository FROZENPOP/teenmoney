# Fonts

Both families are under the SIL Open Font License 1.1; each licence is next to its files. Both were downloaded on 21 Nov 2026 from the Google Fonts repository (`github.com/google/fonts`), the official release channel for both families. The upstream project for Bricolage Grotesque is `github.com/ateliertriple/bricolage`.

| File | Source | What was kept |
|---|---|---|
| `bricolage-grotesque-latin-var.woff2` | `ofl/bricolagegrotesque/BricolageGrotesque[opsz,wdth,wght].ttf` | Variable weight 500-800 and optical size 12-96. Width fixed at 100. Latin subset. Features: kern, tnum, lnum, case. |
| `atkinson-hyperlegible-latin-regular.woff2` | `ofl/atkinsonhyperlegible/AtkinsonHyperlegible-Regular.ttf` | Latin subset |
| `atkinson-hyperlegible-latin-bold.woff2` | `ofl/atkinsonhyperlegible/AtkinsonHyperlegible-Bold.ttf` | Latin subset |
| `OFL-bricolage-grotesque.txt` | `ofl/bricolagegrotesque/OFL.txt` | |
| `OFL-atkinson-hyperlegible.txt` | `ofl/atkinsonhyperlegible/OFL.txt` | |

To rebuild, use fontTools (`pip install fonttools brotli`). The Latin range below is the one Google Fonts uses.

```
python -m fontTools.varLib.instancer "BricolageGrotesque[opsz,wdth,wght].ttf" wght=500:800 wdth=100 -o bricolage.ttf
python -m fontTools.subset <font>.ttf --flavor=woff2 \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" \
  --layout-features='kern,liga,calt,ccmp,locl,mark,mkmk,tnum,lnum,case' --output-file=<name>.woff2
```
