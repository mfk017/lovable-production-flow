import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { createOrder, listWorkersForStage } from "@/lib/factory.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/orders/new")({
  component: NewOrder,
});

function NewOrder() {
  const { t } = useI18n();
  const { roles } = useAuth();
  const navigate = useNavigate();
  const create = useServerFn(createOrder);
  const fetchWorkers = useServerFn(listWorkersForStage);

  const canCreate = roles.includes("admin") || roles.includes("reception");

  const cats = useQuery({
    queryKey: ["cats-active"],
    queryFn: async () => (await supabase.from("product_categories").select("id, name").eq("active", true).order("name")).data ?? [],
  });
  const branches = useQuery({
    queryKey: ["branches-active"],
    queryFn: async () => (await supabase.from("branches").select("id, name").eq("active", true).order("name")).data ?? [],
  });

  const [categoryId, setCategoryId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [customer, setCustomer] = useState("");
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [firstAssigneeId, setFirstAssigneeId] = useState<string>("");
  const [workers, setWorkers] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  // Load first stage workers
  const onCatChange = async (id: string) => {
    setCategoryId(id);
    setFirstAssigneeId("");
    setWorkers([]);
    const { data: stage } = await supabase
      .from("workflow_stages")
      .select("id")
      .eq("category_id", id)
      .order("order_index", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!stage) return;
    const res = await fetchWorkers({ data: { stageId: stage.id } });
    setWorkers(res.workers);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await create({ data: {
        category_id: categoryId,
        branch_id: branchId,
        customer_name: customer,
        product_name: product,
        quantity,
        notes: notes || undefined,
        first_assignee_id: firstAssigneeId || undefined,
      }});
      toast.success(`${t("success")}: ${res.invoice_number}`);
      navigate({ to: "/orders/$id", params: { id: res.id } });
    } catch (err: any) {
      toast.error(err.message);
    } finally { setBusy(false); }
  };

  if (!canCreate) return <p className="text-muted-foreground">Not allowed</p>;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader><CardTitle>{t("new_order")}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>{t("category")}</Label>
              <Select value={categoryId} onValueChange={onCatChange}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{cats.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("branch")}</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{branches.data?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("customer")}</Label>
              <Input value={customer} onChange={(e) => setCustomer(e.target.value)} maxLength={200} />
            </div>
            <div>
              <Label>{t("product")}</Label>
              <Input value={product} onChange={(e) => setProduct(e.target.value)} maxLength={200} />
            </div>
            <div>
              <Label>{t("quantity")}</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} required />
            </div>
            <div>
              <Label>{t("next_worker")} ({t("stages_in_order")})</Label>
              <Select value={firstAssigneeId} onValueChange={setFirstAssigneeId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.full_name} {w.username ? `(@${w.username})` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>{t("notes")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
          </div>
          <Button type="submit" disabled={busy || !categoryId || !branchId}>{busy ? t("loading") : t("create")}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
