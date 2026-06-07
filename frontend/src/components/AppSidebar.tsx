import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Crown,
} from "lucide-react";

const nav = [
  { title: "Portfolio", to: "/", icon: LayoutDashboard, end: true },
  {
    title: "Politicians",
    to: "/politicians",
    icon: Users,
    end: false,
  },
];

export function AppSidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:w-60">
      <div className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gold text-primary-foreground">
            <Crown className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-sm font-bold tracking-tight text-foreground">
              CAPITOL
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-gold">
              Insider Track
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <div className="mb-2 px-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Navigation
        </div>
        <ul className="space-y-1">
          {nav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  }`
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
