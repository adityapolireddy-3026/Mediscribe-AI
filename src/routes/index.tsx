import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Mic,
  AudioWaveform,
  Sparkles,
  FolderLock,
  ShieldCheck,
  FileText,
  ArrowRight,
  
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import heroImage from "@/assets/hero-mediscribe.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediScribe AI — AI Clinical Documentation & EMR" },
      {
        name: "description",
        content:
          "MediScribe AI turns doctor–patient conversations into structured SOAP clinical notes, prescriptions and secure electronic medical records.",
      },
      { property: "og:title", content: "MediScribe AI — AI Clinical Documentation & EMR" },
      {
        property: "og:description",
        content:
          "Record the consultation, get an AI transcript, generate SOAP notes and store them securely as EMRs.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Mic,
    title: "Voice Recording",
    body: "Capture the consultation in the room with pause, resume and audio upload.",
  },
  {
    icon: AudioWaveform,
    title: "Speech-to-Text",
    body: "Accurate medical transcription of the full doctor–patient conversation.",
  },
  {
    icon: Sparkles,
    title: "AI Clinical Notes",
    body: "Structured SOAP notes with assessment, diagnosis and treatment plan.",
  },
  {
    icon: FolderLock,
    title: "EMR Management",
    body: "Every patient's history, consultations and notes in one clinical record.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Storage",
    body: "Row-level access control so clinicians only ever see their own patients.",
  },
  {
    icon: FileText,
    title: "PDF Reports",
    body: "Download clinical notes, prescriptions and patient summaries as PDFs.",
  },
];

const steps = [
  "Select patient",
  "Record conversation",
  "AI generates transcript",
  "Generate clinical notes",
  "Save to EMR",
  "Download report",
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="gradient-surface border-b border-border">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" /> Clinical documentation, automated
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">
                MediScribe AI —{" "}
                <span className="text-gradient-clinical">AI-powered clinical documentation</span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
                Convert doctor–patient conversations into structured clinical notes and store them
                securely as electronic medical records — so consultations end with care, not
                paperwork.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/auth">
                    Get started <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <img
              src={heroImage}
              alt="Doctor consulting a patient while AI generates structured clinical notes"
              width={1280}
              height={1024}
              className="w-full rounded-2xl shadow-[var(--shadow-lift)]"
            />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
          <h2 className="text-3xl font-bold">Built for the consultation room</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Everything a clinician needs between the first question and the signed record.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <article key={f.title} className="surface-card p-6 transition-shadow hover:shadow-[var(--shadow-lift)]">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="border-y border-border bg-secondary/40">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
            <h2 className="text-3xl font-bold">How it works</h2>
            <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {steps.map((step, i) => (
                <li key={step} className="surface-card flex items-start gap-4 p-5">
                  <span className="gradient-clinical flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="pt-1.5 font-semibold">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
