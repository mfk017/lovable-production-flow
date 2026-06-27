import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Guard: only approved users can run actions
async function requireApproved(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.from("profiles").select("approved").eq("id", ctx.userId).maybeSingle();
  if (!data?.approved) throw new Error("Not approved");
}

async function requireAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
}

// ---------- Admin: users ----------
export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, full_name, username, specialty, approved, created_at")
      .order("created_at", { ascending: false });
    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role");
    return {
      users: (profiles ?? []).map((p: any) => ({
        ...p,
        roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
      })),
    };
  });

export const setUserApproved = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; approved: boolean }) =>
    z.object({ userId: z.string().uuid(), approved: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ approved: data.approved }).eq("id", data.userId);
    if (error) throw error;
    return { ok: true };
  });

export const setUserRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; roles: string[]; specialty?: string | null }) =>
    z
      .object({
        userId: z.string().uuid(),
        roles: z.array(z.enum(["admin", "reception", "quality", "worker"])),
        specialty: z.enum(["cutting", "embroidery", "sewing", "buttons", "ironing", "other"]).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    if (data.roles.length) {
      await supabaseAdmin.from("user_roles").insert(data.roles.map((r) => ({ user_id: data.userId, role: r })));
    }
    await supabaseAdmin.from("profiles").update({ specialty: data.specialty ?? null }).eq("id", data.userId);
    return { ok: true };
  });

// ---------- Branches ----------
export const upsertBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string; active?: boolean }) =>
    z.object({ id: z.string().uuid().optional(), name: z.string().min(1).max(100), active: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    if (data.id) {
      const { error } = await context.supabase.from("branches").update({ name: data.name, active: data.active ?? true }).eq("id", data.id);
      if (error) throw error;
    } else {
      const { error } = await context.supabase.from("branches").insert({ name: data.name });
      if (error) throw error;
    }
    return { ok: true };
  });

export const deleteBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("branches").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Categories ----------
export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; name: string }) =>
    z.object({ id: z.string().uuid().optional(), name: z.string().min(1).max(100) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    if (data.id) {
      const { error } = await context.supabase.from("product_categories").update({ name: data.name }).eq("id", data.id);
      if (error) throw error;
    } else {
      const { error } = await context.supabase.from("product_categories").insert({ name: data.name });
      if (error) throw error;
    }
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("product_categories").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Workflow stages ----------
export const upsertStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string;
    category_id: string;
    label: string;
    order_index: number;
    required_role: string;
    required_specialty?: string | null;
    is_quality?: boolean;
    is_final_delivery?: boolean;
  }) =>
    z
      .object({
        id: z.string().uuid().optional(),
        category_id: z.string().uuid(),
        label: z.string().min(1).max(100),
        order_index: z.number().int().min(0),
        required_role: z.enum(["admin", "reception", "quality", "worker"]),
        required_specialty: z.enum(["cutting", "embroidery", "sewing", "buttons", "ironing", "other"]).nullable().optional(),
        is_quality: z.boolean().optional(),
        is_final_delivery: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const payload = {
      category_id: data.category_id,
      label: data.label,
      order_index: data.order_index,
      required_role: data.required_role,
      required_specialty: data.required_specialty ?? null,
      is_quality: !!data.is_quality,
      is_final_delivery: !!data.is_final_delivery,
    };
    if (data.id) {
      const { error } = await context.supabase.from("workflow_stages").update(payload).eq("id", data.id);
      if (error) throw error;
    } else {
      const { error } = await context.supabase.from("workflow_stages").insert(payload);
      if (error) throw error;
    }
    return { ok: true };
  });

export const deleteStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("workflow_stages").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Workers list for stage ----------
export const listWorkersForStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { stageId: string }) => z.object({ stageId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await requireApproved(context);
    const { data: stage } = await context.supabase.from("workflow_stages").select("required_role, required_specialty").eq("id", data.stageId).maybeSingle();
    if (!stage) throw new Error("Stage not found");
    const { data: roles } = await context.supabase.from("user_roles").select("user_id").eq("role", stage.required_role);
    const userIds = (roles ?? []).map((r: any) => r.user_id);
    if (!userIds.length) return { workers: [] };
    let q = context.supabase.from("profiles").select("id, full_name, username, specialty").in("id", userIds).eq("approved", true);
    if (stage.required_specialty && stage.required_role === "worker") q = q.eq("specialty", stage.required_specialty);
    const { data: workers } = await q;
    return { workers: workers ?? [] };
  });

// ---------- Create order ----------
export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    category_id: string;
    branch_id: string;
    customer_name: string;
    product_name: string;
    quantity: number;
    notes?: string;
    first_assignee_id?: string;
  }) =>
    z
      .object({
        category_id: z.string().uuid(),
        branch_id: z.string().uuid(),
        customer_name: z.string().max(200).default(""),
        product_name: z.string().max(200).default(""),
        quantity: z.number().int().min(1).max(100000),
        notes: z.string().max(2000).optional(),
        first_assignee_id: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await requireApproved(context);
    // Must be reception or admin (policy enforces, but double-check for clearer error)
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    const r = (roles ?? []).map((x: any) => x.role);
    if (!r.includes("admin") && !r.includes("reception")) throw new Error("Only reception/admin can create orders");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // First stage
    const { data: firstStage, error: stageErr } = await supabaseAdmin
      .from("workflow_stages")
      .select("id")
      .eq("category_id", data.category_id)
      .order("order_index", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (stageErr) throw stageErr;
    if (!firstStage) throw new Error("This category has no workflow stages. Define them first.");

    // Invoice number
    const { data: inv, error: invErr } = await supabaseAdmin.rpc("next_invoice_number");
    if (invErr) throw invErr;

    const { data: order, error: oerr } = await supabaseAdmin
      .from("orders")
      .insert({
        invoice_number: inv,
        category_id: data.category_id,
        branch_id: data.branch_id,
        customer_name: data.customer_name,
        product_name: data.product_name,
        quantity: data.quantity,
        notes: data.notes ?? null,
        current_stage_id: firstStage.id,
        created_by: context.userId,
      })
      .select()
      .single();
    if (oerr) throw oerr;

    await supabaseAdmin.from("order_assignments").insert({
      order_id: order.id,
      stage_id: firstStage.id,
      assigned_to: data.first_assignee_id ?? null,
      assigned_by: context.userId,
      status: "pending",
    });

    await supabaseAdmin.from("order_history").insert({
      order_id: order.id,
      actor_id: context.userId,
      action: "created",
      to_stage_id: firstStage.id,
      to_user_id: data.first_assignee_id ?? null,
    });

    return { id: order.id, invoice_number: order.invoice_number };
  });

// ---------- Start current assignment ----------
export const startCurrentAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await requireApproved(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("current_stage_id").eq("id", data.orderId).maybeSingle();
    if (!order) throw new Error("Order not found");
    const { data: asg } = await supabaseAdmin
      .from("order_assignments")
      .select("*")
      .eq("order_id", data.orderId)
      .eq("stage_id", order.current_stage_id)
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!asg) throw new Error("No active assignment");
    if (asg.assigned_to && asg.assigned_to !== context.userId) throw new Error("Not your task");
    await supabaseAdmin
      .from("order_assignments")
      .update({ status: "in_progress", started_at: new Date().toISOString(), assigned_to: context.userId })
      .eq("id", asg.id);
    await supabaseAdmin.from("order_history").insert({
      order_id: data.orderId,
      actor_id: context.userId,
      action: "started",
    });
    return { ok: true };
  });

// ---------- Finish and hand over to next stage ----------
export const advanceStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string; nextAssigneeId?: string; notes?: string }) =>
    z.object({ orderId: z.string().uuid(), nextAssigneeId: z.string().uuid().optional(), notes: z.string().max(2000).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await requireApproved(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, current_stage_id, category_id, status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found");
    if (order.status === "completed") throw new Error("Order already completed");

    const { data: curStage } = await supabaseAdmin
      .from("workflow_stages")
      .select("*")
      .eq("id", order.current_stage_id)
      .maybeSingle();
    if (!curStage) throw new Error("Stage missing");

    const { data: asg } = await supabaseAdmin
      .from("order_assignments")
      .select("*")
      .eq("order_id", data.orderId)
      .eq("stage_id", order.current_stage_id)
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!asg) throw new Error("No active assignment");
    if (asg.assigned_to && asg.assigned_to !== context.userId) throw new Error("Not your task");

    await supabaseAdmin
      .from("order_assignments")
      .update({ status: "done", finished_at: new Date().toISOString(), assigned_to: context.userId, notes: data.notes ?? asg.notes })
      .eq("id", asg.id);

    // If final delivery stage -> complete order
    if (curStage.is_final_delivery) {
      await supabaseAdmin
        .from("orders")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", order.id);
      await supabaseAdmin.from("order_history").insert({
        order_id: order.id,
        actor_id: context.userId,
        action: "delivered",
        from_stage_id: curStage.id,
      });
      return { ok: true, completed: true };
    }

    // Next stage
    const { data: nextStage } = await supabaseAdmin
      .from("workflow_stages")
      .select("*")
      .eq("category_id", order.category_id)
      .gt("order_index", curStage.order_index)
      .order("order_index", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!nextStage) {
      // No next: complete
      await supabaseAdmin
        .from("orders")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", order.id);
      return { ok: true, completed: true };
    }

    await supabaseAdmin
      .from("orders")
      .update({ current_stage_id: nextStage.id })
      .eq("id", order.id);

    await supabaseAdmin.from("order_assignments").insert({
      order_id: order.id,
      stage_id: nextStage.id,
      assigned_to: data.nextAssigneeId ?? null,
      assigned_by: context.userId,
      status: "pending",
    });

    await supabaseAdmin.from("order_history").insert({
      order_id: order.id,
      actor_id: context.userId,
      action: "handover",
      from_stage_id: curStage.id,
      to_stage_id: nextStage.id,
      to_user_id: data.nextAssigneeId ?? null,
      notes: data.notes ?? null,
    });

    return { ok: true };
  });

// ---------- Quality return ----------
export const qualityReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string; returnToStageId: string; responsibleUserId?: string; reason: string }) =>
    z
      .object({
        orderId: z.string().uuid(),
        returnToStageId: z.string().uuid(),
        responsibleUserId: z.string().uuid().optional(),
        reason: z.string().min(1).max(2000),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await requireApproved(context);
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    const r = (roles ?? []).map((x: any) => x.role);
    if (!r.includes("quality") && !r.includes("admin")) throw new Error("Quality only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", data.orderId).maybeSingle();
    if (!order) throw new Error("Order not found");

    // Close current active assignment as returned
    await supabaseAdmin
      .from("order_assignments")
      .update({ status: "returned", finished_at: new Date().toISOString() })
      .eq("order_id", data.orderId)
      .eq("stage_id", order.current_stage_id)
      .in("status", ["pending", "in_progress"]);

    // Open assignment on returnTo stage
    await supabaseAdmin.from("order_assignments").insert({
      order_id: data.orderId,
      stage_id: data.returnToStageId,
      assigned_to: data.responsibleUserId ?? null,
      assigned_by: context.userId,
      status: "pending",
      is_return: true,
      return_reason: data.reason,
    });

    await supabaseAdmin
      .from("orders")
      .update({
        current_stage_id: data.returnToStageId,
        flagged: true,
        flag_reason: data.reason,
        status: "flagged",
      })
      .eq("id", data.orderId);

    await supabaseAdmin.from("order_history").insert({
      order_id: data.orderId,
      actor_id: context.userId,
      action: "quality_return",
      from_stage_id: order.current_stage_id,
      to_stage_id: data.returnToStageId,
      to_user_id: data.responsibleUserId ?? null,
      notes: data.reason,
    });

    return { ok: true };
  });

// ---------- Clear flag (admin) ----------
export const clearFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("orders")
      .update({ flagged: false, flag_reason: null, status: "in_progress" })
      .eq("id", data.orderId);
    return { ok: true };
  });
