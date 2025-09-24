import pathlib

mapping = {
    "\\u00C3\\u0081": "\\u00C1",
    "\\u00C3\\u0089": "\\u00C9",
    "\\u00C3\\u008D": "\\u00CD",
    "\\u00C3\\u0093": "\\u00D3",
    "\\u00C3\\u009A": "\\u00DA",
    "\\u00C3\\u00A1": "\\u00E1",
    "\\u00C3\\u00A2": "\\u00E2",
    "\\u00C3\\u00A3": "\\u00E3",
    "\\u00C3\\u00A4": "\\u00E4",
    "\\u00C3\\u00A7": "\\u00E7",
    "\\u00C3\\u00A9": "\\u00E9",
    "\\u00C3\\u00AA": "\\u00EA",
    "\\u00C3\\u00AD": "\\u00ED",
    "\\u00C3\\u00B3": "\\u00F3",
    "\\u00C3\\u00B4": "\\u00F4",
    "\\u00C3\\u00B5": "\\u00F5",
    "\\u00C3\\u00BA": "\\u00FA",
    "\\u00C3\\u00BC": "\\u00FC",
    "\\u00C3\\u00B1": "\\u00F1",
    "\\u00C2\\u00BA": "\\u00BA",
    "\\u00C2\\u00B0": "\\u00B0",
    "\\u00C2\\u00B4": "\\u00B4",
    "\\u00C2\\u00A0": " ",
}

def fix_text(text: str) -> str:
    for old, new in mapping.items():
        text = text.replace(old, new)
    return text

for path in pathlib.Path('.').rglob('*.ts'):
    text = path.read_text(encoding='utf-8')
    new_text = fix_text(text)
    path.write_text(new_text, encoding='utf-8')

for path in pathlib.Path('.').rglob('*.tsx'):
    text = path.read_text(encoding='utf-8')
    new_text = fix_text(text)
    path.write_text(new_text, encoding='utf-8')
