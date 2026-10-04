import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, BadgeCheck, Mail, Phone, Stethoscope, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — MediScribe AI" },
      { name: "description", content: "View your clinician profile used on notes and prescriptions." },
      { property: "og:title", content: "My Profile — MediScribe AI" },
      { property: "og:description", content: "View your clinician profile details." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, specialty, hospital, phone, registration_number, email")
        .eq("id", auth.user?.id ?? "")
        .maybeSingle();
      return { profile, email: auth.user?.email ?? profile?.email ?? "" };
    },
  });

  const rows = [
    { label: "Specialization", value: data?.profile?.specialty, icon: Stethoscope },
    { label: "Hospital / clinic", value: data?.profile?.hospital, icon: Building2 },
    { label: "Email", value: data?.email, icon: Mail },
    { label: "Phone", value: data?.profile?.phone, icon: Phone },
    { label: "Registration number", value: data?.profile?.registration_number, icon: BadgeCheck },
  ];

  const name = data?.profile?.full_name?.trim() || "Clinician";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="max-w-2xl space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">My profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            These details appear on your clinical notes and prescriptions.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/settings">
            <Settings className="size-4" /> Edit
          </Link>
        </Button>
      </div>

      <div className="surface-card p-6">
        <div className="flex min-w-0 items-center gap-4">
          <span className="gradient-clinical flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-primary-foreground">
            {initials || "DR"}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-extrabold">{name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {data?.profile?.specialty || "General Physician"}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="min-w-0 rounded-xl border border-border bg-muted/40 p-3">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <row.icon className="size-3.5 shrink-0" /> {row.label}
              </dt>
              <dd className="mt-1 truncate text-sm font-medium">
                {isLoading ? "Loading…" : row.value || "—"}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
