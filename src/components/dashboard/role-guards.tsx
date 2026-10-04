import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole, homeRouteFor, type StaffRole } from "@/hooks/use-role";

/** Back-compatible admin check used across admin pages. */
export function useIsAdmin() {
  const { isAdmin, isLoading } = useRole();
  return { isAdmin, isLoading };
}

const ROLE_LABEL: Record<StaffRole, string> = {
  admin: "administrator",
  receptionist: "receptionist",
  doctor: "doctor",
};

export function AccessDenied({ area, allow }: { area: string; allow: StaffRole[] }) {
  const { role } = useRole();
  const allowed = allow.map((r) => ROLE_LABEL[r]).join(" or ");
  return (
    <div className="surface-card animate-fade-in mx-auto max-w-md p-8 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <ShieldAlert className="size-6" />
      </span>
      <h1 className="mt-3 font-display text-lg font-extrabold">Restricted area</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {area} is available to {allowed} accounts only. Your account is signed in as
        {role ? ` a ${ROLE_LABEL[role]}` : " a staff member"}.
      </p>
      <Button asChild className="mt-5">
        <Link to={homeRouteFor(role)}>Back to my dashboard</Link>
      </Button>
    </div>
  );
}

/** Renders children only for the allowed roles; anyone else sees a restriction notice. */
export function RequireRole({
  allow,
  area,
  children,
}: {
  allow: StaffRole[];
  area: string;
  children: React.ReactNode;
}) {
  const { role, isLoading } = useRole();
  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!role || !allow.includes(role)) return <AccessDenied area={area} allow={allow} />;
  return <>{children}</>;
}

/** Clinician-only pages (consultations, notes, prescriptions). */
export function DoctorOnly({ area, children }: { area: string; children: React.ReactNode }) {
  return (
    <RequireRole allow={["doctor"]} area={area}>
      {children}
    </RequireRole>
  );
}
