"use client";

import { useMemo, useState } from "react";
import type { EmployeeCompetencyDataset } from "../lib/employee-competency-data";
import type { CollegeId } from "../lib/college-types";
import styles from "./EmployeeCompetencyDashboard.module.css";

interface EmployeeCompetencyDashboardProps {
  dataset: EmployeeCompetencyDataset;
}

const collegeAccent: Record<CollegeId, string> = {
  "physical-ai": "#0f766e",
  "agentic-ai": "#7c3aed",
  "digital-twin": "#2563eb",
  "data-intelligence": "#be123c",
};

export default function EmployeeCompetencyDashboard({
  dataset,
}: EmployeeCompetencyDashboardProps) {
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("all");
  const [collegeId, setCollegeId] = useState<CollegeId | "all">("all");

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return dataset.employees.filter((employee) => {
      const matchesQuery =
        normalizedQuery === "" ||
        [
          employee.name,
          employee.employeeId,
          employee.team,
          employee.job,
          employee.competencies.map((item) => item.minorCategory).join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesTeam = team === "all" || employee.team === team;
      const matchesCollege =
        collegeId === "all" || employee.primaryCollegeId === collegeId;

      return matchesQuery && matchesTeam && matchesCollege;
    });
  }, [collegeId, dataset.employees, query, team]);

  return (
    <section className={styles.dashboard}>
      <div className={styles.summaryGrid}>
        <MetricCard label="평가 인원" value={`${dataset.summary.employeeCount}명`} />
        <MetricCard label="핵심역량" value={`${dataset.summary.coreCompetencyCount}개`} />
        <MetricCard label="평균 점수" value={dataset.summary.averageScore.toFixed(2)} />
        <MetricCard label="평가 차수" value={dataset.assessment.roundName} />
      </div>

      <section className={styles.domainBand} aria-label="전문영역별 역량 분포">
        {dataset.colleges.map((college) => {
          const summary = dataset.summary.byCollege[college.id];
          const width =
            dataset.summary.competencyCount > 0
              ? (summary.count / dataset.summary.competencyCount) * 100
              : 0;

          return (
            <article className={styles.domainCard} key={college.id}>
              <div className={styles.domainHeader}>
                <span
                  className={styles.domainDot}
                  style={{ backgroundColor: collegeAccent[college.id] }}
                />
                <div>
                  <h2>{college.name}</h2>
                  <p>{college.nameKo}</p>
                </div>
              </div>
              <div className={styles.domainStats}>
                <strong>{summary.count}명</strong>
                <span>평균 {summary.averageScore.toFixed(2)}</span>
              </div>
              <div className={styles.barTrack}>
                <span
                  className={styles.barFill}
                  style={{
                    width: `${width}%`,
                    backgroundColor: collegeAccent[college.id],
                  }}
                />
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.directory}>
        <div className={styles.directoryHeader}>
          <div>
            <p className={styles.eyebrow}>EMPLOYEE COMPETENCY</p>
            <h2>개인별 역량정보</h2>
          </div>
          <strong>{filteredEmployees.length}명</strong>
        </div>

        <div className={styles.filters}>
          <label>
            검색
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="이름, 사번, 팀, 역량명"
            />
          </label>
          <label>
            팀
            <select value={team} onChange={(event) => setTeam(event.target.value)}>
              <option value="all">전체 팀</option>
              {dataset.summary.teams.map((teamName) => (
                <option key={teamName} value={teamName}>
                  {teamName}
                </option>
              ))}
            </select>
          </label>
          <label>
            전문영역
            <select
              value={collegeId}
              onChange={(event) =>
                setCollegeId(event.target.value as CollegeId | "all")
              }
            >
              <option value="all">전체 영역</option>
              {dataset.colleges.map((college) => (
                <option key={college.id} value={college.id}>
                  {college.nameKo}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>성명</th>
                <th>조직</th>
                <th>직무</th>
                <th>전문영역</th>
                <th>대표 역량</th>
                <th>점수</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => {
                const topCompetency = employee.competencies[0];
                return (
                  <tr key={employee.employeeId}>
                    <td>
                      <strong>{employee.name}</strong>
                      <span>{employee.employeeId}</span>
                    </td>
                    <td>
                      <strong>{employee.team}</strong>
                      <span>{employee.division}</span>
                    </td>
                    <td>{employee.job}</td>
                    <td>
                      <span
                        className={styles.badge}
                        style={{
                          color: collegeAccent[employee.primaryCollegeId],
                          borderColor: collegeAccent[employee.primaryCollegeId],
                        }}
                      >
                        {employee.primaryCollegeNameKo}
                      </span>
                    </td>
                    <td>
                      <strong>{topCompetency.minorCategory}</strong>
                      <span>
                        {topCompetency.majorCategory} / {topCompetency.middleCategory}
                      </span>
                    </td>
                    <td>
                      <strong className={styles.score}>
                        {employee.averageScore.toFixed(1)}
                      </strong>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredEmployees.length === 0 ? (
            <p className={styles.empty}>조건에 맞는 개인 역량정보가 없습니다.</p>
          ) : null}
        </div>
      </section>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className={styles.metricCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
