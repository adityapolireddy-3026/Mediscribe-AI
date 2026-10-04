import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Save } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-parts";
import { useIsAdmin, AccessDenied } from "@/components/dashboard/role-guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/hospital-settings")({
  head: () => ({
    meta: [
      { title: "Hospital Settings — MediScribe AI Admin" },
      {
        name: "description",
        content:
          "Configure hospital identity, contact details and documentation footer used across MediScribe AI.",
      },
      { property: "og:title", content: "Hospital Settings — MediScribe AI Admin" },
      {
        property: "og:description",
        content: "Hospital-wide identity and documentation preferences for administrators.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HospitalSettingsPage,
});

const STORAGE_KEY = "mediscribe.hospital-settings";

type HospitalSettings = {
  name: string;
  address: string;
  phone: string;
  email: string;
  footer: string;
};

const EMPTY: HospitalSettings = { name: "", address: "", phone: "", email: "", footer: "" };

function HospitalSettingsPage() {
  const { isAdmin, isLoading } = useIsAdmin();
  const [values, setValues] = useState<HospitalSettings>(EMPTY);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setValues({ ...EMPTY, ...(JSON.parse(raw) as Partial<HospitalSettings>) });
    } catch {
      /* ignore malformed local settings */
    }
  }, []);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!isAdmin) return <AccessDenied area="Hospital Settings" allow={["admin"]} />;

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    toast.success("Hospital settings saved");
  }

  const fields: Array<{ key: keyof HospitalSettings; label: string; placeholder: string }> = [
    { key: "name", label: "Hospital name", placeholder: "City General Hospital" },
    { key: "phone", label: "Contact number", placeholder: "+91 98765 43210" },
    { key: "email", label: "Contact email", placeholder: "records@hospital.com" },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Hospital Settings"
        subtitle="Institution identity used on clinical documents and reports."
      />

      <div className="surface-card max-w-2xl space-y-5 p-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Building2 className="size-4" />
          </span>
          <p className="text-sm text-muted-foreground">
            These details appear on prescriptions and downloadable reports.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className={f.key === "name" ? "sm:col-span-2" : undefined}>
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                value={values[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="mt-1.5"
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={values.address}
              placeholder="Street, city, state, PIN"
              onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))}
              className="mt-1.5"
              rows={3}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="footer">Document footer note</Label>
            <Textarea
              id="footer"
              value={values.footer}
              placeholder="This document is computer generated and valid without signature."
              onChange={(e) => setValues((v) => ({ ...v, footer: e.target.value }))}
              className="mt-1.5"
              rows={2}
            />
          </div>
        </div>

        <Button onClick={save}>
          <Save className="size-4" /> Save settings
        </Button>
      </div>
    </div>
  );
}
