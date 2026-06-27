import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { listAllUsers, setUserApproved, setUserRoles } from "@/lib/factory.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/users")({
  component: AdminUsers,
});

const ROLES = ["admin", "reception", "quality", "worker"] as const;
const SPECIALTIES = ["cutting", "embroidery", "sewing", "buttons", "ironing", "other"] as const;

function AdminUsers() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const list = useServerFn(listAllUsers);
  const approveFn = useServerFn(setUserApproved);

  const users = useQuery({ queryKey: ["all-users"], queryFn: () => list() });

  const pending = (users.data?.users ?? []).filter((u: any) => !u.approved);
  const approved = (users.data?.users ?? []).filter((u: any) => u.approved);

  const refresh = () => qc.invalidateQueries({ queryKey: ["all-users"] });

  if (users.isLoading) return <Loader2 className="animate-spin" />;

  return (
    <div className="space-y-4">
      <Card className="border-warning/40">
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-warning" />{t("pending_users")}</CardTitle></CardHeader>
        <CardContent>
          {pending.length === 0 ? <p className="text-muted-foreground text-sm">{t("no_pending_users")}</p> :
            <div className="space-y-2">
              {pending.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between border rounded-md p-3 flex-wrap gap-2">
                  <div>
                    <div className="font-medium">{u.full_name || "(بدون اسم)"} {u.username && <span className="text-muted-foreground text-sm">@{u.username}</span>}</div>
                  </div>
                  <div className="flex gap-2">
                    <EditUserDialog user={u} onSaved={refresh} />
                    <Button size="sm" onClick={async () => { await approveFn({ data: { userId: u.id, approved: true } }); refresh(); toast.success(t("success")); }}>{t("approve")}</Button>
                  </div>
                </div>
              ))}
            </div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("approved_users")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {approved.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between border rounded-md p-3 flex-wrap gap-2">
                <div>
                  <div className="font-medium">{u.full_name} {u.username && <span className="text-muted-foreground text-sm">@{u.username}</span>}</div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {u.roles.map((r: string) => <Badge key={r} variant="secondary">{t(r as any)}</Badge>)}
                    {u.specialty && <Badge variant="outline">{t(`sp_${u.specialty}` as any)}</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <EditUserDialog user={u} onSaved={refresh} />
                  <Button size="sm" variant="outline" onClick={async () => { await approveFn({ data: { userId: u.id, approved: false } }); refresh(); }}>{t("revoke")}</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EditUserDialog({ user, onSaved }: any) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<string[]>(user.roles ?? []);
  const [specialty, setSpecialty] = useState<string>(user.specialty ?? "");
  const setRolesFn = useServerFn(setUserRoles);

  const toggle = (r: string) => setRoles((cur) => cur.includes(r) ? cur.filter(x => x !== r) : [...cur, r]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">{t("set_role")}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{user.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium mb-2">{t("role")}</div>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={roles.includes(r)} onCheckedChange={() => toggle(r)} /> {t(r as any)}
                </label>
              ))}
            </div>
          </div>
          {roles.includes("worker") && (
            <div>
              <div className="text-sm font-medium mb-2">{t("specialty")}</div>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{t(`sp_${s}` as any)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={async () => {
            await setRolesFn({ data: { userId: user.id, roles: roles as any, specialty: (specialty || null) as any } });
            onSaved();
            setOpen(false);
            toast.success(t("success"));
          }}>{t("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
