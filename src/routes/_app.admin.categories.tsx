import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { upsertCategory, deleteCategory, upsertStage, deleteStage } from "@/lib/factory.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/categories")({
  component: AdminCategories,
});

const ROLES = ["admin", "reception", "quality", "worker"] as const;
const SPECIALTIES = ["cutting", "embroidery", "sewing", "buttons", "ironing", "other"] as const;

function AdminCategories() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const upsert = useServerFn(upsertCategory);
  const del = useServerFn(deleteCategory);
  const [name, setName] = useState("");
  const [openCat, setOpenCat] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["cats-admin"],
    queryFn: async () => (await supabase.from("product_categories").select("*").order("name")).data ?? [],
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["cats-admin"] });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>{t("categories")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={async (e) => { e.preventDefault(); if (!name) return; await upsert({ data: { name } }); setName(""); refresh(); }} className="flex gap-2 mb-4">
            <Input placeholder={t("category_name")} value={name} onChange={(e) => setName(e.target.value)} />
            <Button type="submit">{t("add_category")}</Button>
          </form>
          <div className="space-y-2">
            {list.data?.map((c: any) => (
              <div key={c.id} className="border rounded-md">
                <div className="flex items-center gap-2 p-3">
                  <Input defaultValue={c.name} onBlur={async (e) => { if (e.target.value !== c.name) { await upsert({ data: { id: c.id, name: e.target.value } }); refresh(); } }} />
                  <Button size="sm" variant="outline" onClick={() => setOpenCat(openCat === c.id ? null : c.id)}>
                    {openCat === c.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={async () => { if (!confirm(t("confirm_delete"))) return; await del({ data: { id: c.id } }); refresh(); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {openCat === c.id && <StagesEditor categoryId={c.id} />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StagesEditor({ categoryId }: { categoryId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const upsert = useServerFn(upsertStage);
  const del = useServerFn(deleteStage);

  const stages = useQuery({
    queryKey: ["stages", categoryId],
    queryFn: async () => (await supabase.from("workflow_stages").select("*").eq("category_id", categoryId).order("order_index")).data ?? [],
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["stages", categoryId] });

  return (
    <div className="border-t p-3 bg-muted/30 space-y-2">
      <div className="text-sm font-medium">{t("stages_in_order")}</div>
      {(stages.data ?? []).map((s: any) => (
        <div key={s.id} className="flex items-center gap-2 text-sm bg-card border rounded-md p-2 flex-wrap">
          <span className="font-mono text-xs text-muted-foreground w-6">{s.order_index}</span>
          <span className="flex-1 font-medium">{s.label}</span>
          <span className="text-xs text-muted-foreground">{t(s.required_role)}{s.required_specialty && ` · ${t(`sp_${s.required_specialty}` as any)}`}</span>
          {s.is_quality && <span className="text-xs text-info">🔍 جودة</span>}
          {s.is_final_delivery && <span className="text-xs text-success">📦 تسليم</span>}
          <Button size="sm" variant="destructive" onClick={async () => { await del({ data: { id: s.id } }); refresh(); }}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <StageDialog categoryId={categoryId} nextIndex={(stages.data?.length ?? 0)} onSaved={refresh} />
    </div>
  );
}

function StageDialog({ categoryId, nextIndex, onSaved }: any) {
  const { t } = useI18n();
  const upsert = useServerFn(upsertStage);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [orderIndex, setOrderIndex] = useState(nextIndex);
  const [role, setRole] = useState<string>("worker");
  const [specialty, setSpecialty] = useState<string>("");
  const [isQuality, setIsQuality] = useState(false);
  const [isFinal, setIsFinal] = useState(false);

  const reset = () => { setLabel(""); setOrderIndex(nextIndex); setRole("worker"); setSpecialty(""); setIsQuality(false); setIsFinal(false); };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) reset(); }}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4 me-1" />{t("add_stage")}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("add_stage")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-sm">{t("stage_label")}</label><Input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm">الترتيب</label><Input type="number" min={0} value={orderIndex} onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)} /></div>
            <div>
              <label className="text-sm">{t("role")}</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{t(r as any)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {role === "worker" && (
            <div>
              <label className="text-sm">{t("specialty")}</label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{t(`sp_${s}` as any)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={isQuality} onCheckedChange={(v) => setIsQuality(!!v)} /> {t("is_quality_stage")}</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={isFinal} onCheckedChange={(v) => setIsFinal(!!v)} /> {t("is_final_stage")}</label>
        </div>
        <DialogFooter>
          <Button onClick={async () => {
            await upsert({ data: {
              category_id: categoryId, label, order_index: orderIndex,
              required_role: role as any, required_specialty: (specialty || null) as any,
              is_quality: isQuality, is_final_delivery: isFinal,
            } });
            onSaved();
            setOpen(false);
            toast.success(t("success"));
          }} disabled={!label}>{t("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
