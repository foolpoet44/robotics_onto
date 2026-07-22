"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
  college: string | null;
}

interface DomainSummary {
  key: string;
  name: string;
  color: string;
}

interface CollegeSummary {
  id: string;
  name: string;
}

interface SkillEvaluationWorkbenchProps {
  evaluator: EvaluatorPublic;
  skills: SkillSummary[];
  domains: DomainSummary[];
  colleges: CollegeSummary[];
  initialLabels: SkillEvaluationLabel[];
}

const ROLE_LABELS: Record<string, string> = {
  operator: "운전원",
  engineer: "엔지니어",
  developer: "개발자",
};

type Step = 1 | 2 | 3;

const STEPS: { id: Step; title: string }[] = [
  { id: 1, title: "평가할 스킬 선택" },
  { id: 2, title: "선택 스킬 평가" },
  { id: 3, title: "내 평가 현황" },
];

export default function SkillEvaluationWorkbench({
  evaluator,
  skills,
  domains,
  colleges,
  initialLabels,
}: SkillEvaluationWorkbenchProps) {
  const router = useRouter();
  const [labels, setLabels] = useState<SkillEvaluationLabel[]>(initialLabels);
  const [step, setStep] = useState<Step>(1);
  // 평가자 소속 칼리지를 기본 큐로 보여준다. 명부의 collegeId가
  // 칼리지 목록에 없으면 전체로 폴백한다.
  const [collegeFilter, setCollegeFilter] = useState(() =>
    colleges.some((college) => college.id === evaluator.collegeId)
      ? evaluator.collegeId
      : "all",
  );
  const [domainFilter, setDomainFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [onlyUnevaluated, setOnlyUnevaluated] = useState(false);
  const [pickedSkillIds, setPickedSkillIds] = useState<Set<string>>(
    () => new Set(),
  );
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

  const skillMap = useMemo(() => {
    const map: Record<string, SkillSummary> = {};
    skills.forEach((skill) => {
      map[skill.skillId] = skill;
    });
    return map;
  }, [skills]);

  const mySkillIds = useMemo(() => {
    const set = new Set<string>();
    labels.forEach((label) => {
      if (label.evaluatorId === evaluator.id) {
        set.add(label.skillId);
      }
    });
    return set;
  }, [labels, evaluator.id]);

  const collegeMap = useMemo(() => {
    const map: Record<string, CollegeSummary> = {};
    colleges.forEach((college) => {
      map[college.id] = college;
    });
    return map;
  }, [colleges]);

  // 1단계: 필터가 적용된 전체 스킬 목록(선택 대상)
  const filteredSkills = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return skills.filter((skill) => {
      if (collegeFilter !== "all" && skill.college !== collegeFilter) {
        return false;
      }
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
  }, [
    skills,
    collegeFilter,
    domainFilter,
    roleFilter,
    onlyUnevaluated,
    mySkillIds,
    query,
  ]);

  // 2단계: 내가 선택한 스킬만(원본 순서 유지)
  const pickedSkills = useMemo(
    () => skills.filter((skill) => pickedSkillIds.has(skill.skillId)),
    [skills, pickedSkillIds],
  );

  const pickedEvaluatedCount = pickedSkills.filter((skill) =>
    mySkillIds.has(skill.skillId),
  ).length;
  const pickedProgress = pickedSkills.length
    ? Math.round((pickedEvaluatedCount / pickedSkills.length) * 100)
    : 0;

  // 3단계: 내가 평가한 모든 기록(최신순)
  const myEvaluations = useMemo(
    () =>
      labels
        .filter((label) => label.evaluatorId === evaluator.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [labels, evaluator.id],
  );
  const averageScore = myEvaluations.length
    ? (
        myEvaluations.reduce((sum, label) => sum + label.score, 0) /
        myEvaluations.length
      ).toFixed(1)
    : "-";

  const selectedSkill = selectedSkillId
    ? skillMap[selectedSkillId] ?? null
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

  function togglePicked(skillId: string) {
    setPickedSkillIds((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
      }
      return next;
    });
  }

  function clearPicked() {
    setPickedSkillIds(new Set());
  }

  function firstUnevaluatedPicked(): string | null {
    const next = pickedSkills.find((skill) => !mySkillIds.has(skill.skillId));
    return next?.skillId ?? pickedSkills[0]?.skillId ?? null;
  }

  function goToSelect() {
    setStep(1);
  }

  function goToEvaluate() {
    if (pickedSkillIds.size === 0) {
      return;
    }
    setStep(2);
    if (!selectedSkillId || !pickedSkillIds.has(selectedSkillId)) {
      const next = firstUnevaluatedPicked();
      if (next) {
        selectSkill(next);
      } else {
        setSelectedSkillId(null);
      }
    }
  }

  function goToStatus() {
    setStep(3);
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
    const next = pickedSkills.find(
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
            선택 {pickedSkillIds.size}개 · 선택 스킬 평가{" "}
            {pickedEvaluatedCount}/{pickedSkills.length} · 내 전체 평가{" "}
            {mySkillIds.size}건
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${pickedProgress}%` }}
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

      <ol className={styles.stepper}>
        {STEPS.map((item) => {
          const state =
            step === item.id
              ? styles.stepActive
              : step > item.id
                ? styles.stepDone
                : "";
          const disabled = item.id === 2 && pickedSkillIds.size === 0;
          return (
            <li className={`${styles.step} ${state}`} key={item.id}>
              <button
                className={styles.stepButton}
                disabled={disabled}
                onClick={() => {
                  if (item.id === 1) goToSelect();
                  else if (item.id === 2) goToEvaluate();
                  else goToStatus();
                }}
                type="button"
              >
                <span className={styles.stepNumber}>{item.id}</span>
                <span className={styles.stepTitle}>{item.title}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <>
          <div className={styles.toolbar}>
            <label>
              3대 도메인
              <select
                onChange={(event) => setCollegeFilter(event.target.value)}
                value={collegeFilter}
              >
                <option value="all">전체</option>
                {colleges.map((college) => (
                  <option key={college.id} value={college.id}>
                    {college.name}
                    {college.id === evaluator.collegeId ? " (내 소속)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              기능 도메인
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
            {pickedSkillIds.size > 0 && (
              <button
                className={styles.clearPickedButton}
                onClick={clearPicked}
                type="button"
              >
                선택 해제
              </button>
            )}
          </div>

          <div className={styles.selectPanel}>
            <div className={styles.skillList}>
              {filteredSkills.length === 0 ? (
                <p className={styles.empty}>조건에 맞는 스킬이 없습니다.</p>
              ) : (
                filteredSkills.map((skill) => {
                  const domain = domainMap[skill.domain];
                  const evaluatedByMe = mySkillIds.has(skill.skillId);
                  const picked = pickedSkillIds.has(skill.skillId);
                  return (
                    <label
                      className={
                        picked
                          ? `${styles.skillItem} ${styles.skillItemActive}`
                          : styles.skillItem
                      }
                      key={skill.skillId}
                    >
                      <input
                        checked={picked}
                        className={styles.skillCheckbox}
                        onChange={() => togglePicked(skill.skillId)}
                        type="checkbox"
                      />
                      <span
                        aria-hidden="true"
                        className={styles.domainDot}
                        style={{ background: domain?.color ?? "#94a3b8" }}
                      />
                      <span className={styles.skillItemBody}>
                        <span className={styles.skillItemLabel}>
                          {skill.label}
                        </span>
                        <span className={styles.skillItemMeta}>
                          {(skill.college && collegeMap[skill.college]?.name) ??
                            "미배정"}{" "}
                          · {domain?.name ?? skill.domain} · Lv
                          {skill.proficiency}
                        </span>
                      </span>
                      <Link
                        className={styles.rowDetailLink}
                        href={`/skills/${skill.skillId}`}
                        onClick={(event) => event.stopPropagation()}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        상세 ↗
                      </Link>
                      {evaluatedByMe && (
                        <span className={styles.evaluatedBadge}>평가됨</span>
                      )}
                    </label>
                  );
                })
              )}
            </div>

            <div className={styles.stepFooter}>
              <span className={styles.stepFooterText}>
                {pickedSkillIds.size}개 스킬 선택됨
              </span>
              <button
                className={styles.primaryButton}
                disabled={pickedSkillIds.size === 0}
                onClick={goToEvaluate}
                type="button"
              >
                선택한 스킬 평가하기 →
              </button>
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <div className={styles.layout}>
          <div className={styles.skillList}>
            {pickedSkills.length === 0 ? (
              <div className={styles.emptyBlock}>
                <p className={styles.empty}>선택한 스킬이 없습니다.</p>
                <button
                  className={styles.secondaryButton}
                  onClick={goToSelect}
                  type="button"
                >
                  ← 스킬 선택으로
                </button>
              </div>
            ) : (
              pickedSkills.map((skill) => {
                const domain = domainMap[skill.domain];
                const evaluatedByMe = mySkillIds.has(skill.skillId);
                return (
                  <div
                    className={
                      selectedSkillId === skill.skillId
                        ? `${styles.skillItem} ${styles.skillItemActive}`
                        : styles.skillItem
                    }
                    key={skill.skillId}
                  >
                    <button
                      className={styles.skillSelectButton}
                      onClick={() => selectSkill(skill.skillId)}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className={styles.domainDot}
                        style={{ background: domain?.color ?? "#94a3b8" }}
                      />
                      <span className={styles.skillItemBody}>
                        <span className={styles.skillItemLabel}>
                          {skill.label}
                        </span>
                        <span className={styles.skillItemMeta}>
                          {(skill.college && collegeMap[skill.college]?.name) ??
                            "미배정"}{" "}
                          · {domain?.name ?? skill.domain} · Lv
                          {skill.proficiency}
                        </span>
                      </span>
                      {evaluatedByMe && (
                        <span className={styles.evaluatedBadge}>평가됨</span>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className={styles.detailPanel}>
            <div className={styles.panelActions}>
              <button
                className={styles.secondaryButton}
                onClick={goToSelect}
                type="button"
              >
                ← 스킬 선택 수정
              </button>
              <button
                className={styles.secondaryButton}
                onClick={goToStatus}
                type="button"
              >
                내 평가 현황 →
              </button>
            </div>

            {!selectedSkill ? (
              <p className={styles.empty}>
                {pickedEvaluatedCount === pickedSkills.length &&
                pickedSkills.length > 0
                  ? "선택한 스킬을 모두 평가했습니다. 현황을 확인해 보세요."
                  : "왼쪽에서 평가할 스킬을 선택해 주세요."}
              </p>
            ) : (
              <>
                <div className={styles.detailHeader}>
                  <div className={styles.detailHeaderTop}>
                    <p className={styles.detailDomain}>
                      {selectedSkill.college &&
                        collegeMap[selectedSkill.college] &&
                        `${collegeMap[selectedSkill.college].name} / `}
                      {domainMap[selectedSkill.domain]?.name ??
                        selectedSkill.domain}
                    </p>
                    <Link
                      className={styles.detailLink}
                      href={`/skills/${selectedSkill.skillId}`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      상세 설명 보기 ↗
                    </Link>
                  </div>
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
                          <strong>{label.score}점</strong> ·{" "}
                          {label.evaluatorName}
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
      )}

      {step === 3 && (
        <div className={styles.statusPanel}>
          <div className={styles.statusSummary}>
            <div className={styles.statusStat}>
              <span className={styles.statValue}>{myEvaluations.length}</span>
              <span className={styles.statLabel}>내 평가 건수</span>
            </div>
            <div className={styles.statusStat}>
              <span className={styles.statValue}>{averageScore}</span>
              <span className={styles.statLabel}>평균 중요도</span>
            </div>
            <div className={styles.statusStat}>
              <span className={styles.statValue}>
                {pickedEvaluatedCount}/{pickedSkills.length || "-"}
              </span>
              <span className={styles.statLabel}>선택분 진행</span>
            </div>
            <div className={styles.statusActions}>
              <button
                className={styles.secondaryButton}
                onClick={goToSelect}
                type="button"
              >
                ← 스킬 선택
              </button>
              <button
                className={styles.primaryButton}
                disabled={pickedSkillIds.size === 0}
                onClick={goToEvaluate}
                type="button"
              >
                이어서 평가하기 →
              </button>
            </div>
          </div>

          {myEvaluations.length === 0 ? (
            <p className={styles.empty}>아직 평가한 스킬이 없습니다.</p>
          ) : (
            <ul className={styles.statusList}>
              {myEvaluations.map((label) => {
                const skill = skillMap[label.skillId];
                const domain = domainMap[label.domain];
                return (
                  <li className={styles.statusCard} key={label.id}>
                    <div className={styles.statusCardHead}>
                      <span
                        aria-hidden="true"
                        className={styles.domainDot}
                        style={{ background: domain?.color ?? "#94a3b8" }}
                      />
                      <div className={styles.statusCardTitle}>
                        <span className={styles.skillItemLabel}>
                          {skill?.label ?? label.skillId}
                        </span>
                        <span className={styles.skillItemMeta}>
                          {label.skillId} · {domain?.name ?? label.domain}
                        </span>
                      </div>
                      <span className={styles.statusScore}>{label.score}점</span>
                      <Link
                        className={styles.rowDetailLink}
                        href={`/skills/${label.skillId}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        상세 ↗
                      </Link>
                    </div>
                    {label.labels.length > 0 && (
                      <div className={styles.statusTags}>
                        {label.labels.map((tag) => (
                          <span className={styles.statusTag} key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {label.notes && (
                      <p className={styles.statusNotes}>{label.notes}</p>
                    )}
                    <p className={styles.statusTime}>
                      {new Date(label.createdAt).toLocaleString("ko-KR")}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
