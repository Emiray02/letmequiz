"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navItems } from "./bottom-nav";
import ProfileMenu from "./profile-menu";

type TopNavProps = {
  /** Manuel aktif yolu zorla (server bileşenlerinden gerekirse). */
  active?: string;
};

export default function TopNav({ active }: TopNavProps) {
  const pathname = usePathname() ?? "/";
  const currentPath = active ?? pathname;
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  function isActive(href: string) {
    if (href === "/") return currentPath === "/";
    return currentPath === href || currentPath.startsWith(href + "/");
  }

  return (
    <>
      <header className="topnav">
        <div className="app-container topnav-inner">
          <Link href="/" className="brand" aria-label="LetMeQuiz ana sayfa" onClick={() => setDrawerOpen(false)}>
            <span className="brand-mark">Lq</span>
            <span>LetMeQuiz</span>
            <span className="chip chip-accent" style={{ marginLeft: "0.4rem" }}>DE</span>
          </Link>

          <nav className="nav-links" aria-label="Birincil gezinme">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link${isActive(item.href) ? " active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="topnav-actions">
            <Link href="/ai-workbench" className="btn btn-secondary btn-sm hidden md:inline-flex">
              Notlarımı yükle
            </Link>
            <Link href="/deutsch" className="btn btn-primary btn-sm">
              Çalışmaya başla
            </Link>
            <ProfileMenu />
            <button
              type="button"
              className="drawer-toggle"
              aria-label="Menüyü aç"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div
        className={`drawer-backdrop${drawerOpen ? " open" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden
      />
      <aside className={`drawer${drawerOpen ? " open" : ""}`} aria-label="Mobil menü">
        <div className="flex items-center justify-between">
          <span className="brand"><span className="brand-mark">Lq</span> LetMeQuiz</span>
          <button
            type="button"
            className="drawer-toggle"
            aria-label="Menüyü kapat"
            onClick={() => setDrawerOpen(false)}
            style={{ display: "inline-grid" }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <hr className="divider-soft" />
        <nav className="flex flex-col gap-1" aria-label="Mobil gezinme">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${isActive(item.href) ? " active" : ""}`}
              onClick={() => setDrawerOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <hr className="divider-soft" />
          <Link href="/create" className="nav-link" onClick={() => setDrawerOpen(false)}>Yeni set oluştur</Link>
          <Link href="/classroom" className="nav-link" onClick={() => setDrawerOpen(false)}>Sınıf modu</Link>
          <Link href="/parent" className="nav-link" onClick={() => setDrawerOpen(false)}>Veli paneli</Link>
        </nav>
        <div className="mt-auto text-xs text-[color:var(--fg-subtle)]">
          LetMeQuiz · Almanca öğrenme stüdyosu
        </div>
      </aside>
    </>
  );
}
