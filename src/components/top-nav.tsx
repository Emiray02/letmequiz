import Link from "next/link";

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/ai-workbench", label: "AI Çalışma" },
  { href: "/create", label: "Yeni Set" },
  { href: "/classroom", label: "Sınıf" },
  { href: "/parent", label: "Veli" },
  { href: "/analytics", label: "Analiz" },
];

type TopNavProps = {
  active?: string;
};

export default function TopNav({ active }: TopNavProps) {
  return (
    <header className="topnav">
      <div className="app-container topnav-inner">
        <Link href="/" className="brand" aria-label="LetMeQuiz ana sayfa">
          <span className="brand-mark">Lq</span>
          <span>LetMeQuiz</span>
        </Link>

        <nav className="nav-links" aria-label="Birincil gezinme">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${active === item.href ? " active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/ai-workbench" className="btn btn-ghost btn-sm">
            AI Çalışma
          </Link>
          <Link href="/create" className="btn btn-primary btn-sm">
            Yeni Set
          </Link>
        </div>
      </div>
    </header>
  );
}
