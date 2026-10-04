import { createServerFn } from "@tanstack/react-start";

type Seed = {
  email: string;
  password: string;
  full_name: string;
  role: "admin" | "doctor" | "receptionist";
  specialty?: string;
  hospital?: string;
  registration_number?: string;
  department?: string;
  employee_id?: string;
  shift?: string;
};

const SEEDS: Seed[] = [
  {
    email: "admin@mediscribe.com",
    password: "Admin@123",
    full_name: "System Administrator",
    role: "admin",
    specialty: "Administration",
    hospital: "MediScribe AI",
    registration_number: "ADM001",
  },
  {
    email: "doctor@hospital.com",
    password: "Doctor@123",
    full_name: "Dr. Demo Clinician",
    role: "doctor",
    specialty: "General Physician",
    hospital: "KIMS Hospital, Vizag",
    registration_number: "APMC/00001/2024",
    department: "General Medicine",
  },
  {
    email: "reception@hospital.com",
    password: "Reception@123",
    full_name: "Front Desk Reception",
    role: "receptionist",
    hospital: "KIMS Hospital, Vizag",
    department: "General Medicine",
    employee_id: "REC001",
    shift: "Morning",
  },
];

/**
 * Development helper: ensures the demo admin/doctor accounts exist.
 * Passwords are hashed by the auth service; nothing is stored in plain text.
 */
export const seedDemoAccounts = createServerFn({ method: "POST" }).handler(async () => {
  if (process.env["NODE_ENV"] === "production") return { seeded: false as const };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const created: string[] = [];

  for (const seed of SEEDS) {
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let user = list?.users.find((u) => u.email?.toLowerCase() === seed.email);

    if (!user) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: seed.email,
        password: seed.password,
        email_confirm: true,
        user_metadata: {
          full_name: seed.full_name,
          specialty: seed.specialty,
          hospital: seed.hospital,
          registration_number: seed.registration_number,
        },
      });
      // Duplicate emails are rejected by the auth service - ignore and continue.
      if (error && !/already/i.test(error.message)) throw error;
      user = data?.user ?? undefined;
      if (user) created.push(seed.email);
    }

    if (!user) continue;

    await supabaseAdmin.from("profiles").upsert({
      id: user.id,
      email: seed.email,
      full_name: seed.full_name,
      specialty: seed.specialty ?? null,
      hospital: seed.hospital ?? null,
      registration_number: seed.registration_number ?? null,
      department: seed.department ?? null,
      employee_id: seed.employee_id ?? null,
      shift: seed.shift ?? null,
      status: "active",
    });

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (!roles?.some((r) => r.role === seed.role)) {
      await supabaseAdmin.from("user_roles").insert({ user_id: user.id, role: seed.role });
    }
    // The signup trigger grants "doctor" by default - keep exactly the demo role.
    if (seed.role !== "doctor") {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user.id).eq("role", "doctor");
    }
  }

  return { seeded: true as const, created };
});
