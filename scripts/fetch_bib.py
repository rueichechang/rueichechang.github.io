#!/usr/bin/env python3
"""Fetch BibTeX for each publication and emit js/bib.js.

DOIs use Crossref/DataCite content negotiation; arXiv preprints use the
DataCite arXiv DOI. Results are reformatted into a readable multi-line style
and written keyed by DOI ("10.1145/...") or arXiv id ("arxiv:2604.23749").
"""
import json
import re
import time
import urllib.request

# key -> DOI to resolve via content negotiation.
DOI = {
    "10.1145/3772318.3791308": "10.1145/3772318.3791308",   # TouchScribe
    "10.1145/3746058.3758468": "10.1145/3746058.3758468",   # Doctoral Symposium
    "10.1145/3663547.3746319": "10.1145/3663547.3746319",   # ChatGPT probing
    "10.1145/3746059.3747761": "10.1145/3746059.3747761",   # Viago
    "10.1145/3654777.3676375": "10.1145/3654777.3676375",   # WorldScribe
    "10.1145/3663548.3675599": "10.1145/3663548.3675599",   # EditScribe
    "10.1145/3663548.3675617": "10.1145/3663548.3675617",   # Audio Description Customization
    "10.1145/3643834.3661556": "10.1145/3643834.3661556",   # SoundShift
    "10.1145/3677846.3677861": "10.1145/3677846.3677861",   # ImageExplorer
    "10.14722/usec.2024.23035": "10.14722/usec.2024.23035", # AdvCAPTCHA
    "10.1145/3544548.3580684": "10.1145/3544548.3580684",   # Laser-Cut study
    "10.1145/3526113.3545613": "10.1145/3526113.3545613",   # OmniScribe
    "10.1145/3562939.3565609": "10.1145/3562939.3565609",   # Puppeteer
    "10.1145/3472749.3474754": "10.1145/3472749.3474754",   # Daedalus
    "10.1145/3411764.3445690": "10.1145/3411764.3445690",   # AccessibleCircuits
    "10.1145/3313831.3376505": "10.1145/3313831.3376505",   # Glissade
    "10.1145/3313831.3376501": "10.1145/3313831.3376501",   # Smart-home routine
    "10.1145/3385959.3418457": "10.1145/3385959.3418457",   # TanGo
    "10.1145/3332165.3347898": "10.1145/3332165.3347898",   # Masque
}

# arxiv id -> DataCite arXiv DOI
ARXIV = {
    "arxiv:2604.23749": "10.48550/arXiv.2604.23749",  # StateScribe
    "arxiv:2607.17527": "10.48550/arXiv.2607.17527",  # Sidekick
}

# Nicer @citekey overrides (DataCite gives ugly URL-based keys for arXiv).
CITEKEY = {
    "arxiv:2604.23749": "chang2026statescribe",
    "arxiv:2607.17527": "chang2026sidekick",
}

# Project variable name + output order (key -> JS variable name).
NAMES = [
    ("arxiv:2604.23749", "statescribe"),
    ("arxiv:2607.17527", "sidekick"),
    ("10.1145/3772318.3791308", "touchscribe"),
    ("10.1145/3746058.3758468", "doctoralSymposium"),
    ("10.1145/3663547.3746319", "chatgptProbing"),
    ("10.1145/3746059.3747761", "viago"),
    ("ieee:11180930", "strangeFamiliars"),
    ("10.1145/3654777.3676375", "worldscribe"),
    ("10.1145/3663548.3675599", "editscribe"),
    ("10.1145/3663548.3675617", "audioDescriptionCustomization"),
    ("10.1145/3643834.3661556", "soundshift"),
    ("10.1145/3677846.3677861", "imageExplorer"),
    ("10.14722/usec.2024.23035", "advCaptcha"),
    ("10.1145/3544548.3580684", "laserCutStudy"),
    ("10.1145/3526113.3545613", "omniscribe"),
    ("10.1145/3562939.3565609", "puppeteer"),
    ("10.1145/3472749.3474754", "daedalus"),
    ("10.1145/3411764.3445690", "accessibleCircuits"),
    ("10.1145/3313831.3376505", "glissade"),
    ("10.1145/3313831.3376501", "smartHomeRoutine"),
    ("10.1145/3385959.3418457", "tango"),
    ("10.1145/3332165.3347898", "masque"),
]

# Entries with no DOI/arXiv to negotiate — provided by hand.
MANUAL = {
    "ieee:11180930": "\n".join([
        "@article{Yen_2025,",
        "  title = {Strange Familiars: Exploring the Design of Avatars and Virtual "
        "Environments for Reconnecting Dormant Ties in Virtual Reality},",
        "  author = {Yen, Yu-Ting and Liao, Fang-Ying and Yang, Chi-Lan and "
        "Chang, Ruei-Che and Cherng, Fu-Yin and Chen, Bing-Yu},",
        "  journal = {IEEE Transactions on Visualization and Computer Graphics},",
        "  year = {2025},",
        "  publisher = {IEEE}",
        "}",
    ]),
}


def fetch_bibtex(doi):
    url = "https://doi.org/" + doi
    req = urllib.request.Request(url, headers={
        "Accept": "application/x-bibtex; charset=utf-8",
        "User-Agent": "Mozilla/5.0 (bib-fetch)",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace").strip()


def split_fields(body):
    """Split top-level comma-separated fields, respecting {} nesting."""
    fields, depth, buf = [], 0, ""
    for ch in body:
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        if ch == "," and depth == 0:
            fields.append(buf)
            buf = ""
        else:
            buf += ch
    if buf.strip():
        fields.append(buf)
    return fields


def reformat(bibtex):
    """Turn single-line Crossref bibtex into readable multi-line form."""
    bibtex = bibtex.strip()
    m = re.match(r"^@(\w+)\s*\{\s*(.*)\s*\}\s*$", bibtex, re.DOTALL)
    if not m:
        return bibtex
    entrytype, inner = m.group(1), m.group(2)
    parts = split_fields(inner)
    if not parts:
        return bibtex
    citekey = parts[0].strip()
    lines = ["@%s{%s," % (entrytype.lower(), citekey)]
    field_lines = []
    for p in parts[1:]:
        p = p.strip()
        if not p or "=" not in p:
            continue
        name, val = p.split("=", 1)
        field_lines.append("  %s = %s" % (name.strip(), val.strip()))
    lines.append(",\n".join(field_lines))
    lines.append("}")
    return "\n".join(lines)


def override_citekey(bibtex, newkey):
    return re.sub(r"^(@\w+\{)[^,]*,", r"\g<1>%s," % newkey, bibtex, count=1)


def main():
    result = {}
    for key, doi in list(DOI.items()) + list(ARXIV.items()):
        try:
            raw = fetch_bibtex(doi)
            entry = reformat(raw)
            if key in CITEKEY:
                entry = override_citekey(entry, CITEKEY[key])
            result[key] = entry
            print("OK  ", key)
        except Exception as e:  # noqa
            print("FAIL", key, e)
        time.sleep(0.5)

    result.update(MANUAL)

    def esc(s):
        return s.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")

    lines = [
        "/* Per-paper BibTeX. Each paper has a variable named after the project "
        "\u2014 find",
        "   it by name (e.g. `touchscribe`) and paste the BibTeX between the "
        "backticks",
        "   ` ... ` exactly as copied from ACM (multi-line is fine, no escaping "
        "needed).",
        "",
        "   The BIBTEX map at the bottom links each variable to the paper "
        "identifier",
        "   (its DOI, or `arxiv:<id>` / `ieee:<id>`) so pubs.js can attach the "
        "chip. */",
        "",
    ]
    for key, name in NAMES:
        if key not in result:
            print("WARN missing entry for", key)
            continue
        lines.append("const %s = `%s`;" % (name, esc(result[key])))
        lines.append("")

    lines.append("window.BIBTEX = {")
    rows = [(k, n) for k, n in NAMES if k in result]
    for i, (key, name) in enumerate(rows):
        comma = "," if i < len(rows) - 1 else ""
        lines.append("  %s: %s%s" % (json.dumps(key), name, comma))
    lines.append("};")

    with open("js/bib.js", "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("\nWrote js/bib.js with %d entries" % len(rows))


if __name__ == "__main__":
    main()
