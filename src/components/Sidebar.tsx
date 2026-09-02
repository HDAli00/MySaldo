"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/accounts", label: "Accounts" },
  { href: "/transactions", label: "Transactions" },
  { href: "/budgets", label: "Budgets" },
  { href: "/forecast", label: "Forecast" },
  { href: "/rules", label: "Rules" },
  { href: "/imports", label: "Imports" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-56 shrink-0 border-r border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
