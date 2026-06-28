import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const eventSchema = z.object({
  email: z.string().email().max(255),
  event: z.enum(["requested", "completed"]),
  userId: z.string().uuid().optional().nullable(),
});

// Public log endpoint (recovery flow may not have a session yet for "requested")
export const logPasswordResetEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => eventSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ip =
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
      getRequestHeader("cf-connecting-ip") ||
      null;
    const ua = getRequestHeader("user-agent") || null;
    await supabaseAdmin.from("password_reset_audit").insert({
      email: data.email,
      event: data.event,
      user_id: data.userId ?? null,
      ip,
      user_agent: ua,
    });
    return { ok: true };
  });

// Admin: read audit log
export const listPasswordResetAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin only");
    const { data, error } = await context.supabase
      .from("password_reset_audit")
      .select("id, email, event, ip, user_agent, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return { rows: data ?? [] };
  });
