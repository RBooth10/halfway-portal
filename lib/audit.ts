import { getSupabaseClient } from "@/lib/supabase";

type AuditLogInput = {
  providerId: string;
  action: string;
  tableName: string;
  recordId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  reason?: string | null;
};

export async function createAuditLog({
  providerId,
  action,
  tableName,
  recordId = null,
  oldValues = null,
  newValues = null,
  reason = null,
}: AuditLogInput) {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("audit_logs").insert({
    provider_id: providerId,
    action,
    table_name: tableName,
    record_id: recordId,
    old_values: oldValues,
    new_values: newValues,
    reason,
  });

  if (error) {
    console.warn("Audit log failed:", error.message);
  }
}
