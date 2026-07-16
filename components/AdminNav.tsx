"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/knowledge", label: "Knowledge Base" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-oui-border dark:border-oui-border-dark">
      <div className="mx-auto max-w-6xl px-4 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`px-4 py-3 text-sm border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? "border-oui-maroon text-oui-maroon dark:text-oui-gold dark:border-oui-gold font-medium"
                  : "border-transparent text-oui-muted hover:text-oui-navy dark:hover:text-oui-gold"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
