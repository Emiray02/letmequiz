"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ProfileMenu from "./profile-menu";
import AccountButton from "./account-button";
import CloudSyncProvider from "./cloud-sync-provider";
import { getMyProfile } from "@/lib/teacher-store";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

/* --- Inline icon set (lucide-style, stroke-only) ----------------- */
function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
const I = {
  home:    <Icon d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />,
  book:    <Icon d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 0 2 2h12" />,
  brain:   <Icon d="M9 4.5a3 3 0 0 0-3 3v.4A2.5 2.5 0 0 0 4 10.4v3.2A2.5 2.5 0 0 0 6 16v.5a3 3 0 0 0 3 3M15 4.5a3 3 0 0 1 3 3v.4a2.5 2.5 0 0 1 2 2.5v3.2a2.5 2.5 0 0 1-2 2.4v.5a3 3 0 0 1-3 3M12 4v16" />,
  pen:     <Icon d="M12 19l7-7-3-3-7 7v3zM14 6l4 4M5 19h4" />,
  mic:     <Icon d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3" />,
  read:    <Icon d="M3 5h7a3 3 0 0 1 3 3v11a2 2 0 0 0-2-2H3zM21 5h-7a3 3 0 0 0-3 3v11a2 2 0 0 1 2-2h8z" />,
  ear:     <Icon d="M6 12a6 6 0 1 1 12 0v3a3 3 0 0 1-6 0M9 9v3a3 3 0 0 0 3 3" />,
  target:  <Icon d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zM12 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />,
  folder:  <Icon d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  spark:   <Icon d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6 8 8M16 16l2.4 2.4M5.6 18.4 8 16M16 8l2.4-2.4" />,
  film:    <Icon d="M3 5h18v14H3zM3 9h18M3 15h18M7 5v14M17 5v14" />,
  letters: <Icon d="M5 19V8l3-3 4 6 4-6 3 3v11" />,
  rotate:  <Icon d="M3 12a9 9 0 0 1 15-6.7L21 8M21 4v4h-4M21 12a9 9 0 0 1-15 6.7L3 16M3 20v-4h4" />,
  blocks:  <Icon d="M3 5h7v7H3zM14 5h7v7h-7zM3 16h7v3H3zM14 12h7v7h-7z" />,
  chart:   <Icon d="M4 20h16M6 16V8M11 16v-4M16 16V4" />,
  layers:  <Icon d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5M3 18l9 5 9-5" />,
  classroom:<Icon d="M2 7l10-4 10 4-10 4zM6 9v5c0 1.7 2.7 3 6 3s6-1.3 6-3V9M22 7v6" />,
  kids:    <Icon d="M9 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM3 21v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1M17 7a3 3 0 1 1 0 6M21 21v-1a4 4 0 0 0-3-3.9" />,
};

/* --- Navigation structure ---------------------------------------- */
/**
 * Two-tier nav: a tiny essentials list (5–6 items) is always visible.
 * Less-used pages live behind a collapsible "Daha fazla" section.
 * The set of links depends on the user role (student vs teacher).
 */
type Section = { title: string; items: NavItem[]; collapsible?: boolean };

const STUDENT_PRIMARY: NavItem[] = [
  { href: "/",            label: "Ana sayfa",        icon: I.home },
  { href: "/heute",       label: "Bugün çalış",       icon: I.target },
  { href: "/wortschatz",  label: "Wortschatz",       icon: I.brain },
  { href: "/skills",      label: "Beceriler",        icon: I.layers },
  { href: "/grammar",     label: "Gramer",           icon: I.spark },
  { href: "/student",     label: "Ödev & öğretmenim", icon: I.kids },
];

const STUDENT_MORE: NavItem[] = [
  { href: "/grammar/lessons", label: "Konu anlatımı",    icon: I.book },
  { href: "/exam",            label: "Sınav planı (eski)", icon: I.target },
  { href: "/materials",       label: "telc materyalleri", icon: I.folder },
  { href: "/clips",           label: "Sitcom klipler",    icon: I.film },
  { href: "/news",            label: "Haberler",          icon: I.read },
  { href: "/fehlerheft",      label: "Hata defterim",     icon: I.book },
  { href: "/woche",           label: "Haftalık özet",     icon: I.chart },
  { href: "/ai-workbench",    label: "AI Tezgâh",         icon: I.spark },
  { href: "/library",         label: "Kütüphane",         icon: I.book },
  { href: "/data",            label: "Veri yedek",        icon: I.folder },
];

const TEACHER_PRIMARY: NavItem[] = [
  { href: "/",          label: "Ana sayfa",        icon: I.home },
  { href: "/teacher",   label: "Öğretmen paneli",  icon: I.kids },
  { href: "/library",   label: "Kütüphane",        icon: I.book },
  { href: "/materials", label: "telc materyalleri", icon: I.folder },
];

const TEACHER_MORE: NavItem[] = [
  { href: "/grammar/lessons", label: "Konu anlatımı", icon: I.book },
  { href: "/ai-workbench",    label: "AI Tezgâh",     icon: I.spark },
  { href: "/analytics",       label: "İstatistikler",  icon: I.chart },
  { href: "/data",            label: "Veri yedek",    icon: I.folder },
];

function sectionsFor(role: "student" | "teacher"): Section[] {
  if (role === "teacher") {
    return [
      { title: "Öğretmen", items: TEACHER_PRIMARY },
      { title: "Daha fazla", items: TEACHER_MORE, collapsible: true },
    ];
  }
  return [
    { title: "Öğrenci", items: STUDENT_PRIMARY },
    { title: "Daha fazla", items: STUDENT_MORE, collapsible: true },
  ];
}

/** Mobile bottom nav — 5 most-used destinations only. */
const BOTTOM_STUDENT: NavItem[] = [
  { href: "/",           label: "Ana",       icon: I.home },
  { href: "/heute",      label: "Bugün",     icon: I.target },
  { href: "/wortschatz", label: "Kelime",    icon: I.brain },
  { href: "/skills",     label: "Beceri",    icon: I.layers },
  { href: "/student",    label: "Ödevler",   icon: I.book },
];
const BOTTOM_TEACHER: NavItem[] = [
  { href: "/",           label: "Ana",       icon: I.home },
  { href: "/teacher",    label: "Panel",     icon: I.kids },
  { href: "/library",    label: "Setler",    icon: I.book },
  { href: "/materials",  label: "telc",      icon: I.folder },
  { href: "/ai-workbench", label: "AI",      icon: I.spark },
];

function isPathActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [moreOpen, setMoreOpen] = useState(false);

  // Detect role once on mount; default to "student" so first paint isn't blank.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await getMyProfile();
        if (!cancelled && p?.role === "teacher") setRole("teacher");
      } catch { /* not signed in or supabase missing — keep student */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const SECTIONS = useMemo(() => sectionsFor(role), [role]);
  const BOTTOM = role === "teacher" ? BOTTOM_TEACHER : BOTTOM_STUDENT;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Global keyboard shortcuts: press G then a letter
  useEffect(() => {
    const map: Record<string, string> = {
      h: "/", t: "/tagesziel", w: "/wortschatz", l: "/skills/lesen", o: "/skills/hoeren",
      s: "/skills/schreiben", k: "/skills/sprechen", g: "/grammar", f: "/fehlerheft",
      c: "/cloze", n: "/news", d: "/denken", e: "/exam", a: "/ai-workbench",
    };
    let waiting = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    function isFormElement(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    }
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isFormElement(e.target)) return;
      if (e.key === "?") { e.preventDefault(); router.push("/shortcuts"); return; }
      if (!waiting && e.key.toLowerCase() === "g") {
        waiting = true;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { waiting = false; }, 1200);
        return;
      }
      if (waiting) {
        const dest = map[e.key.toLowerCase()];
        waiting = false;
        if (timer) clearTimeout(timer);
        if (dest) { e.preventDefault(); router.push(dest); }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  // Close drawer on navigation
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  return (
    <div className="app-shell">
      <CloudSyncProvider />
      {/* Desktop sidebar */}
      <aside className="sidebar" aria-label="Birincil gezinme">
        <Link href="/" className="sidebar-brand">
          <span className="brand-mark" aria-hidden />
          <span>LetMeQuiz</span>
        </Link>
        {SECTIONS.map((sec) => {
          const collapsed = sec.collapsible && !moreOpen;
          return (
            <div key={sec.title}>
              {sec.collapsible ? (
                <button
                  type="button"
                  className="sidebar-section"
                  onClick={() => setMoreOpen((v) => !v)}
                  style={{
                    width: "100%", textAlign: "left", background: "transparent",
                    border: 0, cursor: "pointer", padding: "0.5rem 0.625rem",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                >
                  <span>{sec.title}</span>
                  <span style={{ fontSize: "0.8rem" }}>{moreOpen ? "▲" : "▼"}</span>
                </button>
              ) : (
                <div className="sidebar-section">{sec.title}</div>
              )}
              {!collapsed && sec.items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`sidebar-link${isPathActive(pathname, it.href) ? " active" : ""}`}
                >
                  {it.icon}
                  <span>{it.label}</span>
                </Link>
              ))}
            </div>
          );
        })}
        <div style={{ marginTop: "auto", padding: "1rem 0.625rem 0", display: "grid", gap: "0.5rem" }}>
          <AccountButton />
          <ProfileMenu />
        </div>
      </aside>

      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Mobile topbar */}
        <header className="topbar">
          <button
            type="button"
            className="drawer-toggle"
            aria-label="Menüyü aç"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/" className="topbar-brand">
            <span className="brand-mark" aria-hidden />
            <span>LetMeQuiz</span>
          </Link>
          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <AccountButton />
            <ProfileMenu />
          </div>
        </header>

        <main className="app-main">
          <div className="app-container">{children}</div>
        </main>
      </div>

      {/* Mobile drawer */}
      <div
        className={`drawer-backdrop${drawerOpen ? " open" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden
      />
      <aside className={`drawer${drawerOpen ? " open" : ""}`} aria-label="Mobil menü">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <Link href="/" className="sidebar-brand" style={{ marginBottom: 0 }}>
            <span className="brand-mark" aria-hidden />
            <span>LetMeQuiz</span>
          </Link>
          <button
            type="button"
            className="drawer-toggle"
            aria-label="Menüyü kapat"
            onClick={() => setDrawerOpen(false)}
            style={{ display: "inline-grid" }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {SECTIONS.map((sec) => {
          const collapsed = sec.collapsible && !moreOpen;
          return (
            <div key={sec.title}>
              {sec.collapsible ? (
                <button
                  type="button"
                  className="sidebar-section"
                  onClick={() => setMoreOpen((v) => !v)}
                  style={{
                    width: "100%", textAlign: "left", background: "transparent",
                    border: 0, cursor: "pointer", padding: "0.5rem 0.625rem",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}
                >
                  <span>{sec.title}</span>
                  <span style={{ fontSize: "0.8rem" }}>{moreOpen ? "▲" : "▼"}</span>
                </button>
              ) : (
                <div className="sidebar-section">{sec.title}</div>
              )}
              {!collapsed && sec.items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`sidebar-link${isPathActive(pathname, it.href) ? " active" : ""}`}
                >
                  {it.icon}
                  <span>{it.label}</span>
                </Link>
              ))}
            </div>
          );
        })}
      </aside>

      {/* Mobile bottom nav */}
      <nav className="bottomnav" aria-label="Hızlı gezinme">
        <div className="bottomnav-inner">
          {BOTTOM.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`bottomnav-link${isPathActive(pathname, it.href) ? " active" : ""}`}
            >
              {it.icon}
              <span>{it.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
