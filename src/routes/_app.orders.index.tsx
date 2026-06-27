import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/orders/")({
  component: OrdersList,
});

function OrdersList() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const orders = useQuery({
    queryKey: ["orders-list", status],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("id, invoice_number, customer_name, product_name, quantity, status, flagged, created_at, branches(name), product_categories(name), workflow_stages(label)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (status !== "all") query = query.eq("status", status as any);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (orders.data ?? []).filter((o: any) =>
    !q || o.invoice_number.toLowerCase().includes(q.toLowerCase()) ||
    (o.customer_name ?? "").toLowerCase().includes(q.toLowerCase()) ||
    (o.product_name ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("orders")}</CardTitle>
        <div className="flex flex-wrap gap-2 pt-2">
          <Input placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter_all")}</SelectItem>
              <SelectItem value="in_progress">{t("in_progress")}</SelectItem>
              <SelectItem value="completed">{t("completed")}</SelectItem>
              <SelectItem value="flagged">{t("flagged")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {orders.isLoading ? <Loader2 className="animate-spin" /> :
        filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="text-start p-2">{t("invoice_number")}</th>
                  <th className="text-start p-2">{t("product")}</th>
                  <th className="text-start p-2">{t("category")}</th>
                  <th className="text-start p-2">{t("branch")}</th>
                  <th className="text-start p-2">{t("current_stage")}</th>
                  <th className="text-start p-2">{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o: any) => (
                  <tr key={o.id} className="border-b hover:bg-accent/30">
                    <td className="p-2"><Link to="/orders/$id" params={{ id: o.id }} className="text-primary font-medium hover:underline">{o.invoice_number}</Link></td>
                    <td className="p-2">{o.product_name || o.customer_name}</td>
                    <td className="p-2">{o.product_categories?.name}</td>
                    <td className="p-2">{o.branches?.name}</td>
                    <td className="p-2">{o.workflow_stages?.label ?? "—"}</td>
                    <td className="p-2">
                      {o.flagged ? <Badge variant="destructive"><AlertTriangle className="h-3 w-3 me-1" />{t("flagged")}</Badge>
                        : <Badge variant={o.status === "completed" ? "default" : "secondary"}>{t(o.status)}</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-muted-foreground">{t("no_data")}</p>}
      </CardContent>
    </Card>
  );
}
