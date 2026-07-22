"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Navigation.module.css";

const items = [
  { href: "/", label: "스킬", icon: "⚡" },
  { href: "/domains", label: "도메인", icon: "📂" },
  { href: "/organizations", label: "조직", icon: "🏢" },
  { href: "/competencies", label: "역량", icon: "▣" },
  { href: "/development-tracks", label: "육성", icon: "↗" },
  { href: "/reviews", label: "검수", icon: "✓" },
  { href: "/evaluation", label: "평가", icon: "◎" },
  { href: "/evaluation/skills", label: "스킬평가", icon: "✍" },
  { href: "/evaluation/clusters", label: "클러스터평가", icon: "◫" },
];

export default function Navigation() {
  const pathname = usePathname();

  // 가장 구체적인(가장 긴) 일치 항목 하나만 활성화한다.
  const activeHref = items
    .filter(
      (item) =>
        pathname === item.href ||
        (item.href !== "/" && pathname.startsWith(`${item.href}/`)),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className={styles.navigation} aria-label="주요 메뉴">
      <div className={styles.navContainer}>
        <Link href="/" className={styles.brand}>
          <span>🤖</span>
          <span>AI Factory Skill Fab</span>
        </Link>
        <div className={styles.navLinks}>
          {items.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${active ? styles.active : ""}`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
