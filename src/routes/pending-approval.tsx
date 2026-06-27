import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/pending-approval")({
  component: Pending,
});

function Pending() {
  const { user, profile, roles, loading, refresh } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    if (!loading && profile?.approved && roles.length > 0) navigate({ to: "/dashboard" });
  }, [user, profile, roles, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/30">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-warning/15 text-warning flex items-center justify-center">
            <Clock className="h-7 w-7" />
          </div>
          <CardTitle>{t("pending_approval_title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">{t("pending_approval_body")}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => refresh()}>↻</Button>
            <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>
              {t("sign_out")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
