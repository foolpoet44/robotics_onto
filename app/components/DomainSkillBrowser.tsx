"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ROBOT_DOMAINS } from "../lib/robotics-data";
import styles from "./DomainSkillBrowser.module.css";

export interface BrowserSkill {
  skillId: string;
  label: string;
  proficiency: number;
  collegeId: string | null;
  domain: string;
}

export interface BrowserChangeRequest {
  id: string;
  skillId: string;
  axis: "functional" | "college";
  currentValue: string;
  requestedValue: string;
  reason: string;
  evaluatorName: string;
  createdAt: string;
}

export interface BrowserCollege {
  id: string;
  name: string;
}

interface DomainSkillBrowserProps {
  toggleLabel?: string;
  defaultOpen?: boolean;
  skills: BrowserSkill[];
  colleges: BrowserCollege[];
  evaluatorName: string | null;
  initialRequests: BrowserChangeRequest[];
}

const AXIS_LABELS: Record<"functional" | "college", string> = {
  functional: "기능 도메인",
  college: "4대 도메인",
};

export default function DomainSkillBrowser({
  toggleLabel = "하위 스킬 조회",
  defaultOpen = false,
  skills,
  colleges,
  evaluatorName,
  initialRequests,
}: DomainSkillBrowserProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [requests, setRequests] =
    useState<BrowserChangeRequest[]>(initialRequests);
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const [axis, setAxis] = useState<"functional" | "college">("functional");
  const [requestedValue, setRequestedValue] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const collegeNameById = useMemo(() => {
    const map: Record<string, string> = {};
    colleges.forEach((college) => {
      map[college.id] = college.name;
    });
    return map;
  }, [colleges]);

  const requestCountBySkill = useMemo(() => {
    const map: Record<string, number> = {};
    requests.forEach((request) => {
      map[request.skillId] = (map[request.skillId] ?? 0) + 1;
    });
    return map;
  }, [requests]);

  const domainNameByKey = useMemo(() => {
    const map: Record<string, string> = {};
    ROBOT_DOMAINS.forEach((domain) => {
      map[domain.key] = domain.name;
    });
    return map;
  }, []);

  function valueName(axisValue: "functional" | "college", value: string) {
    return axisValue === "functional"
      ? domainNameByKey[value] ?? value
      : collegeNameById[value] ?? value;
  }

  function openForm(skillId: string) {
    setActiveSkillId(skillId);
    setAxis("functional");
    setRequestedValue("");
    setReason("");
    setMessage("");
  }

  function closeForm() {
    setActiveSkillId(null);
    setMessage("");
  }

  async function handleSubmit(skill: BrowserSkill) {
    if (!requestedValue) {
      setMessage("변경할 도메인을 선택해 주세요.");
      return;
    }
    if (!reason.trim()) {
      setMessage("변경 사유를 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/domain-change-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: skill.skillId,
          axis,
          requestedValue,
          reason,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        request?: BrowserChangeRequest;
        error?: string;
      };
      if (!response.ok || !data.request) {
        setMessage(data.error ?? "변경요청을 저장하지 못했습니다.");
        return;
      }
      setRequests((prev) => [data.request as BrowserChangeRequest, ...prev]);
      setActiveSkillId(null);
      setMessage(
        `${skill.label} 도메인 변경요청을 접수했습니다. 검수 후 반영됩니다.`,
      );
    } catch {
      setMessage("네트워크 오류로 저장하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const currentCollegeOf = (skill: BrowserSkill) => skill.collegeId ?? "";

  return (
    <div className={styles.browser}>
      <button
        aria-expanded={open}
        className={styles.toggleButton}
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        {open
          ? `${toggleLabel} 접기 ▲`
          : `${toggleLabel} (${skills.length}) ▼`}
      </button>

      {open && (
        <div className={styles.skillArea}>
          {!evaluatorName && (
            <p className={styles.loginHint}>
              도메인 변경요청은 평가자 로그인 후 가능합니다.{" "}
              <Link href="/evaluation/skills">평가자 로그인 →</Link>
            </p>
          )}

          <ul className={styles.skillList}>
            {skills.map((skill) => {
              const pending = requestCountBySkill[skill.skillId] ?? 0;
              const isActive = activeSkillId === skill.skillId;
              const targetOptions =
                axis === "functional"
                  ? ROBOT_DOMAINS.filter(
                      (domain) => domain.key !== skill.domain,
                    ).map((domain) => ({ value: domain.key, name: domain.name }))
                  : colleges
                      .filter((college) => college.id !== currentCollegeOf(skill))
                      .map((college) => ({
                        value: college.id,
                        name: college.name,
                      }));
              return (
                <li className={styles.skillRow} key={skill.skillId}>
                  <div className={styles.skillLine}>
                    <div className={styles.skillInfo}>
                      <Link
                        className={styles.skillName}
                        href={`/skills/${skill.skillId}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {skill.label}
                      </Link>
                      <span className={styles.skillMeta}>
                        {skill.skillId} · Lv{skill.proficiency} ·{" "}
                        {domainNameByKey[skill.domain] ?? skill.domain}
                      </span>
                    </div>
                    {pending > 0 && (
                      <span className={styles.pendingBadge}>
                        변경요청 {pending}건
                      </span>
                    )}
                    {evaluatorName && (
                      <button
                        className={styles.requestButton}
                        onClick={() =>
                          isActive ? closeForm() : openForm(skill.skillId)
                        }
                        type="button"
                      >
                        {isActive ? "닫기" : "도메인 변경요청"}
                      </button>
                    )}
                  </div>

                  {isActive && evaluatorName && (
                    <div className={styles.requestForm}>
                      <fieldset className={styles.axisFieldset}>
                        <legend>변경 대상</legend>
                        {(["functional", "college"] as const).map(
                          (axisOption) => (
                            <label className={styles.axisOption} key={axisOption}>
                              <input
                                checked={axis === axisOption}
                                name={`axis-${skill.skillId}`}
                                onChange={() => {
                                  setAxis(axisOption);
                                  setRequestedValue("");
                                  setMessage("");
                                }}
                                type="radio"
                              />
                              {AXIS_LABELS[axisOption]}
                              <span className={styles.axisCurrent}>
                                현재:{" "}
                                {axisOption === "functional"
                                  ? domainNameByKey[skill.domain] ??
                                    skill.domain
                                  : valueName(
                                      "college",
                                      currentCollegeOf(skill) || "-",
                                    )}
                              </span>
                            </label>
                          ),
                        )}
                      </fieldset>

                      <label className={styles.targetField}>
                        변경할 도메인
                        <select
                          onChange={(event) => {
                            setRequestedValue(event.target.value);
                            setMessage("");
                          }}
                          value={requestedValue}
                        >
                          <option value="">선택하세요</option>
                          {targetOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className={styles.reasonField}>
                        변경 사유 <span>필수</span>
                        <textarea
                          onChange={(event) => {
                            setReason(event.target.value);
                            setMessage("");
                          }}
                          placeholder="이 스킬이 왜 다른 도메인에 속해야 하는지 근거를 남겨 주세요."
                          rows={2}
                          value={reason}
                        />
                      </label>

                      <div className={styles.formActions}>
                        <span className={styles.identityNote}>
                          요청자: {evaluatorName} (로그인 신원 자동 적용)
                        </span>
                        <button
                          className={styles.submitButton}
                          disabled={submitting}
                          onClick={() => handleSubmit(skill)}
                          type="button"
                        >
                          {submitting ? "접수 중..." : "변경요청 접수"}
                        </button>
                      </div>
                    </div>
                  )}

                  {pending > 0 && isActive && (
                    <ul className={styles.requestHistory}>
                      {requests
                        .filter((request) => request.skillId === skill.skillId)
                        .map((request) => (
                          <li key={request.id}>
                            [{AXIS_LABELS[request.axis]}]{" "}
                            {valueName(request.axis, request.currentValue)} →{" "}
                            {valueName(request.axis, request.requestedValue)} ·{" "}
                            {request.evaluatorName}
                            {request.reason && <p>{request.reason}</p>}
                          </li>
                        ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          {message && (
            <p aria-live="polite" className={styles.message}>
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
