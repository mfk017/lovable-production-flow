import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listPasswordResetAudit } from "@/lib/password-reset.functions";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/admin/password-audit")({
  component: PasswordAuditPage,
});

function PasswordAuditPage() {
  const { t } = useI18n();
  const fetchAudit = useServerFn(listPasswordResetAudit);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAudit()
      .then((r) => setRows(r.rows))
      .finally(() => setLoading(false));
  }, [fetchAudit]);

  return (
    <div className="container mx-auto px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("password_reset_audit")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">—</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-start">
                  <tr className="border-b">
                    <th className="py-2 px-2 text-start">{t("email")}</th>
                    <th className="py-2 px-2 text-start">{t("actions")}</th>
                    <th className="py-2 px-2 text-start">IP</th>
                    <th className="py-2 px-2 text-start">{t("created_at" as any)}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="py-2 px-2">{r.email}</td>
                      <td className="py-2 px-2">
                        <Badge variant={r.event === "completed" ? "default" : "secondary"}>
                          {r.event === "completed" ? t("event_completed") : t("event_requested")}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 font-mono text-xs">{r.ip || "—"}</td>
                      <td className="py-2 px-2 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
