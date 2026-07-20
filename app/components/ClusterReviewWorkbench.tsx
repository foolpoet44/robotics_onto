"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EvaluatorPublic } from "../lib/evaluator-data";
import type {
  ClusterReviewLabel,
  ClusterVerdict,
} from "../lib/cluster-review-store";
import styles from "./ClusterReviewWorkbench.module.css";

export interface ClusterMemberSummary {
  skillId: string;
  label: string;
  proficiency: number;
}

export interface ClusterSummary {
  id: string;
  subcategoryId: string;
  subcategoryName: string;
  name: string;
  summary: string;
  priority: "core" | "foundation" | "review";
  members: ClusterMemberSummary[];
}

interface ClusterReviewWorkbenchProps {
  evaluator: EvaluatorPublic;
  clusters: ClusterSummary[];
  initialLabels: ClusterReviewLabel[];
}

const VERDICTS: { id: ClusterVerdict; label: string; hint: string }[] = [
  {
    id: "merge_ok",
    label: "통합 적절",
    hint: "이 묶음 단위로 검증·육성해도 된다",
  },
  {
    id: "keep_split",
    label: "분리 유지",
    hint: "과통합 — 세부 스킬을 나눠 봐야 한다",
  },
  {
    id: "restructure",
    label: "재구성 필요",
    hint: "묶음 자체를 다시 설계해야 한다",
  },
];

const PRIORITY_LABELS: Record<ClusterSummary["priority"], string> = {
  core: "★ 핵심",
  foundation: "기초 역량",
  review: "재정의 검토",
};

interface MyReview {
  verdict: ClusterVerdict;
  notes: string;
  savedAt: string;
}

export default function ClusterReviewWorkbench({
  evaluator,
  clusters,
  initialLabels,
}: ClusterReviewWorkbenchProps) {
  // append-only 장부에서 내 최신 판정만 뽑아 초기 상태로 쓴다.
  const initialMine = useMemo(() => {
    const mine = new Map<string, MyReview>();
    const sorted = [...initialLabels]
      .filter((label) => label.evaluatorId === evaluator.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const label of sorted) {
      mine.set(label.clusterId, {
        verdict: label.verdict,
        notes: label.notes,
        savedAt: label.createdAt,
      });
    }
    return mine;
  }, [initialLabels, evaluator.id]);

  const [saved, setSaved] = useState<Map<string, MyReview>>(initialMine);
  const [drafts, setDrafts] = useState<
    Map<string, { verdict: ClusterVerdict | null; notes: string }>
  >(new Map());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subcategories = useMemo(() => {
    const groups: { id: string; name: string; clusters: ClusterSummary[] }[] =
      [];
    for (const cluster of clusters) {
      let group = groups.find((item) => item.id === cluster.subcategoryId);
      if (!group) {
        group = {
          id: cluster.subcategoryId,
          name: cluster.subcategoryName,
          clusters: [],
        };
        groups.push(group);
      }
      group.clusters.push(cluster);
    }
    return groups;
  }, [clusters]);

  const reviewedCount = saved.size;

  function getDraft(cluster: ClusterSummary) {
    const draft = drafts.get(cluster.id);
    const mine = saved.get(cluster.id);
    return {
      verdict: draft?.verdict ?? mine?.verdict ?? null,
      notes: draft?.notes ?? mine?.notes ?? "",
    };
  }

  function setDraft(
    clusterId: string,
    next: { verdict: ClusterVerdict | null; notes: string },
  ) {
    setDrafts((prev) => {
      const copy = new Map(prev);
      copy.set(clusterId, next);
      return copy;
    });
  }

  async function submit(cluster: ClusterSummary) {
    const draft = getDraft(cluster);
    if (!draft.verdict) {
      setError(`${cluster.name}: 판정을 먼저 선택해 주세요.`);
      return;
    }
    setBusyId(cluster.id);
    setError(null);
    try {
      const response = await fetch("/api/cluster-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clusterId: cluster.id,
          verdict: draft.verdict,
          notes: draft.notes,
        }),
      });
      const payload = (await response.json()) as {
        label?: ClusterReviewLabel;
        error?: string;
      };
      if (!response.ok || !payload.label) {
        setError(payload.error ?? "저장에 실패했습니다.");
        return;
      }
      const record = payload.label;
      setSaved((prev) => {
        const copy = new Map(prev);
        copy.set(cluster.id, {
          verdict: record.verdict,
          notes: record.notes,
          savedAt: record.createdAt,
        });
        return copy;
      });
      setDrafts((prev) => {
        const copy = new Map(prev);
        copy.delete(cluster.id);
        return copy;
      });
    } catch {
      setError("네트워크 오류로 저장하지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={styles.workbench}>
      <div className={styles.progressCard}>
        <div className={styles.progressHead}>
          <strong>
            {evaluator.name} ({evaluator.department})
          </strong>
          <span>
            판정 완료 {reviewedCount} / {clusters.length}
          </span>
        </div>
        <div className={styles.progressBar} aria-hidden="true">
          <div
            className={styles.progressFill}
            style={{
              width: `${clusters.length > 0 ? (reviewedCount / clusters.length) * 100 : 0}%`,
            }}
          />
        </div>
        <p className={styles.progressHint}>
          클러스터별로 통합 적절 / 분리 유지 / 재구성 필요를 판정해 주세요.
          판정은 다시 저장하면 최신 것으로 집계됩니다.
        </p>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {subcategories.map((subcategory) => (
        <section key={subcategory.id} className={styles.subcategory}>
          <h2>
            {subcategory.name}
            <span>
              {subcategory.clusters.filter((c) => saved.has(c.id)).length}/
              {subcategory.clusters.length} 완료
            </span>
          </h2>
          {subcategory.clusters.map((cluster) => {
            const draft = getDraft(cluster);
            const mine = saved.get(cluster.id);
            const dirty =
              drafts.has(cluster.id) &&
              (draft.verdict !== mine?.verdict ||
                draft.notes !== (mine?.notes ?? ""));
            return (
              <article key={cluster.id} className={styles.clusterCard}>
                <header className={styles.clusterHead}>
                  <div>
                    <h3>
                      {cluster.name}
                      <span className={styles.priorityBadge}>
                        {PRIORITY_LABELS[cluster.priority]}
                      </span>
                    </h3>
                    <p>{cluster.summary}</p>
                  </div>
                  {mine && !dirty && (
                    <span className={styles.savedBadge}>
                      판정 저장됨 ·{" "}
                      {VERDICTS.find((v) => v.id === mine.verdict)?.label}
                    </span>
                  )}
                </header>

                <ul className={styles.memberList}>
                  {cluster.members.map((member) => (
                    <li key={member.skillId}>
                      <Link href={`/skills/${member.skillId}`} target="_blank">
                        {member.label}
                      </Link>
                      <span>
                        {member.skillId} · Lv{member.proficiency}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className={styles.verdictRow}>
                  {VERDICTS.map((verdict) => (
                    <button
                      key={verdict.id}
                      type="button"
                      title={verdict.hint}
                      className={
                        draft.verdict === verdict.id
                          ? `${styles.verdictButton} ${styles.verdictActive} ${styles[`verdict_${verdict.id}`]}`
                          : styles.verdictButton
                      }
                      onClick={() =>
                        setDraft(cluster.id, {
                          verdict: verdict.id,
                          notes: draft.notes,
                        })
                      }
                    >
                      {verdict.label}
                    </button>
                  ))}
                </div>

                <div className={styles.notesRow}>
                  <textarea
                    value={draft.notes}
                    placeholder="의견 (선택) — 분리 유지·재구성 필요 판정 시 사유를 남겨 주세요."
                    maxLength={1000}
                    rows={2}
                    onChange={(event) =>
                      setDraft(cluster.id, {
                        verdict: draft.verdict,
                        notes: event.target.value,
                      })
                    }
                  />
                  <button
                    type="button"
                    className={styles.saveButton}
                    disabled={
                      busyId === cluster.id ||
                      !draft.verdict ||
                      (!dirty && Boolean(mine))
                    }
                    onClick={() => submit(cluster)}
                  >
                    {busyId === cluster.id
                      ? "저장 중…"
                      : mine && !dirty
                        ? "저장됨"
                        : "판정 저장"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ))}
    </div>
  );
}
