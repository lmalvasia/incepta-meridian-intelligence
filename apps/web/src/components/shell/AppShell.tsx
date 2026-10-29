import { NavLink, Outlet } from "react-router";
import { QuickAnalysis } from "../analysis/QuickAnalysis";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Overview", end: true },
  { to: "/revenue", label: "Revenue", end: false },
  { to: "/accounts", label: "Accounts", end: false },
  { to: "/data-quality", label: "Data quality", end: false },
];

export function AppShell() {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold tracking-tight">Meridian</span>
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex flex-wrap gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-3 py-1.5 text-sm",
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 pb-24">
        <Outlet />
      </main>
      <QuickAnalysis />
    </div>
  );
}
