import pathlib
import re

u_braced = re.compile(r"\\u\{([0-9a-fA-F]+)\}")
u_simple = re.compile(r"\\u([0-9a-fA-F]{4})")

def decode_unicode_escapes(text: str) -> str:
    def repl_braced(match):
        return chr(int(match.group(1), 16))
    def repl_simple(match):
        return chr(int(match.group(1), 16))
    text = u_braced.sub(repl_braced, text)
    text = u_simple.sub(repl_simple, text)
    return text

for path in list(pathlib.Path('.').rglob('*.ts')) + list(pathlib.Path('.').rglob('*.tsx')):
    raw = path.read_text(encoding='utf-8')
    cleaned = raw.replace('\ufeff', '')
    decoded = decode_unicode_escapes(cleaned)
    if decoded != raw:
        path.write_text(decoded, encoding='utf-8')
