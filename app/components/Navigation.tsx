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
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className={styles.navigation} aria-label="주요 메뉴">
      <div className={styles.navContainer}>
        <Link href="/" className={styles.brand}>
          <span>🤖</span>
          <span>Factory Robotics</span>
        </Link>
        <div className={styles.navLinks}>
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
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
