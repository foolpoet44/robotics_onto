"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { COLLEGE_DOMAIN_MAPPING, COLLEGES } from "../lib/college-data";
import type { College, CollegeId } from "../lib/college-types";
import styles from "./SkillImportanceRating.module.css";

interface SkillImportanceRatingProps {
  skillId: string;
  defaultDomain: string;
}

interface ImportanceRating {
  id: string;
  expertName: string;
  expertDomain: CollegeId;
  score: number;
  notes: string;
  createdAt: string;
}

interface MissingSkillProposal {
  id: string;
  expertName: string;
  expertDomain: CollegeId;
  skillName: string;
  fieldNeed: string;
  createdAt: string;
}

const SCORE_LABELS = {
  1: "낮음",
  2: "보통 이하",
  3: "보통",
  4: "높음",
  5: "매우 높음",
};

function getStorageKey(skillId: string) {
  return `factory-robotics-skillmap:importance-ratings:${skillId}`;
}

function getMissingSkillStorageKey(skillId: string) {
  return `factory-robotics-skillmap:missing-skill-proposals:${skillId}`;
}

const EXPERT_DOMAIN_ORDER: CollegeId[] = [
  "physical-ai",
  "agentic-ai",
  "digital-twin",
  "data-intelligence",
];

const EXPERT_DOMAINS = EXPERT_DOMAIN_ORDER.map((collegeId) =>
  COLLEGES.find((college) => college.id === collegeId),
).filter((college): college is College => Boolean(college));

function resolveDefaultExpertDomain(domainKey: string): CollegeId {
  return COLLEGE_DOMAIN_MAPPING[domainKey]?.primary ?? "physical-ai";
}

function loadRatings(skillId: string): ImportanceRating[] {
  try {
    const savedRatings = window.localStorage.getItem(getStorageKey(skillId));
    return savedRatings ? (JSON.parse(savedRatings) as ImportanceRating[]) : [];
  } catch {
    return [];
  }
}

function loadMissingSkillProposals(skillId: string): MissingSkillProposal[] {
  try {
    const savedProposals = window.localStorage.getItem(
      getMissingSkillStorageKey(skillId),
    );
    return savedProposals
      ? (JSON.parse(savedProposals) as MissingSkillProposal[])
      : [];
  } catch {
    return [];
  }
}

function createRecordId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function SkillImportanceRating({
  skillId,
  defaultDomain,
}: SkillImportanceRatingProps) {
  const [ratings, setRatings] = useState<ImportanceRating[]>([]);
  const [missingSkillProposals, setMissingSkillProposals] = useState<
    MissingSkillProposal[]
  >([]);
  const [expertName, setExpertName] = useState("");
  const [expertDomain, setExpertDomain] = useState<CollegeId>(
    resolveDefaultExpertDomain(defaultDomain),
  );
  const [score, setScore] = useState(3);
  const [notes, setNotes] = useState("");
  const [missingSkillName, setMissingSkillName] = useState("");
  const [missingSkillNeed, setMissingSkillNeed] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setRatings(loadRatings(skillId));
    setMissingSkillProposals(loadMissingSkillProposals(skillId));
  }, [skillId]);

  const summaries = useMemo(
    () =>
      EXPERT_DOMAINS.map((domain) => {
        const domainRatings = ratings.filter(
          (rating) => rating.expertDomain === domain.id,
        );
        const total = domainRatings.reduce(
          (sum, rating) => sum + rating.score,
          0,
        );
        return {
          ...domain,
          count: domainRatings.length,
          average: domainRatings.length ? total / domainRatings.length : null,
        };
      }),
    [ratings],
  );

  function saveRatings(nextRatings: ImportanceRating[]) {
    try {
      window.localStorage.setItem(
        getStorageKey(skillId),
        JSON.stringify(nextRatings),
      );
      setRatings(nextRatings);
      return true;
    } catch {
      setMessage(
        "평가를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.",
      );
      return false;
    }
  }

  function saveMissingSkillProposals(nextProposals: MissingSkillProposal[]) {
    try {
      window.localStorage.setItem(
        getMissingSkillStorageKey(skillId),
        JSON.stringify(nextProposals),
      );
      setMissingSkillProposals(nextProposals);
      return true;
    } catch {
      setMessage("누락 스킬 제안을 저장하지 못했습니다.");
      return false;
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedExpertName = expertName.trim();
    if (!trimmedExpertName) {
      setMessage("평가자를 입력해 주세요.");
      return;
    }

    const nextRatings = [
      {
        id: createRecordId(),
        expertName: trimmedExpertName,
        expertDomain,
        score,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      },
      ...ratings,
    ];

    if (saveRatings(nextRatings)) {
      setNotes("");
      setMessage("중요도 평가를 저장했습니다.");
    }
  }

  function handleMissingSkillSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedExpertName = expertName.trim();
    const trimmedSkillName = missingSkillName.trim();
    const trimmedNeed = missingSkillNeed.trim();

    if (!trimmedExpertName) {
      setMessage("평가자를 먼저 입력해 주세요.");
      return;
    }
    if (!trimmedSkillName) {
      setMessage("추가가 필요한 스킬명을 입력해 주세요.");
      return;
    }
    if (!trimmedNeed) {
      setMessage("왜 필요한 스킬인지 현장 근거를 입력해 주세요.");
      return;
    }

    const nextProposals = [
      {
        id: createRecordId(),
        expertName: trimmedExpertName,
        expertDomain,
        skillName: trimmedSkillName,
        fieldNeed: trimmedNeed,
        createdAt: new Date().toISOString(),
      },
      ...missingSkillProposals,
    ];

    if (saveMissingSkillProposals(nextProposals)) {
      setMissingSkillName("");
      setMissingSkillNeed("");
      setMessage(
        "누락 스킬 제안을 저장했습니다. 검수 후 스킬맵에 반영할 수 있습니다.",
      );
    }
  }

  function handleDelete(ratingId: string) {
    if (saveRatings(ratings.filter((rating) => rating.id !== ratingId))) {
      setMessage("평가를 삭제했습니다.");
    }
  }

  function handleProposalDelete(proposalId: string) {
    if (
      saveMissingSkillProposals(
        missingSkillProposals.filter((proposal) => proposal.id !== proposalId),
      )
    ) {
      setMessage("누락 스킬 제안을 삭제했습니다.");
    }
  }

  return (
    <section className={styles.ratingPanel}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>DOMAIN EXPERT RATING</p>
          <h2>영역별 전문가 중요도 평가</h2>
          <span>
            각 영역의 전문가가 현장 관점에서 이 스킬의 중요도를 평가합니다.
          </span>
        </div>
        <strong>
          {ratings.length}건 평가 · {missingSkillProposals.length}건 제안
        </strong>
      </div>

      <form className={styles.ratingForm} onSubmit={handleSubmit}>
        <label>
          평가자
          <input
            onChange={(event) => setExpertName(event.target.value)}
            placeholder="예: 생산기술팀 김OO"
            value={expertName}
          />
        </label>
        <label>
          전문 영역
          <select
            onChange={(event) =>
              setExpertDomain(event.target.value as CollegeId)
            }
            value={expertDomain}
          >
            {EXPERT_DOMAINS.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
                {domain.isHub ? " · HUB" : ""}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>중요도</legend>
          <div className={styles.scoreOptions}>
            {Object.entries(SCORE_LABELS).map(([value, label]) => {
              const numericValue = Number(value);
              return (
                <label key={value}>
                  <input
                    checked={score === numericValue}
                    name="importance-score"
                    onChange={() => setScore(numericValue)}
                    type="radio"
                    value={value}
                  />
                  <strong>{value}</strong>
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <label className={styles.notes}>
          의견 <span>선택</span>
          <textarea
            onChange={(event) => setNotes(event.target.value)}
            placeholder="왜 중요한지, 어떤 현장에 필요한지 간단히 남겨 주세요."
            rows={3}
            value={notes}
          />
        </label>
        <button type="submit">평가 저장</button>
      </form>

      <form
        className={styles.missingSkillForm}
        onSubmit={handleMissingSkillSubmit}
      >
        <div className={styles.formTitle}>
          <p>MISSING SKILL PROPOSAL</p>
          <h3>스킬맵에 없는 현장 스킬 추가 요청</h3>
          <span>
            현재 스킬과 함께 평가해야 하는데 목록에 없다면, 도메인 엑스퍼트가
            검수 후보로 남길 수 있습니다.
          </span>
        </div>
        <label>
          추가 필요 스킬
          <input
            onChange={(event) => setMissingSkillName(event.target.value)}
            placeholder="예: 생성형 AI 기반 설비 이상 원인 분석"
            value={missingSkillName}
          />
        </label>
        <label className={styles.notes}>
          현장 필요 근거
          <textarea
            onChange={(event) => setMissingSkillNeed(event.target.value)}
            placeholder="어떤 공정/현장/문제에서 필요한지 남겨 주세요."
            rows={3}
            value={missingSkillNeed}
          />
        </label>
        <button type="submit">추가 요청 저장</button>
      </form>

      {message && (
        <p aria-live="polite" className={styles.message}>
          {message}
        </p>
      )}

      <div className={styles.summarySection}>
        <h3>영역별 평가 요약</h3>
        {ratings.length === 0 ? (
          <p className={styles.empty}>아직 등록된 중요도 평가가 없습니다.</p>
        ) : null}
        <div className={styles.summaryGrid}>
          {summaries.map((summary) => (
            <article key={summary.id}>
              <span>
                {summary.name}
                {summary.isHub ? " · HUB" : ""}
              </span>
              <strong>
                {summary.average ? summary.average.toFixed(1) : "-"}
              </strong>
              <small>
                {summary.count > 0 ? `${summary.count}명 평가` : "평가 대기"} ·
                5점 만점
              </small>
            </article>
          ))}
        </div>
      </div>

      {ratings.length > 0 && (
        <div className={styles.historySection}>
          <h3>최근 평가</h3>
          <div className={styles.historyList}>
            {ratings.slice(0, 5).map((rating) => {
              const domainName =
                EXPERT_DOMAINS.find(
                  (domain) => domain.id === rating.expertDomain,
                )?.name ?? rating.expertDomain;
              return (
                <article key={rating.id}>
                  <div>
                    <strong>
                      {rating.score}점 · {rating.expertName}
                    </strong>
                    <span>
                      {domainName} ·{" "}
                      {new Intl.DateTimeFormat("ko-KR", {
                        dateStyle: "medium",
                      }).format(new Date(rating.createdAt))}
                    </span>
                    {rating.notes && <p>{rating.notes}</p>}
                  </div>
                  <button onClick={() => handleDelete(rating.id)} type="button">
                    삭제
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {missingSkillProposals.length > 0 && (
        <div className={styles.historySection}>
          <h3>누락 스킬 제안</h3>
          <div className={styles.historyList}>
            {missingSkillProposals.slice(0, 5).map((proposal) => {
              const domainName =
                EXPERT_DOMAINS.find(
                  (domain) => domain.id === proposal.expertDomain,
                )?.name ?? proposal.expertDomain;
              return (
                <article key={proposal.id}>
                  <div>
                    <strong>{proposal.skillName}</strong>
                    <span>
                      {domainName} · {proposal.expertName} ·{" "}
                      {new Intl.DateTimeFormat("ko-KR", {
                        dateStyle: "medium",
                      }).format(new Date(proposal.createdAt))}
                    </span>
                    <p>{proposal.fieldNeed}</p>
                  </div>
                  <button
                    onClick={() => handleProposalDelete(proposal.id)}
                    type="button"
                  >
                    삭제
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
