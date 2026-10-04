import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Profile Settings — MediScribe AI" },
      { name: "description", content: "Update your clinician profile details." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [hospital, setHospital] = useState("");

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      setEmail(auth.user?.email ?? "");
      const { data } = await supabase
        .from("profiles")
        .select("full_name, specialty, hospital")
        .eq("id", auth.user?.id ?? "")
        .maybeSingle();
      if (data) {
        setFullName(data.full_name ?? "");
        setSpecialty(data.specialty ?? "");
        setHospital(data.hospital ?? "");
      }
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim().slice(0, 120),
        specialty: specialty.trim().slice(0, 120),
        hospital: hospital.trim().slice(0, 160),
      })
      .eq("id", auth.user?.id ?? "");
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated");
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These details appear on your clinical notes and prescriptions.
        </p>
      </div>
      <form className="surface-card space-y-4 p-6" onSubmit={save}>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="spec">Specialty</Label>
          <Input id="spec" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hosp">Hospital / clinic</Label>
          <Input id="hosp" value={hospital} onChange={(e) => setHospital(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading || saving}>
          Save changes
        </Button>
      </form>
    </div>
  );
}
