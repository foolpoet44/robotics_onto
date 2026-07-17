#!/usr/bin/env node
// ============================================================================
// 지식 스튜어드 — SENSE(감각) 계층: 시그널 수집기 (결정적, LLM 없음)
// ============================================================================
//
// 왜 이 파일이 필요한가
// ---------------------
// 스튜어드 에이전트의 "판단"은 값비싸고 재현이 어렵다. 그래서 수집·집계는
// 지능이 아니라 이 결정적 스크립트가 담당한다. 에이전트는 오직 이 스크립트가
// 뱉은 signals.json 하나만 입력으로 본다 — 같은 데이터면 항상 같은 시그널.
// 비용·재현성·안전이 모두 이 분담(수집은 코드, 판단만 에이전트)에서 나온다.
//
// 무엇을 읽는가 (전부 읽기 전용 시그널 — §2 불변원칙 6)
// ---------------------------------------------------
//  1. 스킬 평가 라벨       DB skill_evaluation_labels  | 파일 .data/skill-evaluations.json
//  2. 도메인 변경요청       DB domain_change_requests   | 파일 .data/domain-change-requests.json
//  3. 기능도메인 중요도평가  DB domain_importance_ratings| 파일 .data/domain-importance-ratings.json
//  4. 칼리지 오버라이드 검수 public/data/college-mapping.json (source: "proposed")
//  5. 조직 역량 미매핑       public/data/organizations/*.json (ontology_skill_id === null)
//  6. 역량↔스킬 매핑 상태    public/data/competency-skill-map.json  ← 아직 없으면 우아하게 건너뜀
//
// 어디로 쓰는가
// ------------
//  기본 .data/steward/signals.json (--out <경로>로 변경 가능). .data 는 gitignore.
//
// 사용법
// ------
//  node scripts/steward/export-signals.js [--out <경로>] [--data-dir <디렉토리>]
//  npm run steward:signals
// ============================================================================

const fs = require("fs");
const path = require("path");
const {
  loadCompetencySkillResolver,
} = require("../lib/competency-skill-resolver-loader");

// ---- 5개 평가 라벨 중 스튜어드가 추적하는 3종 (app/lib/evaluation-constants.ts와 일치) ----
// 현장필수·교육필요는 품질 신호이지 온톨로지 변경감이 아니므로 추적하지 않는다.
const TRACKED_FLAGS = ["중복의심", "신규제안", "재정의대상"];

const ROOT = path.join(__dirname, "..", "..");
const PUBLIC_DATA = path.join(ROOT, "public", "data");

// ----------------------------------------------------------------------------
// 인자 파싱 — 간단한 --key value 방식 (표준 라이브러리만 사용)
// ----------------------------------------------------------------------------
function getArg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

// ----------------------------------------------------------------------------
// 파일 장부를 안전하게 읽는다. 없거나 깨졌으면 빈 배열 — 수집은 절대 죽지 않는다.
// (DB가 없는 로컬/CI 폴백 경로에서 쓰인다)
// ----------------------------------------------------------------------------
function readJsonArray(filePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // 파일 부재/파싱 오류 모두 "시그널 없음"으로 취급
  }
}

function readJsonObject(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// 시그널 원천(raw)을 확보한다.
//   - POSTGRES_URL 이 있으면 3개 테이블을 조회한다.
//   - 없거나 조회가 실패하면 .data 파일 장부로 자동 폴백한다.
// 반환: { store: "postgres"|"file", evaluations, changeRequests, importanceRatings }
// ----------------------------------------------------------------------------
async function loadSignalSources(dataDir) {
  const fileSources = () => ({
    store: "file",
    evaluations: readJsonArray(path.join(dataDir, "skill-evaluations.json")),
    changeRequests: readJsonArray(
      path.join(dataDir, "domain-change-requests.json"),
    ),
    importanceRatings: readJsonArray(
      path.join(dataDir, "domain-importance-ratings.json"),
    ),
  });

  if (!process.env.POSTGRES_URL) {
    return fileSources();
  }

  // DB 경로. 실패하면 파일로 폴백하고 그 사실을 source.store 로 남긴다.
  try {
    const { sql } = await import("@vercel/postgres");
    const [ev, cr, ir] = await Promise.all([
      sql`SELECT skill_id, domain, evaluator_id, evaluator_name, labels, notes, created_at
          FROM skill_evaluation_labels ORDER BY created_at DESC;`,
      sql`SELECT skill_id, axis, current_value, requested_value, reason,
                 evaluator_id, evaluator_name, status, created_at
          FROM domain_change_requests ORDER BY created_at DESC;`,
      sql`SELECT axis, target_key, score, created_at
          FROM domain_importance_ratings ORDER BY created_at DESC;`,
    ]);
    // DB의 snake_case 를 파일 장부와 같은 camelCase 형태로 정규화한다.
    return {
      store: "postgres",
      evaluations: ev.rows.map((r) => ({
        skillId: r.skill_id,
        domain: r.domain,
        evaluatorId: r.evaluator_id,
        evaluatorName: r.evaluator_name,
        labels: r.labels ?? [],
        notes: r.notes ?? "",
        createdAt: new Date(r.created_at).toISOString(),
      })),
      changeRequests: cr.rows.map((r) => ({
        skillId: r.skill_id,
        axis: r.axis,
        currentValue: r.current_value,
        requestedValue: r.requested_value,
        reason: r.reason,
        evaluatorId: r.evaluator_id,
        evaluatorName: r.evaluator_name,
        status: r.status,
        createdAt: new Date(r.created_at).toISOString(),
      })),
      importanceRatings: ir.rows.map((r) => ({
        axis: r.axis,
        targetKey: r.target_key,
        score: Number(r.score),
        createdAt: new Date(r.created_at).toISOString(),
      })),
    };
  } catch (err) {
    // DB 접근 실패는 치명적이지 않다 — 폴백하되 경고를 남긴다.
    console.warn(
      `⚠️  POSTGRES_URL 조회 실패, 파일 폴백으로 전환합니다: ${err.message}`,
    );
    return fileSources();
  }
}

// ----------------------------------------------------------------------------
// 평가 라벨 → 스킬 단위 플래그 집계
//
// 핵심 규칙(§2·A-1 요구사항): 임계값 판정은 "라벨 건수"가 아니라
// "distinct 평가자 수"로 한다. 한 평가자가 같은 스킬을 10번 눌러도 1로 센다.
// ----------------------------------------------------------------------------
function aggregateEvaluationFlags(evaluations, thresholds) {
  // 결과 뼈대: 추적 3종 각각을 스킬별로 모은다.
  const buckets = {};
  for (const flag of TRACKED_FLAGS) buckets[flag] = new Map();

  for (const ev of evaluations) {
    const labels = Array.isArray(ev.labels) ? ev.labels : [];
    for (const flag of TRACKED_FLAGS) {
      if (!labels.includes(flag)) continue;
      const bySkill = buckets[flag];
      if (!bySkill.has(ev.skillId)) {
        bySkill.set(ev.skillId, {
          skillId: ev.skillId,
          evaluators: new Set(),
          count: 0,
          notes: [],
        });
      }
      const entry = bySkill.get(ev.skillId);
      entry.evaluators.add(ev.evaluatorId);
      entry.count += 1; // 라벨 부착 총 횟수(참고용)
      if (ev.notes && ev.notes.trim()) entry.notes.push(ev.notes.trim());
    }
  }

  // 임계값 키 매핑 — 플래그별로 어떤 임계값을 쓰는지 명시.
  const thresholdKey = {
    중복의심: "duplicateSuspectEvaluators",
    신규제안: "newSkillProposalEvaluators",
    재정의대상: "redefineEvaluators",
  };

  const result = {};
  let actionableCount = 0;
  let watchingCount = 0;

  for (const flag of TRACKED_FLAGS) {
    const threshold = thresholds[thresholdKey[flag]];
    // 평가자 수 내림차순으로 정렬 — 가장 강한 신호가 위로.
    const entries = [...buckets[flag].values()]
      .map((e) => {
        const evaluators = [...e.evaluators];
        const actionable = evaluators.length >= threshold;
        if (actionable) actionableCount += 1;
        else watchingCount += 1;
        return {
          skillId: e.skillId,
          evaluators,
          evaluatorCount: evaluators.length,
          count: e.count,
          notes: e.notes,
          threshold,
          actionable,
        };
      })
      .sort((a, b) => b.evaluatorCount - a.evaluatorCount);
    result[flag] = entries;
  }

  return { flags: result, actionableCount, watchingCount };
}

// ----------------------------------------------------------------------------
// 조직 역량 미매핑 수집 — ontology_skill_id === null 인 조직 스킬.
// (validate:data 10번 검사가 경고로 세는 것과 동일 기준)
// ----------------------------------------------------------------------------
function collectOrganizationUnmapped() {
  const dir = path.join(PUBLIC_DATA, "organizations");
  const out = [];
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return out; // organizations 디렉토리가 없으면 시그널 없음
  }
  for (const file of files) {
    const org = readJsonObject(path.join(dir, file));
    if (!org || !Array.isArray(org.enablers)) continue;
    const orgId = file.replace(/\.json$/, "");
    for (const enabler of org.enablers) {
      for (const skill of enabler.skills ?? []) {
        if (skill.ontology_skill_id === null) {
          out.push({
            name: skill.label_ko ?? skill.label_en ?? skill.skill_id,
            orgSkillId: skill.skill_id,
            org: orgId,
          });
        }
      }
    }
  }
  return out;
}

// ----------------------------------------------------------------------------
// 검수 미완 칼리지 오버라이드 — skillOverrides 중 source === "proposed".
// (record:college-override 로 approved 되면 source 가 "reviewed"로 바뀐다)
// ----------------------------------------------------------------------------
function collectPendingOverrideReviews() {
  const mapping = readJsonObject(path.join(PUBLIC_DATA, "college-mapping.json"));
  const overrides = mapping?.skillOverrides;
  if (!overrides || typeof overrides !== "object") return [];
  return Object.entries(overrides)
    .filter(([, v]) => v && v.source === "proposed")
    .map(([skillId, v]) => ({ skillId, proposed: v.primary }));
}

// ----------------------------------------------------------------------------
// 역량↔스킬 매핑 상태 — 리졸버 로더로 커버리지·unknownMinors 를 계산한다.
// 맵/역량평가가 아직 없으면(미머지 단계) 우아하게 available:false 로 건너뛴다.
// unknownMinors 는 B-2(/triage-competency-map)가 소비하는 핵심 시그널이다.
// ----------------------------------------------------------------------------
function collectCompetencyMap(thresholds) {
  const ctx = loadCompetencySkillResolver();
  if (!ctx.available) {
    // 소스 부재를 침묵으로 감추지 않는다 — 명시적으로 unavailable 로 보고.
    return {
      available: false,
      note: "competency-skill-map.json / 역량평가 미존재 — 역량 매핑 시그널 비활성.",
      unknownMinors: [],
      coverage: null,
    };
  }
  // unknown 소분류는 즉시 처리 대상(임계값 unknownMinorImmediate, 기본 1).
  const threshold = thresholds.unknownMinorImmediate ?? 1;
  const unknownMinors = ctx.unknownMinors.map((u) => ({
    ...u,
    actionable: u.employeeCount >= threshold,
    threshold,
  }));
  return {
    available: true,
    unknownMinors,
    coverage: ctx.coverage,
  };
}

// ----------------------------------------------------------------------------
// 메인
// ----------------------------------------------------------------------------
async function main() {
  const dataDir = getArg("data-dir", process.env.EVAL_DATA_DIR)
    ? path.resolve(getArg("data-dir", process.env.EVAL_DATA_DIR))
    : path.join(ROOT, ".data");
  const outPath = getArg("out")
    ? path.resolve(getArg("out"))
    : path.join(ROOT, ".data", "steward", "signals.json");

  // 임계값 설정 로드 — 파일이 없으면 안전한 기본값.
  const thresholds = readJsonObject(
    path.join(__dirname, "signal-thresholds.json"),
  ) ?? {
    changeRequestPending: 1,
    duplicateSuspectEvaluators: 3,
    newSkillProposalEvaluators: 2,
    redefineEvaluators: 2,
    unknownMinorImmediate: 1,
  };

  const sources = await loadSignalSources(dataDir);

  // --- 1. 도메인 변경요청 (pending) ---
  const pending = sources.changeRequests
    .filter((r) => (r.status ?? "pending") === "pending")
    .map((r) => ({
      skillId: r.skillId,
      axis: r.axis,
      currentValue: r.currentValue,
      requestedValue: r.requestedValue,
      reason: r.reason,
      evaluatorId: r.evaluatorId,
      createdAt: r.createdAt,
    }));
  const changeRequestsActionable =
    pending.length >= thresholds.changeRequestPending;

  // --- 2. 평가 플래그 집계 ---
  const evalAgg = aggregateEvaluationFlags(sources.evaluations, thresholds);

  // --- 3. 역량 매핑 상태 ---
  const competencyMap = collectCompetencyMap(thresholds);
  const unknownActionable = competencyMap.unknownMinors.filter(
    (u) => u.actionable,
  ).length;
  const unknownWatching =
    competencyMap.unknownMinors.length - unknownActionable;

  // --- 4. 조직 미매핑 ---
  const organizationUnmapped = collectOrganizationUnmapped();

  // --- 5. 오버라이드 검수 대기 ---
  const pendingOverrideReviews = collectPendingOverrideReviews();

  // --- 6. 기능도메인 중요도평가 (관찰용 요약만) ---
  const importanceRatings = {
    total: sources.importanceRatings.length,
    // 중요도평가는 온톨로지 변경감이 아니라 우선순위 신호 — watching 전용.
  };

  // --- summary 산정 ---
  // actionable: 즉시 [B] 스킬로 처리할 임계값 도달 시그널의 "건수"
  const actionable =
    (changeRequestsActionable ? pending.length : 0) +
    evalAgg.actionableCount +
    unknownActionable;
  // watching: 임계값 미달 + 거버넌스 대기열(관찰만)
  const watching =
    (changeRequestsActionable ? 0 : pending.length) +
    evalAgg.watchingCount +
    pendingOverrideReviews.length +
    organizationUnmapped.length +
    unknownWatching;

  const signals = {
    generatedAt: new Date().toISOString(),
    source: { store: sources.store },
    thresholds,
    changeRequests: {
      actionable: changeRequestsActionable,
      threshold: thresholds.changeRequestPending,
      pending,
    },
    evaluationFlags: evalAgg.flags,
    competencyMap,
    organizationUnmapped,
    pendingOverrideReviews,
    importanceRatings,
    summary: { actionable, watching },
  };

  // 출력 디렉토리 보장 후 원자적 쓰기.
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(signals, null, 2) + "\n", "utf-8");

  // 사람이 파이프라인 로그에서 바로 읽을 수 있는 한 줄 요약.
  console.log(
    `✅ 시그널 수집 완료 [store=${sources.store}] ` +
      `actionable=${actionable} watching=${watching} → ${path.relative(ROOT, outPath)}`,
  );
  return signals;
}

// 테스트에서 함수 단위로 재사용할 수 있도록 export 하되,
// 직접 실행(node ...)일 때만 main 을 돌린다.
module.exports = {
  aggregateEvaluationFlags,
  collectOrganizationUnmapped,
  collectPendingOverrideReviews,
  collectCompetencyMap,
  loadSignalSources,
  main,
  TRACKED_FLAGS,
};

if (require.main === module) {
  main().catch((err) => {
    console.error(`❌ 시그널 수집 실패: ${err.stack || err.message}`);
    process.exit(1);
  });
}
