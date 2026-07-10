"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { collegeColor } from "../lib/college-ui";
import DomainSkillBrowser, {
  type BrowserChangeRequest,
  type BrowserCollege,
  type BrowserSkill,
} from "./DomainSkillBrowser";
import styles from "./DomainSkillTreemap.module.css";

export interface TreemapSubcategory {
  id: string;
  name: string;
  skills: BrowserSkill[];
}

export interface TreemapCollege {
  id: string;
  name: string;
  role: string;
  skillCount: number;
  subcategories: TreemapSubcategory[];
}

interface DomainSkillTreemapProps {
  collegeBlocks: TreemapCollege[];
  colleges: BrowserCollege[];
  sessionEvaluatorName: string | null;
  initialChangeRequests: BrowserChangeRequest[];
}

export default function DomainSkillTreemap({
  collegeBlocks,
  colleges,
  sessionEvaluatorName,
  initialChangeRequests,
}: DomainSkillTreemapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const totalSkills = useMemo(
    () => collegeBlocks.reduce((sum, block) => sum + block.skillCount, 0),
    [collegeBlocks],
  );

  const selected = useMemo(() => {
    for (const block of collegeBlocks) {
      const subcategory = block.subcategories.find(
        (item) => item.id === selectedId,
      );
      if (subcategory) {
        return { college: block, subcategory };
      }
    }
    return null;
  }, [collegeBlocks, selectedId]);

  return (
    <section className={styles.wrapper} aria-labelledby="skill-treemap-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>SKILL TREEMAP</p>
          <h2 id="skill-treemap-title">도메인별 스킬 트리맵</h2>
          <span>
            면적은 스킬 수에 비례합니다. 4대 도메인 → 중간분류 → 스킬의 3단
            체계이며, 중간분류 타일을 클릭하면 소속 스킬을 바로 확인하고
            도메인 변경요청을 접수할 수 있습니다.
          </span>
        </div>
        <strong>총 {totalSkills}개 스킬</strong>
      </div>

      <div className={styles.scrollArea}>
        <div
          aria-label="4대 도메인별 스킬 분포 트리맵"
          className={styles.treemap}
          role="group"
        >
          {collegeBlocks.map((block) => {
            const color = collegeColor(block.id);
            return (
              <div
                className={styles.collegeColumn}
                key={block.id}
                style={{ flexGrow: block.skillCount }}
              >
                <div
                  className={styles.collegeHeader}
                  style={{ background: color }}
                >
                  <span className={styles.collegeName}>{block.name}</span>
                  <span className={styles.collegeCount}>
                    {block.skillCount}
                  </span>
                </div>
                <div className={styles.tileStack}>
                  {block.subcategories.map((subcategory) => {
                    const count = subcategory.skills.length;
                    const isSelected = selectedId === subcategory.id;
                    return (
                      <button
                        aria-pressed={isSelected}
                        className={
                          isSelected
                            ? `${styles.tile} ${styles.tileSelected}`
                            : styles.tile
                        }
                        key={subcategory.id}
                        onClick={() =>
                          setSelectedId(isSelected ? null : subcategory.id)
                        }
                        style={{
                          flexGrow: count,
                          background: `color-mix(in srgb, ${color} 14%, var(--bg-card))`,
                          borderLeftColor: color,
                        }}
                        title={`${block.name} › ${subcategory.name} · ${count}개 스킬`}
                        type="button"
                      >
                        <span className={styles.tileName}>
                          {subcategory.name}
                        </span>
                        <span className={styles.tileCount}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selected ? (
        <div className={styles.detailPanel}>
          <div className={styles.detailHead}>
            <div>
              <p
                className={styles.detailPath}
                style={{ color: collegeColor(selected.college.id) }}
              >
                {selected.college.name} › {selected.subcategory.name}
              </p>
              <span className={styles.detailMeta}>
                {selected.subcategory.skills.length}개 스킬 ·{" "}
                <Link href={`/domains/college/${selected.college.id}`}>
                  도메인 전체 보기 →
                </Link>
              </span>
            </div>
            <button
              className={styles.closeButton}
              onClick={() => setSelectedId(null)}
              type="button"
            >
              닫기
            </button>
          </div>
          <DomainSkillBrowser
            colleges={colleges}
            defaultOpen
            evaluatorName={sessionEvaluatorName}
            initialRequests={initialChangeRequests.filter((request) =>
              selected.subcategory.skills.some(
                (skill) => skill.skillId === request.skillId,
              ),
            )}
            key={selected.subcategory.id}
            skills={selected.subcategory.skills}
            toggleLabel={selected.subcategory.name}
          />
        </div>
      ) : (
        <p className={styles.hint}>
          중간분류 타일을 클릭하면 소속 스킬 목록과 도메인 변경요청 기능이
          열립니다.
        </p>
      )}
    </section>
  );
}
