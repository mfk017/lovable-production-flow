import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { logPasswordResetEvent } from "@/lib/password-reset.functions";


export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { t, lang, setLang } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const logEvent = useServerFn(logPasswordResetEvent);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);


  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, username },
          },
        });
        if (error) throw error;
        toast.success(t("success"));
        navigate({ to: "/pending-approval" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message || t("error_occurred"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-accent/20 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">{t("app_name")}</h1>
          <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="text-sm text-muted-foreground hover:text-foreground">
            {lang === "ar" ? "EN" : "ع"}
          </button>
        </div>
        <Card className="border-border/60 shadow-lg">
          <CardHeader>
            <CardTitle>{mode === "signin" ? t("welcome_back") : t("create_account")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <div>
                    <Label htmlFor="fn">{t("full_name")}</Label>
                    <Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} />
                  </div>
                  <div>
                    <Label htmlFor="un">{t("username")}</Label>
                    <Input id="un" value={username} onChange={(e) => setUsername(e.target.value)} required maxLength={50} pattern="[a-zA-Z0-9_]+" />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="em">{t("email")}</Label>
                <Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="pw">{t("password")}</Label>
                <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? t("loading") : mode === "signin" ? t("sign_in") : t("sign_up")}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                {mode === "signin" ? t("no_account") : t("have_account")}{" "}
                <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary font-medium underline">
                  {mode === "signin" ? t("sign_up") : t("sign_in")}
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
