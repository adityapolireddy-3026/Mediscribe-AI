import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Stethoscope, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — MediScribe AI" },
      {
        name: "description",
        content: "Choose a new password for your MediScribe AI clinician account.",
      },
      { property: "og:title", content: "Reset Password — MediScribe AI" },
      {
        property: "og:description",
        content: "Set a new password for your MediScribe AI account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    const parsed = z.string().min(8, "Password must be at least 8 characters").safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    toast.success("Password updated. You're signed in.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="gradient-surface flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <Link to="/" className="mb-8 flex items-center gap-2.5">
        <span className="gradient-clinical flex size-9 items-center justify-center rounded-xl text-primary-foreground">
          <Stethoscope className="size-5" />
        </span>
        <span className="font-display text-lg font-extrabold">
          MediScribe<span className="text-primary"> AI</span>
        </span>
      </Link>

      <form onSubmit={handleSubmit} className="surface-card w-full max-w-md space-y-4 p-7">
        <div>
          <h1 className="font-display text-xl font-extrabold">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter a new password for your clinician account.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!error}
              className="pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Updating…
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </div>
  );
}
