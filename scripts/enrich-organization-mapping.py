#!/usr/bin/env python3
"""조직 역량 카탈로그에 내부 URI와 기준 온톨로지 연결을 반복 적용한다."""

import json
import re
from pathlib import Path

DATA_PATH = Path(__file__).parent.parent / "public/data/organizations/robot-solution.json"
ESCO_UUID_URI = re.compile(
    r"^https?://data\.europa\.eu/esco/skill/"
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

# 조직의 세부 역량과 공통 온톨로지의 범위가 다르므로, 의미가 충분히 겹치는 항목만 연결한다.
ONTOLOGY_MAPPINGS = {
    "RS_009": ("RSF-IRC-007", "exact"),
    "RS_010": ("RSF-IRC-009", "approximate"),
    "RS_011": ("RSF-IRC-002", "approximate"),
    "RS_016": ("RSF-MVS-011", "approximate"),
    "RS_017": ("RSF-IRC-008", "exact"),
    "RS_018": ("RSF-IRC-008", "exact"),
    "RS_019": ("RSF-IRC-001", "exact"),
    "RS_022": ("RSF-MVS-004", "approximate"),
    "RS_023": ("RSF-MVS-011", "exact"),
    "RS_024": ("RSF-MVS-009", "approximate"),
    "RS_025": ("RSF-MVS-004", "approximate"),
    "RS_035": ("RSF-MVS-007", "approximate"),
    "RS_036": ("RSF-RMD-007", "approximate"),
    "RS_039": ("RSF-MVS-007", "approximate"),
    "RS_042": ("RSF-DTS-005", "approximate"),
}


def enrich_skill(skill: dict) -> None:
    skill_id = skill["skill_id"]
    skill["internal_uri"] = f"urn:rsf:org-skill:{skill_id.lower()}"

    # UUID로 확인되지 않은 ESCO 주소는 출처처럼 보이는 임시 문자열이므로 제거한다.
    if skill.get("esco_uri") and not ESCO_UUID_URI.fullmatch(skill["esco_uri"]):
        skill["esco_uri"] = None

    mapping = ONTOLOGY_MAPPINGS.get(skill_id)
    skill["ontology_skill_id"] = mapping[0] if mapping else None
    skill["ontology_match_type"] = mapping[1] if mapping else "none"


def main() -> None:
    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    for enabler in data["enablers"]:
        for skill in enabler["skills"]:
            enrich_skill(skill)
    DATA_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"조직 역량 매핑 보정 완료: {DATA_PATH}")


if __name__ == "__main__":
    main()
