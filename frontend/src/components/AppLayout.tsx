import { useState } from "react";
import { Outlet, useLocation, Link, matchPath } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { AppOutletContext } from "../context/AppOutletContext";

export function AppLayout() {
  const { pathname } = useLocation();
  const [politicianName, setPoliticianName] = useState<string | null>(null);

  const isPoliticiansList = pathname === "/politicians";
  const isPoliticianProfile = Boolean(
    matchPath("/politicians/:id", pathname),
  );
  const simulateMatch = matchPath("/politicians/:id/simulate", pathname);

  return (
    <AppOutletContext.Provider value={{ setPoliticianName }}>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-10">
            <div className="ml-2 flex min-w-0 items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {simulateMatch ? (
                <>
                  <Link
                    to="/politicians"
                    className="transition hover:text-foreground"
                  >
                    Politicians
                  </Link>
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  <Link
                    to={`/politicians/${simulateMatch.params.id}`}
                    className="truncate text-gold transition hover:text-foreground"
                  >
                    {politicianName ?? "Member profile"}
                  </Link>
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  <span className="text-gold">Simulation</span>
                </>
              ) : isPoliticianProfile ? (
                <>
                  <Link
                    to="/politicians"
                    className="transition hover:text-foreground"
                  >
                    Politicians
                  </Link>
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  <span className="truncate text-gold">
                    {politicianName ?? "Member profile"}
                  </span>
                </>
              ) : isPoliticiansList ? (
                <span className="text-gold">Politicians</span>
              ) : (
                <span className="text-gold">Portfolio</span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-3">
              {isPoliticianProfile && (
                <div className="hidden items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground md:flex">
                  <Search className="h-3.5 w-3.5" />
                  <span>Search issuers, tickers…</span>
                </div>
              )}
              <Link
                to="/"
                className="text-xs text-muted-foreground transition hover:text-foreground"
              >
                InvestWhat
              </Link>
            </div>
          </header>
          <Outlet />
        </div>
      </div>
    </AppOutletContext.Provider>
  );
}
