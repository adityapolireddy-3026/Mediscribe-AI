import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Stethoscope,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  UserRound,
  ChevronDown,
  AlertCircle,
  Sparkles,
  Mail,
  Lock,
  ConciergeBell,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import authIllustration from "@/assets/auth-illustration.jpg";
import { seedDemoAccounts } from "@/lib/demo-accounts.functions";
import { homeRouteFor, type StaffRole } from "@/hooks/use-role";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff Sign In — MediScribe AI" },
      {
        name: "description",
        content:
          "Secure sign in for doctors, receptionists and administrators — access consultations, patient records and AI clinical notes.",
      },
      { property: "og:title", content: "Staff Sign In — MediScribe AI" },
      {
        property: "og:description",
        content: "Staff access to MediScribe AI patient records and AI clinical notes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const credentials = z.object({
  email: z.string().trim().email("Please enter a valid email address.").max(255),
  password: z.string().min(1, "Password is required").max(72),
});

const DEMO: Record<StaffRole, { email: string; password: string }> = {
  admin: { email: "admin@mediscribe.com", password: "Admin@123" },
  receptionist: { email: "reception@hospital.com", password: "Reception@123" },
  doctor: { email: "doctor@hospital.com", password: "Doctor@123" },
};

const ROLE_LABEL: Record<StaffRole, string> = {
  admin: "Administrator",
  receptionist: "Receptionist",
  doctor: "Doctor",
};

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<StaffRole>("doctor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  const signInReady = email.trim().length > 0 && password.length > 0;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  // Development convenience: make sure the demo accounts exist.
  useEffect(() => {
    seedDemoAccounts({ data: undefined }).catch(() => {});
  }, []);

  async function resolveRedirect() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", data.user.id),
      supabase.from("profiles").select("full_name, status").eq("id", data.user.id).maybeSingle(),
    ]);

    const held = (roles ?? []).map((r) => r.role as string);
    const actual: StaffRole | null = held.includes("admin")
      ? "admin"
      : held.includes("receptionist")
        ? "receptionist"
        : held.includes("doctor")
          ? "doctor"
          : null;

    if (profile?.status === "inactive") {
      await supabase.auth.signOut();
      setErrors({ form: "This account has been deactivated. Please contact your administrator." });
      return;
    }

    if (!actual) {
      await supabase.auth.signOut();
      setErrors({ form: "No staff role is assigned to this account. Please contact your administrator." });
      return;
    }

    if (actual !== role) {
      await supabase.auth.signOut();
      setErrors({
        form: `This account is registered as a ${ROLE_LABEL[actual].toLowerCase()}. Select ${ROLE_LABEL[actual]} and sign in again.`,
      });
      return;
    }

    const name =
      profile?.full_name?.replace(/^Dr\.?\s*/i, "") ||
      (data.user.user_metadata?.full_name as string | undefined) ||
      data.user.email?.split("@")[0] ||
      "there";
    const greeting =
      actual === "doctor"
        ? `Welcome, Dr. ${name}. Redirecting to your dashboard...`
        : `Welcome, ${name}. Redirecting to your dashboard...`;
    setSuccess(greeting);
    toast.success(greeting);
    setTimeout(() => navigate({ to: homeRouteFor(actual), replace: true }), 900);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSuccess(null);
    const parsed = credentials.safeParse({ email, password });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        next[issue.path[0] as "email" | "password"] = issue.message;
      }
      setErrors(next);
      return;
    }
    setLoading(true);
    try {
      const response = await supabase.auth.signInWithPassword(parsed.data);
      if (response.error) throw response.error;
      if (response.data.session) await resolveRedirect();
      else setErrors({ form: "Sign in did not return a session. Please try again." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setErrors({
        form: /invalid login/i.test(message)
          ? "Invalid email or password."
          : /banned|disabled/i.test(message)
            ? "This account has been deactivated. Please contact your administrator."
            : message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const parsedEmail = z.string().trim().email().safeParse(email);
    if (!parsedEmail.success) {
      setErrors({ email: "Enter your email above first, then tap Forgot password." });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent to your email.");
  }

  function useDemo(which: StaffRole) {
    setRole(which);
    setEmail(DEMO[which].email);
    setPassword(DEMO[which].password);
    setErrors({});
    toast.info(`Demo ${ROLE_LABEL[which].toLowerCase()} credentials filled in.`);
  }

  return (
    <div className="gradient-surface grid min-h-screen lg:grid-cols-2">
      {/* Illustration — desktop only */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary/5 p-12 lg:flex">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="gradient-clinical flex size-9 items-center justify-center rounded-xl text-primary-foreground">
            <Stethoscope className="size-5" />
          </span>
          <span className="font-display text-lg font-extrabold">
            MediScribe<span className="text-primary"> AI</span>
          </span>
        </Link>

        <div className="mx-auto w-full max-w-md">
          <img
            src={authIllustration}
            alt="Illustration of a doctor reviewing a digital patient record on a tablet"
            width={1024}
            height={1280}
            loading="lazy"
            className="w-full rounded-3xl object-cover mix-blend-multiply"
          />
        </div>

        <div className="max-w-md">
          <h2 className="font-display text-2xl font-extrabold leading-tight">
            Documentation that writes itself.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Record the consultation, and MediScribe AI returns a structured SOAP note, prescription
            and report — ready for your signature.
          </p>
        </div>
      </aside>

      {/* Form */}
      <main className="flex flex-col items-center justify-center px-5 py-12">
        <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
          <span className="gradient-clinical flex size-9 items-center justify-center rounded-xl text-primary-foreground">
            <Stethoscope className="size-5" />
          </span>
          <span className="font-display text-lg font-extrabold">
            MediScribe<span className="text-primary"> AI</span>
          </span>
        </Link>

        <div className="surface-card w-full max-w-md p-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="font-display text-xl font-extrabold">Staff sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Securely access the AI-powered clinical documentation system.
          </p>

          <div className="mt-6 space-y-2">
            <Label>Role</Label>
            <div className="grid grid-cols-3 gap-2">
              <RoleButton
                active={role === "doctor"}
                onClick={() => {
                  setRole("doctor");
                  setErrors({});
                }}
                icon={<UserRound className="size-4" />}
                label="Doctor"
              />
              <RoleButton
                active={role === "receptionist"}
                onClick={() => {
                  setRole("receptionist");
                  setErrors({});
                }}
                icon={<ConciergeBell className="size-4" />}
                label="Reception"
              />
              <RoleButton
                active={role === "admin"}
                onClick={() => {
                  setRole("admin");
                  setErrors({});
                }}
                icon={<ShieldCheck className="size-4" />}
                label="Admin"
              />
            </div>
            <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
              All accounts are created by the hospital administrator. There is no public
              registration — ask your administrator for credentials.
            </p>
          </div>

          {errors.form ? (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive animate-in fade-in"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{errors.form}</span>
            </div>
          ) : null}

          {success ? (
            <div
              role="status"
              className="mt-4 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary animate-in fade-in"
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <span>{success}</span>
            </div>
          ) : null}

          <form className="space-y-4 pt-5" onSubmit={handleSubmit}>
            <Field
              id="si-email"
              label="Email address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="doctor@hospital.com"
              icon={<Mail className="size-4" />}
              error={errors.email}
            />
            <PasswordField
              id="si-password"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggle={() => setShowPassword((s) => !s)}
              error={errors.password}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm font-medium text-primary transition-colors hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <Button
              type="submit"
              className="w-full rounded-xl shadow-sm transition-all hover:shadow-md hover:brightness-105 active:scale-[0.99]"
              disabled={loading || !signInReady}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Signing In...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>


        </div>
      </main>
    </div>
  );
}

function RoleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-sm font-medium shadow-sm transition-all hover:shadow-md",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function PasswordField({
  id,
  label = "Password",
  value,
  onChange,
  show,
  onToggle,
  error,
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground" />
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          className="rounded-xl pl-9 pr-10 shadow-sm transition-shadow focus-visible:shadow-md"
          placeholder="••••••••"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  error,
  icon,
  required = true,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  icon?: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
            {icon}
          </span>
        ) : null}
        <Input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "rounded-xl shadow-sm transition-shadow focus-visible:shadow-md",
            icon && "pl-9",
          )}
          required={required}
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
