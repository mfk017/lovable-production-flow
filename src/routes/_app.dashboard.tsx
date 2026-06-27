import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ClipboardList, CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { t } = useI18n();

  const tasks = useQuery({
    queryKey: ["my-tasks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_assignments")
        .select("id, status, is_return, return_reason, created_at, order_id, orders(invoice_number, customer_name, product_name, flagged, status), workflow_stages(label)")
        .eq("assigned_to", user!.id)
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const flagged = useQuery({
    queryKey: ["flagged-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, invoice_number, customer_name, flag_reason, product_name")
        .eq("flagged", true)
        .order("updated_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [a, b, c] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("flagged", true),
      ]);
      return { inProgress: a.count ?? 0, completed: b.count ?? 0, flagged: c.count ?? 0 };
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={ClipboardList} color="info" label={t("in_progress")} value={stats.data?.inProgress ?? "—"} />
        <StatCard icon={CheckCircle2} color="success" label={t("completed")} value={stats.data?.completed ?? "—"} />
        <StatCard icon={AlertTriangle} color="destructive" label={t("flagged")} value={stats.data?.flagged ?? "—"} />
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />{t("my_tasks")}</CardTitle></CardHeader>
        <CardContent>
          {tasks.isLoading ? <Loader2 className="animate-spin" /> :
            tasks.data?.length ? (
              <div className="space-y-2">
                {tasks.data.map((tk: any) => (
                  <Link key={tk.id} to="/orders/$id" params={{ id: tk.order_id }} className="flex items-center justify-between rounded-md border p-3 hover:bg-accent transition-colors">
                    <div>
                      <div className="font-medium">{tk.orders?.invoice_number} — {tk.orders?.product_name || tk.orders?.customer_name}</div>
                      <div className="text-sm text-muted-foreground">{tk.workflow_stages?.label}</div>
                      {tk.is_return && <div className="text-xs text-destructive mt-1">↩ {tk.return_reason}</div>}
                    </div>
                    <Badge variant={tk.status === "in_progress" ? "default" : "secondary"}>{t(tk.status)}</Badge>
                  </Link>
                ))}
              </div>
            ) : <p className="text-muted-foreground text-sm">{t("no_data")}</p>}
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" />{t("flagged_orders")}</CardTitle></CardHeader>
        <CardContent>
          {flagged.data?.length ? (
            <div className="space-y-2">
              {flagged.data.map((o) => (
                <Link key={o.id} to="/orders/$id" params={{ id: o.id }} className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 p-3 hover:bg-destructive/10">
                  <div>
                    <div className="font-medium">{o.invoice_number} — {o.product_name || o.customer_name}</div>
                    <div className="text-sm text-destructive">{o.flag_reason}</div>
                  </div>
                  <Badge variant="destructive">{t("has_alert")}</Badge>
                </Link>
              ))}
            </div>
          ) : <p className="text-muted-foreground text-sm">{t("no_data")}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value }: any) {
  const colorMap: any = {
    info: "bg-info/15 text-info",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
  };
  return (
    <Card>
      <CardContent className="pt-6 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-lg grid place-items-center ${colorMap[color]}`}><Icon className="h-6 w-6" /></div>
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
