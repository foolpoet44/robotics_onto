"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "스킬", icon: "⚡" },
  { href: "/domains", label: "도메인", icon: "📂" },
  { href: "/organizations", label: "조직", icon: "🏢" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="navigation" aria-label="주요 메뉴">
      <div className="nav-container">
        <Link href="/" className="brand">
          <span>🤖</span>
          <span>Factory Robotics</span>
        </Link>
        <div className="nav-links">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active ? "active" : ""}`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
      <style jsx>{`
        .navigation {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.94);
          border-bottom: 1px solid var(--border-color);
          backdrop-filter: blur(12px);
        }
        .nav-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0.85rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .brand,
        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
        }
        .brand {
          color: var(--text-primary);
          font-weight: 800;
          font-size: 1.2rem;
        }
        .nav-links {
          display: flex;
          gap: 0.35rem;
        }
        .nav-link {
          color: var(--text-secondary);
          padding: 0.6rem 0.85rem;
          border-radius: 0.7rem;
          font-weight: 700;
        }
        .nav-link:hover,
        .nav-link.active {
          color: var(--color-primary-dark);
          background: #eef2ff;
        }
        @media (max-width: 560px) {
          .brand span:last-child {
            display: none;
          }
          .nav-link {
            padding: 0.55rem 0.65rem;
          }
        }
      `}</style>
    </nav>
  );
}
