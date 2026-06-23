"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EmptyState from "./EmptyState";
import {
  getDomainName,
  ROBOT_DOMAINS,
  RobotSkill,
  RobotSmartFactoryStatistics,
} from "../lib/robotics-data";

interface SkillExplorerProps {
  skills: RobotSkill[];
  stats: RobotSmartFactoryStatistics;
}

export default function SkillExplorer({ skills, stats }: SkillExplorerProps) {
  const [filteredSkills, setFilteredSkills] = useState<RobotSkill[]>(skills);

  // 필터 상태
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedProficiencies, setSelectedProficiencies] = useState<number[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = useState("");

  const domains = ROBOT_DOMAINS.map((domain) => domain.key);

  // 필터 적용
  useEffect(() => {
    let filtered = [...skills];

    // 도메인 필터
    if (selectedDomains.length > 0) {
      filtered = filtered.filter((skill) =>
        selectedDomains.includes(skill.domain),
      );
    }

    // 역할 필터
    if (selectedRoles.length > 0) {
      filtered = filtered.filter((skill) =>
        skill.role_mapping.some((role) => selectedRoles.includes(role)),
      );
    }

    // 숙련도 필터
    if (selectedProficiencies.length > 0) {
      filtered = filtered.filter((skill) =>
        selectedProficiencies.includes(skill.proficiency_level),
      );
    }

    // 검색 쿼리 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (skill) =>
          skill.preferred_label_ko.toLowerCase().includes(query) ||
          skill.preferred_label_en.toLowerCase().includes(query) ||
          skill.description_ko.toLowerCase().includes(query) ||
          skill.description_en.toLowerCase().includes(query),
      );
    }

    setFilteredSkills(filtered);
  }, [
    skills,
    selectedDomains,
    selectedRoles,
    selectedProficiencies,
    searchQuery,
  ]);

  return (
    <main className="page-container">
      {/* 헤더 */}
      <div className="page-header">
        <h1 className="page-title">로봇테크 for 스마트팩토리</h1>
        <p className="page-description">
          6개 도메인, 3개 역할, 4단계 숙련도의 {stats.totalSkills}개 로봇테크
          스킬 탐색
        </p>
      </div>

      {/* 통계 */}
      <div className="statistics-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalSkills}</div>
          <div className="stat-label">총 스킬</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.domainCount}</div>
          <div className="stat-label">도메인</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.roleDistribution.length}</div>
          <div className="stat-label">역할</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">4</div>
          <div className="stat-label">숙련도 단계</div>
        </div>
      </div>

      {/* 검색 & 필터 */}
      <div className="filter-panel">
        {/* 검색 */}
        <div className="search-section">
          <input
            type="text"
            placeholder="스킬명, 설명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {/* 도메인 필터 */}
        <div className="filter-section">
          <label className="filter-label">도메인</label>
          <div className="filter-chips">
            {domains.map((domain) => (
              <button
                key={domain}
                className={`filter-chip ${
                  selectedDomains.includes(domain) ? "active" : ""
                }`}
                onClick={() => {
                  if (selectedDomains.includes(domain)) {
                    setSelectedDomains(
                      selectedDomains.filter((d) => d !== domain),
                    );
                  } else {
                    setSelectedDomains([...selectedDomains, domain]);
                  }
                }}
              >
                {getDomainName(domain)}
              </button>
            ))}
          </div>
        </div>

        {/* 역할 필터 */}
        <div className="filter-section">
          <label className="filter-label">역할</label>
          <div className="filter-chips">
            {["operator", "engineer", "developer"].map((role) => (
              <button
                key={role}
                className={`filter-chip ${
                  selectedRoles.includes(role) ? "active" : ""
                }`}
                onClick={() => {
                  if (selectedRoles.includes(role)) {
                    setSelectedRoles(selectedRoles.filter((r) => r !== role));
                  } else {
                    setSelectedRoles([...selectedRoles, role]);
                  }
                }}
              >
                {role === "operator"
                  ? "조작자"
                  : role === "engineer"
                    ? "엔지니어"
                    : "개발자"}
              </button>
            ))}
          </div>
        </div>

        {/* 숙련도 필터 */}
        <div className="filter-section">
          <label className="filter-label">숙련도</label>
          <div className="filter-chips">
            {[1, 2, 3, 4].map((level) => (
              <button
                key={level}
                className={`filter-chip ${
                  selectedProficiencies.includes(level) ? "active" : ""
                }`}
                onClick={() => {
                  if (selectedProficiencies.includes(level)) {
                    setSelectedProficiencies(
                      selectedProficiencies.filter((l) => l !== level),
                    );
                  } else {
                    setSelectedProficiencies([...selectedProficiencies, level]);
                  }
                }}
              >
                {level === 1
                  ? "기초"
                  : level === 2
                    ? "중급"
                    : level === 3
                      ? "고급"
                      : "전문가"}
                (
                {stats.proficiencyDistribution.find((p) => p.level === level)
                  ?.count ?? 0}
                )
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 스킬 그리드 */}
      <div className="skills-section">
        <h2 className="section-title">스킬 목록 ({filteredSkills.length}개)</h2>
        {filteredSkills.length === 0 ? (
          <EmptyState
            message="검색 결과가 없습니다."
            action={
              <button
                onClick={() => {
                  setSelectedDomains([]);
                  setSelectedRoles([]);
                  setSelectedProficiencies([]);
                  setSearchQuery("");
                }}
                className="reset-button"
              >
                필터 초기화
              </button>
            }
          />
        ) : (
          <div className="skills-grid">
            {filteredSkills.map((skill) => {
              const rawDataUrl = `/data/robot-smartfactory/skills/${skill.skill_id}.json`;
              return (
                <div key={skill.skill_id} className="skill-card">
                  <div className="skill-header">
                    <h3 className="skill-name">
                      <Link href={`/skills/${skill.skill_id}`}>
                        {skill.preferred_label_ko}
                      </Link>
                    </h3>
                    <div className="skill-badges">
                      <span className="badge domain-badge">
                        {getDomainName(skill.domain)}
                      </span>
                      <span className="badge type-badge">
                        {skill.skill_type}
                      </span>
                    </div>
                  </div>
                  <p className="skill-description">{skill.description_ko}</p>
                  <div className="skill-footer">
                    <div className="skill-meta">
                      <span className="meta-item">
                        Level {skill.proficiency_level}
                      </span>
                      <span className="meta-item">{skill.skill_id}</span>
                      <span className="meta-item" title={skill.internal_uri}>
                        내부 ID
                      </span>
                      <a
                        className="meta-link"
                        href={rawDataUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Raw
                      </a>
                      <Link
                        className="meta-link"
                        href={`/skills/${skill.skill_id}`}
                      >
                        정의 보기
                      </Link>
                      {skill.esco_uri && (
                        <a
                          className="meta-link"
                          href={skill.esco_uri}
                          target="_blank"
                          rel="noreferrer"
                        >
                          ESCO
                        </a>
                      )}
                    </div>
                    <div className="skill-roles">
                      {skill.role_mapping.map((role) => (
                        <span key={role} className="role-badge">
                          {role === "operator"
                            ? "OP"
                            : role === "engineer"
                              ? "ENG"
                              : "DEV"}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .page-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .page-header {
          margin-bottom: 40px;
          text-align: center;
        }

        .page-title {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 12px;
          color: #1f2937;
        }

        .page-description {
          font-size: 1.1rem;
          color: #6b7280;
          margin: 0;
        }

        .statistics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 0.95rem;
          opacity: 0.9;
        }

        .filter-panel {
          background: #f9fafb;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 40px;
          border: 1px solid #e5e7eb;
        }

        .search-section {
          margin-bottom: 20px;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.3s;
        }

        .search-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .filter-section {
          margin-bottom: 20px;
        }

        .filter-section:last-child {
          margin-bottom: 0;
        }

        .filter-label {
          display: block;
          font-weight: 600;
          margin-bottom: 12px;
          color: #374151;
        }

        .filter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .filter-chip {
          padding: 8px 16px;
          background: white;
          border: 2px solid #d1d5db;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 0.95rem;
        }

        .filter-chip:hover {
          border-color: #667eea;
          background: #f3f4f6;
        }

        .filter-chip.active {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }

        .skills-section {
          margin-top: 40px;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 24px;
          color: #1f2937;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: #f9fafb;
          border-radius: 12px;
        }

        .empty-state p {
          font-size: 1.1rem;
          color: #6b7280;
          margin-bottom: 16px;
        }

        .reset-button {
          padding: 10px 24px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.3s;
        }

        .reset-button:hover {
          background: #5568d3;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .skills-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .skill-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.3s;
          cursor: pointer;
        }

        .skill-card:hover {
          border-color: #667eea;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          transform: translateY(-4px);
        }

        .skill-header {
          margin-bottom: 12px;
        }

        .skill-name {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0 0 8px 0;
          color: #1f2937;
        }

        .skill-name a {
          color: inherit;
          text-decoration: none;
        }

        .skill-name a:hover {
          color: #4f46e5;
        }

        .skill-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .domain-badge {
          background: #dbeafe;
          color: #1e40af;
        }

        .type-badge {
          background: #fecaca;
          color: #7f1d1d;
        }

        .skill-description {
          font-size: 0.95rem;
          color: #6b7280;
          margin: 12px 0;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .skill-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .skill-meta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          font-size: 0.85rem;
          color: #9ca3af;
        }

        .meta-item {
          font-weight: 500;
        }

        .meta-link {
          color: #4f46e5;
          font-weight: 600;
          text-decoration: none;
        }

        .meta-link:hover {
          text-decoration: underline;
        }

        .skill-roles {
          display: flex;
          gap: 4px;
        }

        .role-badge {
          background: #e0e7ff;
          color: #3730a3;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .loading {
          text-align: center;
          padding: 60px 20px;
          font-size: 1.1rem;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .page-title {
            font-size: 1.8rem;
          }

          .statistics-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .skills-grid {
            grid-template-columns: 1fr;
          }

          .filter-chips {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </main>
  );
}
