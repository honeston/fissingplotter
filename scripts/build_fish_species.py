#!/usr/bin/env python3
"""JAF リストと別名定義から src/lib/fish-species.json を生成する。"""

from __future__ import annotations

import json
import re
import sys
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ALIASES_PATH = Path(__file__).resolve().parent / 'data' / 'fish-species-aliases.json'
OUTPUT_PATH = ROOT / 'src' / 'lib' / 'fish-species.json'
JAF_URL = 'https://www.museum.kagoshima-u.ac.jp/staff/motomura/20260724_JAFList.xlsx'
JAF_CACHE = Path('/tmp/jaf.xlsx')


def download_jaf() -> None:
    if JAF_CACHE.exists() and JAF_CACHE.stat().st_size > 100_000:
        return
    print(f'Downloading JAF list from {JAF_URL}...')
    with urllib.request.urlopen(JAF_URL, timeout=120) as res:
        JAF_CACHE.write_bytes(res.read())


def parse_jaf_names() -> list[str]:
    shared: list[str] = []
    with zipfile.ZipFile(JAF_CACHE) as zf:
        ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        shared_root = ET.fromstring(zf.read('xl/sharedStrings.xml'))
        for si in shared_root.findall('m:si', ns):
            shared.append(''.join((t.text or '') for t in si.findall('.//m:t', ns)))

        sheet = ET.fromstring(zf.read('xl/worksheets/sheet1.xml'))
        names: list[str] = []
        for row in sheet.findall('m:sheetData/m:row', ns)[1:]:
            vals: list[str] = []
            for cell in row.findall('m:c', ns):
                value = cell.find('m:v', ns)
                if value is None:
                    vals.append('')
                elif cell.get('t') == 's':
                    vals.append(shared[int(value.text)])
                else:
                    vals.append(value.text or '')
            if len(vals) <= 5:
                continue
            ja = vals[5].split('\n')[0].strip()
            if not ja or '和名なし' in ja:
                continue
            names.append(ja)
    return names


def normalize_alias(value: str) -> str:
    value = value.strip()
    value = re.sub(r'（.*?）', '', value)
    value = re.sub(r'\(.*?\)', '', value)
    return value.strip()


def load_alias_groups() -> tuple[list[dict], list[str]]:
    raw = json.loads(ALIASES_PATH.read_text(encoding='utf-8'))
    groups: list[dict] = []
    popular: list[str] = raw.get('popular', [])
    for item in raw.get('groups', []):
        name = item['name'].strip()
        aliases = []
        for alias in item.get('aliases', []):
            cleaned = normalize_alias(alias)
            if cleaned and cleaned != name:
                aliases.append(cleaned)
        groups.append({'name': name, 'aliases': sorted(set(aliases))})
    return groups, popular


def build_species_list() -> list[dict]:
    jaf_names = parse_jaf_names()
    alias_groups, popular = load_alias_groups()

    by_name: dict[str, dict] = {}
    for name in jaf_names:
        by_name[name] = {'name': name}

    for group in alias_groups:
        name = group['name']
        entry = by_name.setdefault(name, {'name': name})
        existing = set(entry.get('aliases', []))
        for alias in group['aliases']:
            if alias != name:
                existing.add(alias)
        if existing:
            entry['aliases'] = sorted(existing)

    def sort_key(entry: dict) -> tuple[int, str]:
        name = entry['name']
        if name in popular:
            return (popular.index(name), name)
        return (len(popular), name)

    result = sorted(by_name.values(), key=sort_key)
    return result


def main() -> int:
    download_jaf()
    species = build_species_list()
    OUTPUT_PATH.write_text(
        json.dumps(species, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8',
    )
    with_aliases = sum(1 for s in species if s.get('aliases'))
    print(f'Wrote {len(species)} species ({with_aliases} with aliases) to {OUTPUT_PATH}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
