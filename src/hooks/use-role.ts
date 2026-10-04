import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StaffRole = "admin" | "receptionist" | "doctor";

export type RoleInfo = {
  role: StaffRole | null;
  status: string;
  fullName: string;
  email: string;
};

/** Resolves the signed-in staff member's role once and shares it across the app. */
export function useRole() {
  const query = useQuery({
    queryKey: ["current-role"],
    staleTime: 60_000,
    queryFn: async (): Promise<RoleInfo> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return { role: null, status: "active", fullName: "", email: "" };

      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", auth.user.id),
        supabase
          .from("profiles")
          .select("full_name, email, status")
          .eq("id", auth.user.id)
          .maybeSingle(),
      ]);

      const list = (roles ?? []).map((r) => r.role as StaffRole);
      const role: StaffRole | null = list.includes("admin")
        ? "admin"
        : list.includes("receptionist")
          ? "receptionist"
          : list.includes("doctor")
            ? "doctor"
            : null;

      return {
        role,
        status: profile?.status ?? "active",
        fullName: profile?.full_name ?? "",
        email: profile?.email ?? auth.user.email ?? "",
      };
    },
  });

  const info = query.data;
  return {
    role: info?.role ?? null,
    status: info?.status ?? "active",
    fullName: info?.fullName ?? "",
    email: info?.email ?? "",
    isAdmin: info?.role === "admin",
    isReceptionist: info?.role === "receptionist",
    isDoctor: info?.role === "doctor",
    isLoading: query.isLoading,
  };
}

/** Landing page for a role after sign in. */
export function homeRouteFor(role: StaffRole | null) {
  if (role === "admin") return "/admin" as const;
  if (role === "receptionist") return "/reception" as const;
  return "/dashboard" as const;
}
