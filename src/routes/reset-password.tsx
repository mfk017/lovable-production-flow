import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { logPasswordResetEvent } from "@/lib/password-reset.functions";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const logEvent = useServerFn(logPasswordResetEvent);
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase puts a recovery session into the URL hash; the client picks it up automatically.
    supabase.auth.getSession().then(({ data }) => {
      setValid(!!data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setValid(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) {
      toast.error(t("passwords_no_match"));
      return;
    }
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      try {
        await logEvent({
          data: {
            email: userData.user?.email ?? "",
            event: "completed",
            userId: userData.user?.id ?? null,
          },
        });
      } catch {}
      toast.success(t("password_updated"));
      await supabase.auth.signOut();
      navigate({ to: "/auth" });
    } catch (err: any) {
      toast.error(err.message || t("error_occurred"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-accent/20 p-4">
      <div className="w-full max-w-md">
        <Card className="border-border/60 shadow-lg">
          <CardHeader>
            <CardTitle>{t("update_password")}</CardTitle>
          </CardHeader>
          <CardContent>
            {!ready ? (
              <p className="text-muted-foreground">{t("loading")}</p>
            ) : !valid ? (
              <div className="space-y-4">
                <p className="text-destructive">{t("invalid_reset_link")}</p>
                <Button onClick={() => navigate({ to: "/auth" })} className="w-full">
                  {t("back_to_signin")}
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label htmlFor="np">{t("new_password")}</Label>
                  <Input id="np" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} />
                </div>
                <div>
                  <Label htmlFor="np2">{t("confirm_new_password")}</Label>
                  <Input id="np2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? t("loading") : t("update_password")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
