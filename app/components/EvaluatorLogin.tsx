"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { EvaluatorPublic } from "../lib/evaluator-data";
import styles from "./EvaluatorLogin.module.css";

interface EvaluatorLoginProps {
  evaluators: EvaluatorPublic[];
}

export default function EvaluatorLogin({ evaluators }: EvaluatorLoginProps) {
  const router = useRouter();
  const [evaluatorId, setEvaluatorId] = useState(evaluators[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!evaluatorId) {
      setError("평가자를 선택해 주세요.");
      return;
    }
    if (!code.trim()) {
      setError("접속 코드를 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluatorId, code }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? "로그인에 실패했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 오류로 로그인하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.loginCard} aria-labelledby="evaluator-login-title">
      <p className={styles.eyebrow}>EVALUATOR LOGIN</p>
      <h2 id="evaluator-login-title">평가자 로그인</h2>
      <p className={styles.hint}>
        명부에 등록된 평가자만 평가할 수 있습니다. 로그인하면 이름·소속·전문영역이
        자동으로 적용됩니다.
      </p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label>
          평가자
          <select
            onChange={(event) => {
              setEvaluatorId(event.target.value);
              setError("");
            }}
            value={evaluatorId}
          >
            {evaluators.map((evaluator) => (
              <option key={evaluator.id} value={evaluator.id}>
                {evaluator.name} · {evaluator.department}
              </option>
            ))}
          </select>
        </label>
        <label>
          접속 코드
          <input
            autoComplete="off"
            onChange={(event) => {
              setCode(event.target.value);
              setError("");
            }}
            placeholder="배정받은 접속 코드"
            type="password"
            value={code}
          />
        </label>
        <button disabled={submitting} type="submit">
          {submitting ? "확인 중..." : "로그인"}
        </button>
      </form>
      {error && (
        <p aria-live="polite" className={styles.error}>
          {error}
        </p>
      )}
    </section>
  );
}
