"""The same checked-in dialogue script is consumed by the game and speech server."""
import json
from .config import ROOT

def authored_lines() -> dict[str,str]:
    script=json.loads((ROOT/'shared'/'mission-script.json').read_text())
    return {line['text']:line['speaker'] for line in script.values()}
