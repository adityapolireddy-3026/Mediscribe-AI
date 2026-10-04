import { createFileRoute, Link } from "@tanstack/react-router";
import { DoctorOnly } from "@/components/dashboard/role-guards";
import { useMemo } from "react";
import {
  Users,
  Stethoscope,
  Sparkles,
  CalendarClock,
  ArrowRight,
  Mic,
  Pill,
  Clock,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePatients } from "@/hooks/use-patients";
import { useClinicalNotes, useConsultations, usePrescriptions } from "@/hooks/use-clinical";
import { EmptyState, PageHeader } from "@/components/dashboard/page-parts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Doctor Dashboard — MediScribe AI" },
      {
        name: "description",
        content: "Today's patients, consultations and AI notes at a glance.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <DoctorOnly area="The Doctor Dashboard">
      <DashboardPage />
    </DoctorOnly>
  ),
});

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
} as const;

function DashboardPage() {
  const { data: patients = [], isLoading } = usePatients("");
  const { data: consultations = [] } = useConsultations();
  const { data: notes = [] } = useClinicalNotes();
  const { data: prescriptions = [] } = usePrescriptions();

  const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

  const cards = [
    {
      label: "Today's patients",
      value: patients.filter((p) => isToday(p.created_at)).length,
      icon: Users,
    },
    {
      label: "Today's consultations",
      value: consultations.filter((c) => isToday(c.created_at)).length,
      icon: Stethoscope,
    },
    { label: "AI notes generated", value: notes.length, icon: Sparkles },
    {
      label: "Pending follow-ups",
      value: prescriptions.filter(
        (p) => p.follow_up_date && new Date(p.follow_up_date) >= new Date(new Date().toDateString()),
      ).length,
      icon: CalendarClock,
    },
  ];

  const growth = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleString("en", { month: "short" }),
      };
    });
    const bucket = (iso: string) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${d.getMonth()}`;
    };
    return months.map((m) => ({
      month: m.label,
      patients: patients.filter((p) => bucket(p.created_at) === m.key).length,
      consultations: consultations.filter((c) => bucket(c.created_at) === m.key).length,
    }));
  }, [patients, consultations]);

  const documentation = [
    { name: "Consultations", value: consultations.length, color: "var(--color-chart-1)" },
    { name: "Clinical notes", value: notes.length, color: "var(--color-chart-2)" },
    { name: "Prescriptions", value: prescriptions.length, color: "var(--color-chart-3)" },
  ].filter((d) => d.value > 0);

  const recent = consultations.slice(0, 5).map((c) => ({
    id: c.id,
    name: patients.find((p) => p.id === c.patient_id)?.full_name ?? "Patient",
    when: new Date(c.created_at).toLocaleString(),
    minutes: Math.max(1, Math.round((c.duration_seconds ?? 0) / 60)),
  }));

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle={
          isLoading ? "Loading your clinic…" : `${patients.length} patients in your record set.`
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/patients">
                Patients <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild>
              <Link to="/consultations">
                <Mic className="size-4" /> New consultation
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)
          : cards.map((c) => (
              <div key={c.label} className="surface-card p-5 transition-shadow hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{c.label}</span>
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <c.icon className="size-4" />
                  </span>
                </div>
                <p className="mt-3 font-display text-3xl font-extrabold">{c.value}</p>
              </div>
            ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="surface-card p-5">
          <h2 className="font-display text-base font-bold">Monthly consultations</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="consultations" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-5">
          <h2 className="font-display text-base font-bold">Patient growth</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="patients"
                  stroke="var(--color-chart-2)"
                  fill="var(--color-chart-2)"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="surface-card p-5">
          <h2 className="font-display text-base font-bold">Recent consultations</h2>
          {recent.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={Stethoscope}
                title="No consultations yet"
                body="Record your first consultation and AI will draft the clinical note for you."
                action={
                  <Button asChild className="mt-2">
                    <Link to="/consultations">
                      <Mic className="size-4" /> Start recording
                    </Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{r.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.when}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3.5" /> {r.minutes} min
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface-card p-5">
          <h2 className="font-display text-base font-bold">Documentation mix</h2>
          {documentation.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Charts populate once you create consultations, notes and prescriptions.
            </p>
          ) : (
            <div className="mt-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={documentation}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={54}
                    outerRadius={86}
                    paddingAngle={3}
                  >
                    {documentation.map((d) => (
                      <Cell key={d.name} fill={d.color} stroke="var(--color-card)" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-3 grid gap-2 text-xs">
            {documentation.map((d) => (
              <span key={d.name} className="flex items-center gap-2 text-muted-foreground">
                <span className="size-2.5 rounded-full" style={{ background: d.color }} />
                {d.name} — {d.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { to: "/consultations" as const, label: "Record consultation", icon: Mic },
          { to: "/clinical-notes" as const, label: "Edit SOAP notes", icon: Sparkles },
          { to: "/prescriptions" as const, label: "Write prescription", icon: Pill },
        ].map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="surface-card flex items-center gap-3 p-4 transition-transform duration-200 hover:scale-[1.02]"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <a.icon className="size-5" />
            </span>
            <span className="text-sm font-semibold">{a.label}</span>
            <ArrowRight className="ml-auto size-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
