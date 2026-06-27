import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { upsertBranch, deleteBranch } from "@/lib/factory.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/admin/branches")({
  component: AdminBranches,
});

function AdminBranches() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const upsert = useServerFn(upsertBranch);
  const del = useServerFn(deleteBranch);
  const [name, setName] = useState("");

  const list = useQuery({
    queryKey: ["branches-admin"],
    queryFn: async () => (await supabase.from("branches").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["branches-admin"] });

  return (
    <Card>
      <CardHeader><CardTitle>{t("branches")}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={async (e) => { e.preventDefault(); if (!name) return; await upsert({ data: { name } }); setName(""); refresh(); }} className="flex gap-2 mb-4">
          <Input placeholder={t("branch_name")} value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit">{t("add_branch")}</Button>
        </form>
        <div className="space-y-2">
          {list.data?.map((b: any) => (
            <EditableRow key={b.id} item={b} placeholder={t("branch_name")} onSave={async (n) => { await upsert({ data: { id: b.id, name: n } }); refresh(); toast.success(t("success")); }} onDelete={async () => { if (!confirm(t("confirm_delete"))) return; await del({ data: { id: b.id } }); refresh(); }} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function EditableRow({ item, placeholder, onSave, onDelete }: any) {
  const [val, setVal] = useState(item.name);
  return (
    <div className="flex gap-2 items-center">
      <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder={placeholder} />
      <Button size="sm" variant="outline" onClick={() => onSave(val)}>حفظ</Button>
      <Button size="sm" variant="destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}
