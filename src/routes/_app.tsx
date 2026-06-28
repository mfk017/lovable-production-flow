import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ClipboardList, Plus, Receipt, Users, Tag, Building2, LogOut, Languages, Loader2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, profile, roles, loading } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const { location } = useRouterState();

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!profile?.approved || roles.length === 0) { navigate({ to: "/pending-approval" }); return; }
  }, [user, profile, roles, loading, navigate]);

  if (loading || !user || !profile?.approved) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const isAdmin = roles.includes("admin");
  const isReception = roles.includes("reception") || isAdmin;

  const nav = [
    { to: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { to: "/orders", label: t("orders"), icon: ClipboardList },
    ...(isReception ? [{ to: "/orders/new", label: t("new_order"), icon: Plus }] : []),
    { to: "/invoices", label: t("invoices"), icon: Receipt },
    ...(isAdmin ? [
      { to: "/admin/users", label: t("users"), icon: Users },
      { to: "/admin/categories", label: t("categories"), icon: Tag },
      { to: "/admin/branches", label: t("branches"), icon: Building2 },
      { to: "/admin/password-audit", label: t("password_reset_audit"), icon: ShieldAlert },
    ] : []),

  ] as const;

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">M</div>
            <h1 className="font-bold text-lg hidden sm:block">{t("app_name")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground hidden md:block">
              {profile.full_name} · <span className="text-primary">{roles.map(r => t(r as any)).join(", ")}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
              <Languages className="h-4 w-4 me-1" /> {lang === "ar" ? "EN" : "ع"}
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
        <nav className="container mx-auto px-2 pb-2 flex gap-1 overflow-x-auto">
          {nav.map((n) => {
            const active = location.pathname === n.to || (n.to !== "/dashboard" && location.pathname.startsWith(n.to));
            const Icon = n.icon;
            return (
              <Link key={n.to} to={n.to} className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}>
                <Icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
