import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-3">
        <div>
          <h3 className="font-display text-base font-bold">About</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            MediScribe AI turns doctor–patient conversations into structured clinical notes and
            secure electronic medical records.
          </p>
        </div>
        <div>
          <h3 className="font-display text-base font-bold">Contact</h3>
          <p className="mt-2 text-sm text-muted-foreground">support@mediscribe.ai</p>
          <p className="text-sm text-muted-foreground">+1 (555) 018-2245</p>
        </div>
        <div>
          <h3 className="font-display text-base font-bold">Privacy Policy</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Patient records are encrypted at rest, access-controlled per clinician, and never used
            to train third-party models.
          </p>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} MediScribe AI ·{" "}
        <Link to="/auth" className="underline underline-offset-4">
          Clinician access
        </Link>
      </div>
    </footer>
  );
}
