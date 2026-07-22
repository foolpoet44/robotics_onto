"use client";

import { useMemo, useState } from "react";
import type { EvaluatorPublic } from "../lib/evaluator-data";
import type { ClusterReviewRating } from "../lib/cluster-rating-constants";
import { CLUSTER_LABELS } from "../lib/cluster-rating-constants";
import styles from "./ClusterWorkbench.module.css";

export interface ClusterMember {
  skillId: string;
  label: string;
  proficiency: number;
  description: string;
}

export interface ClusterSummary {
  id: string;
  name: string;
  summary: string;
  subcategoryId: string;
  subcategoryName: string;
  level: string;
  members: ClusterMember[];
}

interface ClusterWorkbenchProps {
  evaluator: EvaluatorPublic;
  clusters: ClusterSummary[];
  initialRatings: ClusterReviewRating[];
}

const LEVEL_COLOR: Record<string, string> = {
  초급: "#0d9488",
  중급: "#4338ca",
  고급: "#9333ea",
  동향: "#c2410c",
};
const SCORES: { n: number; t: string }[] = [
  { n: 1, t: "낮음" },
  { n: 2, t: "보통 이하" },
  { n: 3, t: "보통" },
  { n: 4, t: "높음" },
  { n: 5, t: "매우 높음" },
];

interface Draft {
  selected: boolean;
  score: number | null;
  labels: string[];
  notes: string;
}

type Step = 1 | 2 | 3;

export default function ClusterWorkbench({
  evaluator,
  clusters,
  initialRatings,
}: ClusterWorkbenchProps) {
  // 내 최신 평가로 초기 상태 구성(latest-wins). 없으면 기본 전체 선택.
  const initialDrafts = useMemo(() => {
    const map = new Map<string, Draft>();
    const mine = [...initialRatings]
      .filter((r) => r.evaluatorId === evaluator.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const r of mine) {
      map.set(r.clusterId, {
        selected: r.selected,
        score: r.score,
        labels: [...r.labels],
        notes: r.notes,
      });
    }
    return map;
  }, [initialRatings, evaluator.id]);

  const [picked, setPicked] = useState<Set<string>>(() => {
    const set = new Set(clusters.map((c) => c.id));
    // 기존에 명시적으로 제외(selected=false)한 클러스터는 해제 상태로 시작
    for (const [id, d] of initialDrafts) if (!d.selected) set.delete(id);
    return set;
  });
  const [drafts, setDrafts] = useState<Map<string, Draft>>(
    () => new Map(initialDrafts),
  );
  const [saved, setSaved] = useState<Set<string>>(
    () => new Set(initialDrafts.keys()),
  );
  const [step, setStep] = useState<Step>(2);
  const [curId, setCurId] = useState<string>(clusters[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState("");
  const [query, setQuery] = useState("");

  const bySubcategory = useMemo(() => {
    const groups: { name: string; clusters: ClusterSummary[] }[] = [];
    for (const cluster of clusters) {
      let group = groups.find((g) => g.name === cluster.subcategoryName);
      if (!group) {
        group = { name: cluster.subcategoryName, clusters: [] };
        groups.push(group);
      }
      group.clusters.push(cluster);
    }
    return groups;
  }, [clusters]);

  const pickedClusters = clusters.filter((c) => picked.has(c.id));
  const doneCount = pickedClusters.filter(
    (c) => saved.has(c.id) && drafts.get(c.id)?.score,
  ).length;

  function getDraft(id: string): Draft {
    return (
      drafts.get(id) ?? { selected: true, score: null, labels: [], notes: "" }
    );
  }
  function setDraft(id: string, next: Partial<Draft>) {
    setDrafts((prev) => {
      const copy = new Map(prev);
      copy.set(id, { ...getDraft(id), ...next });
      return copy;
    });
  }

  function togglePick(id: string) {
    setPicked((prev) => {
      const copy = new Set(prev);
      copy.has(id) ? copy.delete(id) : copy.add(id);
      return copy;
    });
  }

  async function saveCurrent() {
    const cluster = clusters.find((c) => c.id === curId);
    if (!cluster) return;
    const d = getDraft(curId);
    if (!d.score) {
      setError("중요도를 선택해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/cluster-ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clusterId: curId,
          selected: true,
          score: d.score,
          labels: d.labels,
          notes: d.notes,
        }),
      });
      const payload = (await response.json()) as {
        rating?: ClusterReviewRating;
        error?: string;
      };
      if (!response.ok || !payload.rating) {
        setError(payload.error ?? "저장에 실패했습니다.");
        return;
      }
      setSaved((prev) => new Set(prev).add(curId));
      // 다음 미평가 선택 클러스터로 이동
      const idx = pickedClusters.findIndex((c) => c.id === curId);
      const next =
        pickedClusters
          .slice(idx + 1)
          .find((c) => !(saved.has(c.id) && drafts.get(c.id)?.score)) ??
        pickedClusters[idx + 1];
      if (next) setCurId(next.id);
    } catch {
      setError("네트워크 오류로 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const levelBadge = (level: string) => (
    <span
      className={styles.badge}
      style={{
        color: LEVEL_COLOR[level],
        background: `${LEVEL_COLOR[level]}1e`,
      }}
    >
      {level}
    </span>
  );

  return (
    <div className={styles.workbench}>
      <div className={styles.who}>
        <strong>
          {evaluator.name}{" "}
          <span className={styles.dept}>· {evaluator.department}</span>
        </strong>
        <div className={styles.prog}>
          <small>
            평가 완료 {doneCount} / {picked.size} (선택된 필요 역량)
          </small>
          <div className={styles.progBar}>
            <div
              className={styles.progFill}
              style={{
                width: `${picked.size ? (doneCount / picked.size) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className={styles.steps}>
        {([1, 2, 3] as Step[]).map((s) => (
          <button
            key={s}
            type="button"
            className={
              step === s ? `${styles.step} ${styles.stepOn}` : styles.step
            }
            onClick={() => setStep(s)}
          >
            <span className={styles.stepN}>{["①", "②", "③"][s - 1]}</span>
            {["클러스터 선택", "클러스터 평가", "내 평가 현황"][s - 1]}
          </button>
        ))}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {step === 1 && (
        <section>
          <div className={styles.notice}>
            필요 역량으로 평가할 클러스터를 <b>선택</b>하세요(기본 전체 선택).
            카드를 클릭하면 선택/해제됩니다.{" "}
            <b>선택하지 않은 클러스터는 필요 역량 항목에서 제외됩니다.</b>
          </div>
          <div className={styles.filters}>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            >
              <option value="">전체 레벨</option>
              <option>초급</option>
              <option>중급</option>
              <option>고급</option>
              <option>동향</option>
            </select>
            <input
              placeholder="클러스터명 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              className={styles.miniBtn}
              onClick={() => setPicked(new Set(clusters.map((c) => c.id)))}
            >
              전체 선택
            </button>
            <button
              type="button"
              className={styles.miniBtn}
              onClick={() => setPicked(new Set())}
            >
              전체 해제
            </button>
            <span className={styles.hint}>
              선택 {picked.size} / {clusters.length}
            </span>
          </div>

          {bySubcategory.map((group) => {
            const list = group.clusters.filter(
              (c) =>
                (!levelFilter || c.level === levelFilter) &&
                (!query || c.name.includes(query)),
            );
            if (!list.length) return null;
            return (
              <div className={styles.section} key={group.name}>
                <h3>
                  {group.name}{" "}
                  <span className={styles.cnt}>
                    {list.filter((c) => picked.has(c.id)).length}/{list.length}{" "}
                    선택
                  </span>
                </h3>
                <div className={styles.grid}>
                  {list.map((c) => {
                    const on = picked.has(c.id);
                    const done = saved.has(c.id) && drafts.get(c.id)?.score;
                    const state = !on
                      ? "✕ 제외됨 · 필요 역량 아님"
                      : done
                        ? "✔ 선택됨 · 평가완료"
                        : "✔ 선택됨 · 평가 대상";
                    return (
                      <button
                        type="button"
                        key={c.id}
                        className={`${styles.ccard} ${on ? (done ? styles.ccardDone : styles.ccardPick) : styles.ccardExcl}`}
                        onClick={() => togglePick(c.id)}
                      >
                        <span className={styles.cch}>
                          <b>
                            {on ? "☑ " : "☐ "}
                            {c.name}
                          </b>
                          {levelBadge(c.level)}
                        </span>
                        <span className={styles.ccm}>
                          {c.summary} · 세부 {c.members.length}개
                        </span>
                        <span
                          className={
                            !on
                              ? styles.stateExcl
                              : done
                                ? styles.stateDone
                                : styles.statePick
                          }
                        >
                          {state}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {step === 2 && (
        <section className={styles.eval}>
          <div className={styles.picklist}>
            {pickedClusters.length ? (
              pickedClusters.map((c) => {
                const done = saved.has(c.id) && drafts.get(c.id)?.score;
                return (
                  <button
                    type="button"
                    key={c.id}
                    className={`${styles.pi} ${c.id === curId ? styles.piOn : ""} ${done ? styles.piDone : ""}`}
                    onClick={() => setCurId(c.id)}
                  >
                    {done ? "✔ " : ""}
                    {c.name}
                    <span className={styles.piLv}>{levelBadge(c.level)}</span>
                  </button>
                );
              })
            ) : (
              <p className={styles.hint}>
                선택된 클러스터가 없습니다. ① 단계에서 필요 역량을 선택하세요.
              </p>
            )}
          </div>
          <ClusterPanel
            cluster={pickedClusters.find((c) => c.id === curId) ?? null}
            draft={curId ? getDraft(curId) : null}
            busy={busy}
            done={saved.has(curId) && Boolean(drafts.get(curId)?.score)}
            onScore={(n) => setDraft(curId, { score: n })}
            onToggleLabel={(l) => {
              const cur = getDraft(curId).labels;
              setDraft(curId, {
                labels: cur.includes(l)
                  ? cur.filter((x) => x !== l)
                  : [...cur, l],
              });
            }}
            onNotes={(v) => setDraft(curId, { notes: v })}
            onSave={saveCurrent}
            levelBadge={levelBadge}
          />
        </section>
      )}

      {step === 3 && (
        <section>
          <div className={styles.avg}>
            평가한 클러스터{" "}
            <b>
              {pickedClusters.filter((c) => drafts.get(c.id)?.score).length}
            </b>
            개 · 제외 <b>{clusters.length - picked.size}</b>개 · 평균 중요도{" "}
            <b>
              {(() => {
                const scored = pickedClusters.filter(
                  (c) => drafts.get(c.id)?.score,
                );
                return scored.length
                  ? (
                      scored.reduce(
                        (s, c) => s + (drafts.get(c.id)?.score ?? 0),
                        0,
                      ) / scored.length
                    ).toFixed(1)
                  : "-";
              })()}
            </b>
          </div>
          <div className={styles.statlist}>
            {pickedClusters
              .filter((c) => drafts.get(c.id)?.score)
              .map((c) => {
                const d = getDraft(c.id);
                return (
                  <div className={styles.st} key={c.id}>
                    <span className={styles.stl}>
                      <b>{c.name}</b>
                      {levelBadge(c.level)}
                      {d.labels.map((l) => (
                        <span key={l} className={styles.lblChip}>
                          {l}
                        </span>
                      ))}
                    </span>
                    <span className={styles.sscore}>{d.score}점</span>
                  </div>
                );
              })}
            {clusters.length - picked.size > 0 && (
              <p className={styles.hint}>
                제외한 클러스터(필요 역량 아님):{" "}
                {clusters
                  .filter((c) => !picked.has(c.id))
                  .map((c) => c.name)
                  .join(", ")}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function ClusterPanel({
  cluster,
  draft,
  busy,
  done,
  onScore,
  onToggleLabel,
  onNotes,
  onSave,
  levelBadge,
}: {
  cluster: ClusterSummary | null;
  draft: Draft | null;
  busy: boolean;
  done: boolean;
  onScore: (n: number) => void;
  onToggleLabel: (l: string) => void;
  onNotes: (v: string) => void;
  onSave: () => void;
  levelBadge: (level: string) => React.ReactNode;
}) {
  if (!cluster || !draft) {
    return (
      <div className={styles.panel}>
        <p className={styles.hint}>
          평가할 클러스터가 없습니다. ① 단계에서 필요 역량을 선택하세요.
        </p>
      </div>
    );
  }
  return (
    <div className={styles.panel}>
      <h2>
        {cluster.name} {levelBadge(cluster.level)}
      </h2>
      <p className={styles.psub}>
        {cluster.subcategoryName} · {cluster.summary}
      </p>

      <div className={styles.sklist}>
        <h4>포함 세부 스킬 {cluster.members.length}개 (참고)</h4>
        {cluster.members.map((m) => (
          <div className={styles.skrow} key={m.skillId}>
            <b>{m.label}</b>{" "}
            <span className={styles.skd}>
              · {m.skillId} · Lv{m.proficiency} — {m.description}
            </span>
          </div>
        ))}
      </div>

      <span className={styles.lbl}>클러스터 중요도</span>
      <div className={styles.scores}>
        {SCORES.map((s) => (
          <button
            type="button"
            key={s.n}
            className={`${styles.sc} ${draft.score === s.n ? styles.scOn : ""}`}
            onClick={() => onScore(s.n)}
          >
            <span className={styles.scN}>{s.n}</span>
            <span className={styles.scT}>{s.t}</span>
          </button>
        ))}
      </div>

      <span className={styles.lbl}>라벨 (다중 선택)</span>
      <div className={styles.chips}>
        {CLUSTER_LABELS.map((l) => {
          const on = draft.labels.includes(l);
          return (
            <button
              type="button"
              key={l}
              className={`${styles.chip} ${on ? styles.chipOn : ""}`}
              onClick={() => onToggleLabel(l)}
            >
              {l}
            </button>
          );
        })}
      </div>

      <span className={styles.lbl}>평가 근거 (선택)</span>
      <textarea
        value={draft.notes}
        placeholder="예: 티칭·프로그래밍은 현장 투입 필수 역량, 초급 단계로 적정"
        maxLength={1000}
        onChange={(e) => onNotes(e.target.value)}
      />

      <button
        type="button"
        className={styles.save}
        disabled={busy}
        onClick={onSave}
      >
        {busy
          ? "저장 중…"
          : done
            ? "다시 저장 후 다음 →"
            : "평가 저장 후 다음 →"}
      </button>
    </div>
  );
}
