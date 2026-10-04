import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StaffRole = "doctor" | "receptionist";

export type StaffProfileInput = {
  full_name: string;
  email: string;
  phone?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  specialty?: string | null;
  registration_number?: string | null;
  qualification?: string | null;
  experience_years?: number | null;
  department?: string | null;
  hospital?: string | null;
  branch?: string | null;
  employee_id?: string | null;
  shift?: string | null;
  joining_date?: string | null;
  status?: string;
};

/** Throws unless the caller holds the admin role. Roles are read with the caller's own token. */
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Administrator access required");
}

function clean(input: StaffProfileInput) {
  return {
    full_name: input.full_name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    gender: input.gender || null,
    date_of_birth: input.date_of_birth || null,
    address: input.address?.trim() || null,
    specialty: input.specialty || null,
    registration_number: input.registration_number?.trim() || null,
    qualification: input.qualification?.trim() || null,
    experience_years:
      input.experience_years == null || Number.isNaN(input.experience_years)
        ? null
        : Number(input.experience_years),
    department: input.department || null,
    hospital: input.hospital?.trim() || null,
    branch: input.branch?.trim() || null,
    employee_id: input.employee_id?.trim() || null,
    shift: input.shift || null,
    joining_date: input.joining_date || null,
    status: input.status === "inactive" ? "inactive" : "active",
  };
}

/** Admin-only: creates a doctor or receptionist login plus their staff profile. */
export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { role: StaffRole; password: string; profile: StaffProfileInput }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.profile.full_name?.trim()) throw new Error("Full name is required");
    if (!data.profile.email?.trim()) throw new Error("Email is required");
    if (!data.password || data.password.length < 1)
      throw new Error("Temporary password is required");
    if (data.role !== "doctor" && data.role !== "receptionist")
      throw new Error("Only doctor and receptionist accounts can be created");

    const values = clean(data.profile);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const created = await supabaseAdmin.auth.admin.createUser({
      email: values.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: values.full_name },
    });
    if (created.error) {
      throw new Error(
        /already/i.test(created.error.message)
          ? "An account with this email already exists."
          : created.error.message,
      );
    }
    const userId = created.data.user?.id;
    if (!userId) throw new Error("Account could not be created");

    const profile = await supabaseAdmin.from("profiles").upsert({ id: userId, ...values });
    if (profile.error) throw new Error(profile.error.message);

    // The signup trigger grants "doctor" by default; keep exactly the requested role.
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const role = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role });
    if (role.error) throw new Error(role.error.message);

    return { id: userId };
  });

/** Admin-only: updates a staff profile and optionally resets their password. */
export const updateStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id: string; profile: StaffProfileInput; password?: string | null }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const values = clean(data.profile);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const profile = await supabaseAdmin.from("profiles").update(values).eq("id", data.id);
    if (profile.error) throw new Error(profile.error.message);

    if (data.password) {
      if (data.password.length < 8)
        throw new Error("New password must contain at least 8 characters");
      const reset = await supabaseAdmin.auth.admin.updateUserById(data.id, {
        password: data.password,
      });
      if (reset.error) throw new Error(reset.error.message);
    }
    return { id: data.id };
  });

/** Admin-only: activates or deactivates a staff account. Inactive accounts cannot sign in. */
export const setStaffStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: "active" | "inactive" }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id === context.userId) throw new Error("You cannot deactivate your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.auth.admin.updateUserById(data.id, {
      ban_duration: data.status === "inactive" ? "876000h" : "none",
    });
    return { id: data.id, status: data.status };
  });

/** Admin-only: removes a staff account entirely. */
export const deleteStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id === context.userId) throw new Error("You cannot remove your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });
