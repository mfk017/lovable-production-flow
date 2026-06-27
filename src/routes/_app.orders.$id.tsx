import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  startCurrentAssignment, advanceStage, qualityReturn, listWorkersForStage, clearFlag,
} from "@/lib/factory.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Loader2, AlertTriangle, CheckCircle2, ArrowLeft, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/orders/$id")({
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const { t, lang } = useI18n();
  const { user, roles } = useAuth();
  const qc = useQueryClient();

  const order = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, branches(name), product_categories(id, name), workflow_stages!current_stage_id(id, label, is_quality, order_index)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const stages = useQuery({
    queryKey: ["stages-for-category", order.data?.category_id],
    enabled: !!order.data?.category_id,
    queryFn: async () => (await supabase
      .from("workflow_stages")
      .select("*")
      .eq("category_id", order.data!.category_id)
      .order("order_index")).data ?? [],
  });

  const assignments = useQuery({
    queryKey: ["order-assignments", id],
    queryFn: async () => (await supabase
      .from("order_assignments")
      .select("*, workflow_stages(label), assignee:profiles!order_assignments_assigned_to_fkey(full_name, username)")
      .eq("order_id", id)
      .order("created_at", { ascending: true })).data ?? [],
  });

  const history = useQuery({
    queryKey: ["order-history", id],
    queryFn: async () => (await supabase
      .from("order_history")
      .select("*, actor:profiles!order_history_actor_id_fkey(full_name), to_user:profiles!order_history_to_user_id_fkey(full_name), from_stage:workflow_stages!order_history_from_stage_id_fkey(label), to_stage:workflow_stages!order_history_to_stage_id_fkey(label)")
      .eq("order_id", id)
      .order("created_at", { ascending: false })).data ?? [],
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["order", id] });
    qc.invalidateQueries({ queryKey: ["order-assignments", id] });
    qc.invalidateQueries({ queryKey: ["order-history", id] });
    qc.invalidateQueries({ queryKey: ["my-tasks"] });
    qc.invalidateQueries({ queryKey: ["flagged-orders"] });
  };

  const startFn = useServerFn(startCurrentAssignment);
  const advanceFn = useServerFn(advanceStage);
  const qrFn = useServerFn(qualityReturn);
  const clearFn = useServerFn(clearFlag);
  const fetchWorkers = useServerFn(listWorkersForStage);

  if (order.isLoading) return <Loader2 className="animate-spin" />;
  if (!order.data) return <p>Not found</p>;

  const o = order.data;
  const currentStage = (o as any).workflow_stages;
  const currentAsg = (assignments.data ?? []).filter((a: any) => a.stage_id === o.current_stage_id && (a.status === "pending" || a.status === "in_progress")).slice(-1)[0];
  const isMyTask = currentAsg?.assigned_to === user?.id;
  const isQualityStage = currentStage?.is_quality;
  const canQualityAct = (roles.includes("quality") || roles.includes("admin")) && isQualityStage;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{o.invoice_number}</h2>
            {o.flagged && <Badge variant="destructive"><AlertTriangle className="h-3 w-3 me-1" />{t("has_alert")}</Badge>}
            {o.status === "completed" && <Badge className="bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3 me-1" />{t("completed")}</Badge>}
          </div>
          <p className="text-muted-foreground text-sm">{o.product_name || o.customer_name} · {(o as any).product_categories?.name} · {(o as any).branches?.name}</p>
        </div>
        {o.flagged && roles.includes("admin") && (
          <Button variant="outline" size="sm" onClick={async () => { await clearFn({ data: { orderId: id } }); refresh(); toast.success(t("success")); }}>
            مسح التنبيه
          </Button>
        )}
      </div>

      {o.flag_reason && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-4 text-destructive">⚠ {o.flag_reason}</CardContent>
        </Card>
      )}

      {/* Workflow strip */}
      <Card>
        <CardHeader><CardTitle>{t("workflow")}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(stages.data ?? []).map((s: any) => {
              const isCurrent = s.id === o.current_stage_id;
              const isPast = currentStage && s.order_index < currentStage.order_index;
              return (
                <div key={s.id} className={cn(
                  "px-3 py-2 rounded-md text-sm border",
                  isCurrent ? "bg-primary text-primary-foreground border-primary" :
                  isPast ? "bg-success/20 text-success-foreground border-success/30" :
                  "bg-muted text-muted-foreground"
                )}>
                  {s.label} {s.is_quality && "🔍"} {s.is_final_delivery && "📦"}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {o.status !== "completed" && currentAsg && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{currentStage?.label}</CardTitle>
            <div className="text-sm text-muted-foreground">
              {t("assigned_to")}: {(currentAsg as any).assignee?.full_name ?? "—"}
              {(currentAsg as any).is_return && <span className="text-destructive ms-2">↩ {(currentAsg as any).return_reason}</span>}
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {!canQualityAct && isMyTask && currentAsg.status === "pending" && (
              <Button onClick={async () => { await startFn({ data: { orderId: id } }); refresh(); }}>
                <Play className="h-4 w-4 me-1" />{t("start_task")}
              </Button>
            )}
            {!canQualityAct && isMyTask && (
              <FinishDialog onFinish={async (assigneeId, notes) => {
                await advanceFn({ data: { orderId: id, nextAssigneeId: assigneeId || undefined, notes } });
                refresh();
                toast.success(t("success"));
              }} categoryId={o.category_id} currentStageOrder={currentStage?.order_index ?? 0} fetchWorkers={fetchWorkers} />
            )}
            {canQualityAct && (
              <>
                <Button onClick={async () => { await advanceFn({ data: { orderId: id } }); refresh(); toast.success(t("success")); }}>
                  <CheckCircle2 className="h-4 w-4 me-1" />{t("quality_pass")}
                </Button>
                <QualityReturnDialog stages={stages.data ?? []} fetchWorkers={fetchWorkers} onSubmit={async (returnTo, who, reason) => {
                  await qrFn({ data: { orderId: id, returnToStageId: returnTo, responsibleUserId: who || undefined, reason } });
                  refresh();
                  toast.success(t("success"));
                }} />
              </>
            )}
            {!isMyTask && !canQualityAct && (
              <p className="text-sm text-muted-foreground">المهمة موكلة لشخص آخر</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader><CardTitle>{t("history")}</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {(history.data ?? []).map((h: any) => (
              <li key={h.id} className="border-s-2 border-border ps-3 py-1">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{h.action}</span>
                  <span className="text-muted-foreground text-xs">{new Date(h.created_at).toLocaleString(lang === "ar" ? "ar" : "en")}</span>
                </div>
                <div className="text-muted-foreground text-xs">
                  {h.actor?.full_name} {h.from_stage?.label && `· ${h.from_stage.label} →`} {h.to_stage?.label} {h.to_user?.full_name && `· ${h.to_user.full_name}`}
                </div>
                {h.notes && <div className="text-xs mt-1">{h.notes}</div>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function FinishDialog({ onFinish, categoryId, currentStageOrder, fetchWorkers }: any) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [workers, setWorkers] = useState<any[]>([]);
  const [assignee, setAssignee] = useState("");
  const [notes, setNotes] = useState("");
  const [hasNext, setHasNext] = useState(true);

  const onOpen = async (o: boolean) => {
    setOpen(o);
    if (o) {
      const { data: next } = await supabase
        .from("workflow_stages")
        .select("id")
        .eq("category_id", categoryId)
        .gt("order_index", currentStageOrder)
        .order("order_index")
        .limit(1)
        .maybeSingle();
      if (!next) { setHasNext(false); return; }
      setHasNext(true);
      const res = await fetchWorkers({ data: { stageId: next.id } });
      setWorkers(res.workers);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogTrigger asChild><Button><ArrowLeft className="h-4 w-4 me-1" />{t("finish_and_assign")}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("finish_and_assign")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {hasNext ? (
            <div>
              <label className="text-sm">{t("next_worker")}</label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ) : <p className="text-sm text-muted-foreground">{t("deliver_to_branch")}</p>}
          <div>
            <label className="text-sm">{t("notes")}</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={async () => { await onFinish(assignee, notes); setOpen(false); }}>{t("submit")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QualityReturnDialog({ stages, fetchWorkers, onSubmit }: any) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [stageId, setStageId] = useState("");
  const [workers, setWorkers] = useState<any[]>([]);
  const [who, setWho] = useState("");
  const [reason, setReason] = useState("");

  const onStage = async (sid: string) => {
    setStageId(sid);
    setWho("");
    const res = await fetchWorkers({ data: { stageId: sid } });
    setWorkers(res.workers);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="destructive"><RotateCcw className="h-4 w-4 me-1" />{t("quality_return")}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("quality_return")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm">{t("return_to_stage")}</label>
            <Select value={stageId} onValueChange={onStage}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{stages.filter((s: any) => !s.is_quality).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm">{t("responsible_worker")}</label>
            <Select value={who} onValueChange={setWho}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm">{t("return_reason")}</label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} required maxLength={2000} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="destructive" disabled={!stageId || !reason} onClick={async () => { await onSubmit(stageId, who, reason); setOpen(false); }}>{t("submit")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
