"""Schéma : génération déterministe et validation d'une graine minimale."""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import gen_ts  # noqa: E402
from seed.schema import Graine  # noqa: E402

FIXTURE = Path(__file__).parent / "graine_exemple.json"


def test_generation_deterministe():
    a, b = gen_ts.generate(), gen_ts.generate()
    assert a == b
    assert "export function parseGraine" in a[1]


@pytest.mark.skipif(not FIXTURE.exists(), reason="exemple de graine non généré")
def test_exemple_valide():
    Graine.model_validate(json.loads(FIXTURE.read_text()))


def test_champ_inconnu_refuse():
    if not FIXTURE.exists():
        pytest.skip("exemple de graine non généré")
    g = json.loads(FIXTURE.read_text())
    g["meta"]["champ_pirate"] = 1
    with pytest.raises(Exception):
        Graine.model_validate(g)
