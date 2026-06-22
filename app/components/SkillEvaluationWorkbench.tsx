"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { EvaluatorPublic } from "../lib/evaluator-data";
import type { SkillEvaluationLabel } from "../lib/evaluation-store";
import {
  EVALUATION_LABELS,
  SCORE_LABELS,
  SCORE_VALUES,
} from "../lib/evaluation-constants";
import styles from "./SkillEvaluationWorkbench.module.css";

export interface SkillSummary {
  skillId: string;
  domain: string;
  label: string;
  proficiency: number;
  roles: string[];
}

interface DomainSummary {
  key: string;
  name: string;
  color: string;
}

interface SkillEvaluationWorkbenchProps {
  evaluator: EvaluatorPublic;
  skills: SkillSummary[];
  domains: DomainSummary[];
  initialLabels: SkillEvaluationLabel[];
}

const ROLE_LABELS: Record<string, string> = {
  operator: "운전원",
  engineer: "엔지니어",
  developer: "개발자",
};

export default function SkillEvaluationWorkbench({
  evaluator,
  skills,
  domains,
  initialLabels,
}: SkillEvaluationWorkbenchProps) {
  const router = useRouter();
  const [labels, setLabels] = useState<SkillEvaluationLabel[]>(initialLabels);
  const [domainFilter, setDomainFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [onlyUnevaluated, setOnlyUnevaluated] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  const [score, setScore] = useState(0);
  const [chosenLabels, setChosenLabels] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const domainMap = useMemo(() => {
    const map: Record<string, DomainSummary> = {};
    domains.forEach((domain) => {
      map[domain.key] = domain;
    });
    return map;
  }, [domains]);

  const mySkillIds = useMemo(() => {
    const set = new Set<string>();
    labels.forEach((label) => {
      if (label.evaluatorId === evaluator.id) {
        set.add(label.skillId);
      }
    });
    return set;
  }, [labels, evaluator.id]);

  const filteredSkills = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return skills.filter((skill) => {
      if (domainFilter !== "all" && skill.domain !== domainFilter) {
        return false;
      }
      if (roleFilter !== "all" && !skill.roles.includes(roleFilter)) {
        return false;
      }
      if (onlyUnevaluated && mySkillIds.has(skill.skillId)) {
        return false;
      }
      if (
        normalizedQuery &&
        !skill.label.toLowerCase().includes(normalizedQuery) &&
        !skill.skillId.toLowerCase().includes(normalizedQuery)
      ) {
        return false;
      }
      return true;
    });
  }, [skills, domainFilter, roleFilter, onlyUnevaluated, mySkillIds, query]);

  const myEvaluatedInFilter = filteredSkills.filter((skill) =>
    mySkillIds.has(skill.skillId),
  ).length;
  const progressPercent = filteredSkills.length
    ? Math.round((myEvaluatedInFilter / filteredSkills.length) * 100)
    : 0;

  const selectedSkill = selectedSkillId
    ? skills.find((skill) => skill.skillId === selectedSkillId) ?? null
    : null;
  const selectedSkillLabels = selectedSkillId
    ? labels.filter((label) => label.skillId === selectedSkillId)
    : [];

  function selectSkill(skillId: string) {
    setSelectedSkillId(skillId);
    setScore(0);
    setChosenLabels([]);
    setNotes("");
    setMessage("");
  }

  function toggleLabel(label: string) {
    setChosenLabels((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label],
    );
    setMessage("");
  }

  function advanceToNextUnevaluated(evaluatedSkillId: string) {
    const next = filteredSkills.find(
      (skill) =>
        skill.skillId !== evaluatedSkillId && !mySkillIds.has(skill.skillId),
    );
    if (next) {
      selectSkill(next.skillId);
    } else {
      setSelectedSkillId(null);
    }
  }

  async function handleSubmit() {
    if (!selectedSkill) {
      return;
    }
    if (!score) {
      setMessage("중요도를 선택해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/skill-evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: selectedSkill.skillId,
          score,
          labels: chosenLabels,
          notes,
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setMessage(data.error ?? "평가를 저장하지 못했습니다.");
        return;
      }
      const data = (await response.json()) as { label: SkillEvaluationLabel };
      setLabels((prev) => [data.label, ...prev]);
      setMessage("평가를 저장했습니다.");
      advanceToNextUnevaluated(selectedSkill.skillId);
    } catch {
      setMessage("네트워크 오류로 저장하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.refresh();
  }

  return (
    <section className={styles.workbench}>
      <div className={styles.statusBar}>
        <div className={styles.identity}>
          <span className={styles.identityName}>{evaluator.name}</span>
          <span className={styles.identityMeta}>
            {evaluator.department} · {evaluator.collegeId}
          </span>
        </div>
        <div className={styles.progress}>
          <div className={styles.progressText}>
            현재 조건 {myEvaluatedInFilter}/{filteredSkills.length} 평가 완료 ·
            전체 {mySkillIds.size}건
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <button
          className={styles.logoutButton}
          onClick={handleLogout}
          type="button"
        >
          로그아웃
        </button>
      </div>

      <div className={styles.toolbar}>
        <label>
          도메인
          <select
            onChange={(event) => setDomainFilter(event.target.value)}
            value={domainFilter}
          >
            <option value="all">전체</option>
            {domains.map((domain) => (
              <option key={domain.key} value={domain.key}>
                {domain.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          역할
          <select
            onChange={(event) => setRoleFilter(event.target.value)}
            value={roleFilter}
          >
            <option value="all">전체</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.searchField}>
          검색
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="스킬명 또는 ID"
            value={query}
          />
        </label>
        <label className={styles.checkboxField}>
          <input
            checked={onlyUnevaluated}
            onChange={(event) => setOnlyUnevaluated(event.target.checked)}
            type="checkbox"
          />
          내 미평가만
        </label>
      </div>

      <div className={styles.layout}>
        <div className={styles.skillList}>
          {filteredSkills.length === 0 ? (
            <p className={styles.empty}>조건에 맞는 스킬이 없습니다.</p>
          ) : (
            filteredSkills.map((skill) => {
              const domain = domainMap[skill.domain];
              const evaluatedByMe = mySkillIds.has(skill.skillId);
              return (
                <button
                  className={
                    selectedSkillId === skill.skillId
                      ? `${styles.skillItem} ${styles.skillItemActive}`
                      : styles.skillItem
                  }
                  key={skill.skillId}
                  onClick={() => selectSkill(skill.skillId)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className={styles.domainDot}
                    style={{ background: domain?.color ?? "#94a3b8" }}
                  />
                  <span className={styles.skillItemBody}>
                    <span className={styles.skillItemLabel}>{skill.label}</span>
                    <span className={styles.skillItemMeta}>
                      {domain?.name ?? skill.domain} · Lv{skill.proficiency}
                    </span>
                  </span>
                  {evaluatedByMe && (
                    <span className={styles.evaluatedBadge}>평가됨</span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className={styles.detailPanel}>
          {!selectedSkill ? (
            <p className={styles.empty}>
              왼쪽에서 평가할 스킬을 선택해 주세요.
            </p>
          ) : (
            <>
              <div className={styles.detailHeader}>
                <p className={styles.detailDomain}>
                  {domainMap[selectedSkill.domain]?.name ?? selectedSkill.domain}
                </p>
                <h3>{selectedSkill.label}</h3>
                <p className={styles.detailId}>
                  {selectedSkill.skillId} ·{" "}
                  {selectedSkill.roles
                    .map((role) => ROLE_LABELS[role] ?? role)
                    .join(", ")}
                </p>
              </div>

              <fieldset className={styles.scoreFieldset}>
                <legend>중요도</legend>
                <div className={styles.scoreOptions}>
                  {SCORE_VALUES.map((value) => (
                    <button
                      aria-pressed={score === value}
                      className={
                        score === value
                          ? `${styles.scoreButton} ${styles.scoreButtonActive}`
                          : styles.scoreButton
                      }
                      key={value}
                      onClick={() => {
                        setScore(value);
                        setMessage("");
                      }}
                      type="button"
                    >
                      <strong>{value}</strong>
                      <span>{SCORE_LABELS[value]}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className={styles.labelFieldset}>
                <legend>라벨 (다중 선택)</legend>
                <div className={styles.labelOptions}>
                  {EVALUATION_LABELS.map((label) => (
                    <button
                      aria-pressed={chosenLabels.includes(label)}
                      className={
                        chosenLabels.includes(label)
                          ? `${styles.labelChip} ${styles.labelChipActive}`
                          : styles.labelChip
                      }
                      key={label}
                      onClick={() => toggleLabel(label)}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className={styles.notesField}>
                평가 근거 <span>선택</span>
                <textarea
                  onChange={(event) => {
                    setNotes(event.target.value);
                    setMessage("");
                  }}
                  placeholder="왜 이 점수/라벨인지 현장 근거를 남겨 주세요."
                  rows={3}
                  value={notes}
                />
              </label>

              <button
                className={styles.saveButton}
                disabled={submitting}
                onClick={handleSubmit}
                type="button"
              >
                {submitting ? "저장 중..." : "평가 저장 후 다음 스킬"}
              </button>

              {message && (
                <p aria-live="polite" className={styles.message}>
                  {message}
                </p>
              )}

              <div className={styles.existingLabels}>
                <h4>이 스킬의 평가 ({selectedSkillLabels.length}건)</h4>
                {selectedSkillLabels.length === 0 ? (
                  <p className={styles.empty}>아직 평가가 없습니다.</p>
                ) : (
                  <ul>
                    {selectedSkillLabels.map((label) => (
                      <li key={label.id}>
                        <strong>{label.score}점</strong> · {label.evaluatorName}
                        {label.labels.length > 0 && (
                          <span className={styles.labelTags}>
                            {label.labels.join(", ")}
                          </span>
                        )}
                        {label.notes && <p>{label.notes}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
