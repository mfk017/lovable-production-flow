import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_app/invoices")({
  component: Invoices,
});

function Invoices() {
  const { t, lang } = useI18n();
  const q = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => (await supabase.from("orders").select("id, invoice_number, customer_name, product_name, quantity, created_at, status, branches(name)").order("created_at", { ascending: false }).limit(500)).data ?? [],
  });
  return (
    <Card>
      <CardHeader><CardTitle>{t("invoices")}</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-muted-foreground"><tr>
              <th className="text-start p-2">{t("invoice_number")}</th>
              <th className="text-start p-2">{t("customer")}</th>
              <th className="text-start p-2">{t("product")}</th>
              <th className="text-start p-2">{t("quantity")}</th>
              <th className="text-start p-2">{t("branch")}</th>
              <th className="text-start p-2">{t("created_at")}</th>
            </tr></thead>
            <tbody>
              {q.data?.map((o: any) => (
                <tr key={o.id} className="border-b hover:bg-accent/30">
                  <td className="p-2"><Link to="/orders/$id" params={{ id: o.id }} className="text-primary font-medium">{o.invoice_number}</Link></td>
                  <td className="p-2">{o.customer_name}</td>
                  <td className="p-2">{o.product_name}</td>
                  <td className="p-2">{o.quantity}</td>
                  <td className="p-2">{o.branches?.name}</td>
                  <td className="p-2 text-muted-foreground">{new Date(o.created_at).toLocaleDateString(lang === "ar" ? "ar" : "en")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
