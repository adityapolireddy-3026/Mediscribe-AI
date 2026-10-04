import { createFileRoute } from "@tanstack/react-router";
import { DoctorOnly } from "@/components/dashboard/role-guards";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Mic,
  Pause,
  Play,
  Square,
  Upload,
  Sparkles,
  Loader2,
  User,
  Droplet,
  ShieldAlert,
  Phone,
  Languages,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  FileText,

} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { usePatients } from "@/hooks/use-patients";
import {
  useCreateConsultation,
  useUpdateConsultation,
  useDoctorProfile,
  useSaveClinicalNote,
  useSavePrescription,
  type NoteFields,
} from "@/hooks/use-clinical";
import {
  transcribeAudio,
  generateSoapNote,
  translateTranscript,
  transcribeLiveSegment,
} from "@/lib/ai.functions";
import { blobToBase64, VoiceRecorder } from "@/lib/audio-recorder";
import { MicPulse, Waveform, formatDuration } from "@/components/consultation/recorder-visuals";
import { PageHeader } from "@/components/dashboard/page-parts";
import { SoapCard, SOAP_GROUPS, prescriptionFromNote } from "@/components/clinical/soap-card";
import { downloadSoapNotePdf } from "@/lib/pdf";
import { PatientRecordView } from "@/components/patients/patient-record-view";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/consultations")({
  head: () => ({
    meta: [
      { title: "Consultations — MediScribe AI" },
      {
        name: "description",
        content:
          "Record a multilingual consultation, auto-detect the spoken language, translate it to English and generate AI SOAP notes.",
      },
      { property: "og:title", content: "Consultations — MediScribe AI" },
      {
        property: "og:description",
        content: "Multilingual consultation capture with AI transcription, translation and SOAP notes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <DoctorOnly area="Voice recording and AI note generation">
      <ConsultationPage />
    </DoctorOnly>
  ),
});

type Stage =
  | "idle"
  | "connecting"
  | "detecting"
  | "listening"
  | "transcribing"
  | "translating"
  | "ready";

const STAGE_LABEL: Record<Exclude<Stage, "idle">, string> = {
  connecting: "Connecting…",
  detecting: "Detecting language…",
  listening: "Listening…",
  transcribing: "Transcribing…",
  translating: "Translating…",
  ready: "Ready",
};

function ConsultationPage() {
  const navigate = useNavigate();
  const { data: patients = [], isLoading } = usePatients("");
  const { data: profile } = useDoctorProfile();
  const [patientId, setPatientId] = useState<string>("");
  const [levels, setLevels] = useState<number[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [transcript, setTranscript] = useState("");
  const [translation, setTranslation] = useState("");
  const [language, setLanguage] = useState("");
  /** Number of speech bursts still being transcribed — drives the interim line. */
  const [pending, setPending] = useState(0);
  const [transcriptionStatus, setTranscriptionStatus] = useState<
    "idle" | "live" | "complete" | "partial" | "failed"
  >("idle");
  const [generating, setGenerating] = useState(false);
  const [note, setNote] = useState<NoteFields | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

  const recognitionRef = useRef<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  /** Serialises live segments so conversation order is always preserved. */
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const languageRef = useRef("");
  const liveRef = useRef(false);
  const liveLinesRef = useRef(0);
  const translationRef = useRef("");
  /** The captured audio, uploaded to storage once the visit is documented. */
  const audioBlobRef = useRef<Blob | null>(null);

  const runTranscribe = useServerFn(transcribeAudio);
  const runTranslate = useServerFn(translateTranscript);
  const runGenerate = useServerFn(generateSoapNote);
  const runLiveSegment = useServerFn(transcribeLiveSegment);
  const createConsultation = useCreateConsultation();
  const updateConsultation = useUpdateConsultation();
  const saveNote = useSaveClinicalNote();
  const savePrescription = useSavePrescription();

  const patient = patients.find((p) => p.id === patientId);
  const busy = stage !== "idle" && stage !== "ready" && stage !== "listening";

  useEffect(() => {
    if (!recording || paused) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording, paused]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  function resetClinical() {
    setNote(null);
    setNoteId(null);
    setConsultationId(null);
    setApproved(false);
  }


  /** Transcribe → detect language → translate to English. */
  async function processAudio(blob: Blob) {
    resetClinical();
    setTranslation("");
    setLanguage("");
    setTranscriptionStatus("live");
    try {
      setStage("detecting");
      const audioBase64 = await blobToBase64(blob);
      setStage("transcribing");
      const result = await runTranscribe({
        data: { audioBase64, mimeType: blob.type || "audio/wav" },
      });
      const text = result.text?.trim() ?? "";
      if (!text) {
        setStage("idle");
        setTranscriptionStatus("failed");
        toast.error("Unable to transcribe the audio. Please try again or upload another audio file.");
        return null;
      }
      setTranscript(text);
      setTranscriptionStatus("complete");
      return await translateText(text);
    } catch (error) {
      setStage("idle");
      setTranscriptionStatus("failed");
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to transcribe the audio. Please try again or upload another audio file.",
      );
      return null;
    }
  }

  /** Detects the language of the current transcript and produces the English translation. */
  async function translateText(text: string) {
    try {
      setStage("translating");
      const out = await runTranslate({ data: { transcript: text } });
      const detectedLang = out.language !== "Unknown" ? out.language : "";
      setLanguage(detectedLang);
      setTranslation(out.translation);
      translationRef.current = out.translation;
      setStage("ready");
      if (detectedLang) {
        toast.success(`Language detected: ${detectedLang}`, {
          description: "English translation ready for AI analysis.",
        });
      } else {
        toast.success("English translation ready for AI analysis.");
      }
      return out.translation;
    } catch (error) {
      setStage("idle");
      toast.error(error instanceof Error ? error.message : "Translation failed. Please retry.");
      return null;
    }
  }

  async function enqueueSegment(blob: Blob) {
    const p = queueRef.current.then(async () => {
      if (!liveRef.current) return;
      setPending((n) => n + 1);
      try {
        const audioBase64 = await blobToBase64(blob);
        const segment = await runLiveSegment({
          data: {
            audioBase64,
            mimeType: blob.type || "audio/wav",
            languageHint: languageRef.current,
          },
        });

        if (!liveRef.current) return;

        if (segment.language && segment.language !== "Unknown") {
          languageRef.current = segment.language;
          setLanguage(segment.language);
        }

        if (segment.original) {
          setTranscript((prev) => (prev ? `${prev.trimEnd()} ${segment.original}` : segment.original));
        }

        if (segment.english) {
          setTranslation((prev) => {
            const next = prev ? `${prev.trimEnd()} ${segment.english}` : segment.english;
            translationRef.current = next;
            return next;
          });
        }
        liveLinesRef.current += 1;
      } catch (err) {
        console.error("Live segment error:", err);
        toast.error(err instanceof Error ? err.message : "Live transcription segment failed.");
      } finally {
        setPending((n) => Math.max(0, n - 1));
      }
    });
    queueRef.current = p;
    return p;
  }

  async function startRecording() {
    if (!patientId) {
      toast.error("Select a patient before recording.");
      return;
    }

    setStage("connecting");
    try {
      const recorder = new VoiceRecorder({
        onLevels: setLevels,
        // Live transcription is disabled to prevent OpenAI rate limits (3 requests/minute).
        // onSegment: enqueueSegment,
      });

      await recorder.start();
      recognitionRef.current = recorder;
      liveRef.current = true;
      liveLinesRef.current = 0;
      audioBlobRef.current = null;
      setPending(0);
      setSeconds(0);
      setTranscript("");
      setTranslation("");
      translationRef.current = "";
      setLanguage("");
      languageRef.current = "";
      resetClinical();
      setRecording(true);
      setPaused(false);
      setStage("listening");
      setTranscriptionStatus("live");
      toast.success("Live transcription started (Multilingual auto-detect)");
    } catch (error) {
      setStage("idle");
      setTranscriptionStatus("failed");
      toast.error("Microphone access is needed to record a consultation.");
    }
  }

  function pauseRecording() {
    if (recognitionRef.current) recognitionRef.current.pause();
    setPaused(true);
    toast.info("Recording paused");
  }

  function resumeRecording() {
    if (recognitionRef.current) recognitionRef.current.resume();
    setPaused(false);
  }

  async function stopRecording() {
    const recorder = recognitionRef.current;
    if (!recorder) return;
    
    setRecording(false);
    setPaused(false);
    setLevels([]);
    liveRef.current = false;
    setStage("transcribing");

    try {
      const blob = await recorder.stop();
      audioBlobRef.current = blob;
      recognitionRef.current = null;

      // Wait for any pending live segments to finish translating
      await queueRef.current;

      setStage("ready");
      setTranscriptionStatus("complete");
      toast.success("Transcription finalised");
      
      // If live transcription was disabled or failed, process the entire audio now.
      if (!translationRef.current.trim() && !transcript.trim()) {
        const english = await processAudio(blob);
        if (english) await generateNotes(english);
      } else {
        setTimeout(async () => {
           const english = translationRef.current.trim();
           if (english) await generateNotes(english);
           else if (transcript.trim()) {
             // Fallback in case of segment API errors but we somehow have transcript
             const fallbackEnglish = await translateText(transcript.trim());
             if (fallbackEnglish) await generateNotes(fallbackEnglish);
           }
        }, 500);
      }
    } catch (error) {
      setStage("idle");
      setTranscriptionStatus("failed");
      toast.error("An error occurred while stopping the recording.");
    }
  }

  /** Stores the captured recording privately so the visit can be re-checked later. */
  async function uploadAudio() {
    const blob = audioBlobRef.current;
    if (!blob || blob.size < 2048) return null;
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;
      const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.wav`;
      const { error } = await supabase.storage
        .from("consultation-audio")
        .upload(path, blob, { contentType: "audio/wav" });
      if (error) throw error;
      return path;
    } catch {
      // Never block documentation because the recording could not be archived.
      return null;
    }
  }


  async function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!patientId) {
      toast.error("Select a patient before uploading audio.");
      return;
    }
    if (file.size > 24 * 1024 * 1024) {
      toast.error("Audio file is too large (max 24 MB).");
      return;
    }
    audioBlobRef.current = file;
    liveLinesRef.current = 0;
    const english = await processAudio(file);
    if (english) await generateNotes(english);
  }

  async function generateNotes(sourceEnglish?: string) {
    const english = (sourceEnglish ?? translation).trim();
    const original = transcript.trim();
    if (!patientId) return toast.error("Select a patient first.");
    if (!original) return toast.error("Record or upload audio to build a transcript.");
    if (!english) return toast.error("Translate the transcript to English before generating notes.");
    setGenerating(true);
    try {
      const context = patient
        ? `${patient.full_name}, ${patient.age ?? "unknown"} years, ${patient.gender ?? "unspecified"}. Allergies: ${patient.allergies || "none recorded"}. History: ${patient.medical_history || "none recorded"}.`
        : "";
      const soap = await runGenerate({ data: { transcript: english, patientContext: context } });
      const audioPath = await uploadAudio();
      const consultation = await createConsultation.mutateAsync({
        patient_id: patientId,
        transcript: english,
        original_transcript: original,
        english_translation: english,
        original_language: language || "Unknown",
        duration_seconds: seconds,
        status: "awaiting_review",
        audio_url: audioPath,
        transcription_status: transcriptionStatus === "partial" ? "partial" : "complete",
      });
      const id = await saveNote.mutateAsync({
        values: { ...soap, patient_id: patientId, consultation_id: consultation.id },
      });
      setNote(soap);
      setNoteId(id);
      setConsultationId(consultation.id);
      setApproved(false);
      toast.success("SOAP draft generated", {
        description: "Review every section, then approve the clinical note.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate notes.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveDraft() {
    if (!note || !noteId) return;
    try {
      await saveNote.mutateAsync({ id: noteId, values: note });
      if (consultationId) {
        await updateConsultation.mutateAsync({
          id: consultationId,
          values: {
            transcript: translation.trim(),
            original_transcript: transcript.trim(),
            english_translation: translation.trim(),
            original_language: language || "Unknown",
          },
        });
      }
      toast.success("Clinical note draft saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the note.");
    }
  }

  async function approveNote() {
    if (!note || !noteId) return;
    const missing = SOAP_GROUPS.flatMap((g) => g.fields).filter(
      (f) => !(note[f.key] ?? "").trim(),
    );
    if (missing.length) {
      toast.error("Incomplete clinical documentation", {
        description: `Complete or mark "Not documented": ${missing.map((m) => m.label).join(", ")}.`,
      });
      return;
    }
    try {
      await saveNote.mutateAsync({ id: noteId, values: note });
      if (consultationId) {
        await updateConsultation.mutateAsync({
          id: consultationId,
          values: {
            status: "approved",
            approved_at: new Date().toISOString(),
            transcript: translation.trim(),
            original_transcript: transcript.trim(),
            english_translation: translation.trim(),
            original_language: language || "Unknown",
          },
        });
      }
      setApproved(true);
      toast.success("Clinical note approved", {
        description: "You can now generate the prescription.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not approve the note.");
    }
  }

  async function generatePrescription() {
    if (!note || !patientId) return;
    if (!approved) {
      toast.error("Approve the clinical note first", {
        description: "Prescriptions are drafted only from doctor-approved notes.",
      });
      return;
    }
    sessionStorage.setItem(
      "mediscribe:prescription-draft",
      JSON.stringify(prescriptionFromNote(note, patientId)),
    );
    toast.success("Prescription drafted from the approved note", {
      description: "Review and edit it before saving.",
    });
    navigate({ to: "/prescriptions" });
  }

  function downloadPdf() {
    if (!note) return;
    downloadSoapNotePdf({
      doctor: profile ?? {},
      patient: {
        name: patient?.full_name ?? "Patient",
        age: patient?.age ?? null,
        gender: patient?.gender ?? null,
        bloodGroup: patient?.blood_group ?? null,
        id: patient?.id ?? null,
      },
      sections: SOAP_GROUPS.map((g) => ({
        letter: g.letter,
        title: g.title,
        fields: g.fields.map((f) => ({ label: f.label, value: note[f.key] })),
      })),
    });

    toast.success("Note exported as PDF");
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Consultation"
        subtitle="Capture the visit in any language, translate it to English and turn it into a SOAP note."
        action={
          <Button
            onClick={() => generateNotes()}
            disabled={generating || busy || !translation.trim()}
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Generate AI Notes
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {recording && (
          <Badge className="gap-1.5">
            <span className="size-1.5 animate-pulse rounded-full bg-current" />
            {paused ? "Paused" : "Recording: Listening…"}
          </Badge>
        )}
        {busy && (
          <Badge variant="secondary" className="gap-1.5">
            <Loader2 className="size-3 animate-spin" /> {STAGE_LABEL[stage as Exclude<Stage, "idle">]}
          </Badge>
        )}
        {language && (
          <Badge variant="outline" className="gap-1.5">
            <Languages className="size-3" /> Language detected: {language}
          </Badge>
        )}
        {transcriptionStatus === "partial" && (
          <Badge variant="destructive" className="gap-1.5">
            <ShieldAlert className="size-3" /> Some speech was not transcribed — review carefully
          </Badge>
        )}
        {translation && !busy && (
          <Badge variant="outline" className="gap-1.5">
            <CheckCircle2 className="size-3 text-primary" /> Translation complete
          </Badge>
        )}
        {stage === "ready" && !note && (
          <Badge variant="secondary">{STAGE_LABEL.ready}</Badge>
        )}
        {note && !approved && (
          <Badge variant="secondary" className="gap-1.5">
            <ShieldAlert className="size-3" /> Ready for review
          </Badge>
        )}
        {approved && (
          <Badge className="gap-1.5">
            <ShieldCheck className="size-3" /> Approved by clinician
          </Badge>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="surface-card space-y-4 p-5">
          <h2 className="font-display text-base font-bold">Patient</h2>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {patient ? (
            <div className="animate-fade-in space-y-3 rounded-xl bg-muted/50 p-4 text-sm">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <User className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{patient.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[patient.age ? `${patient.age} yrs` : null, patient.gender]
                      .filter(Boolean)
                      .join(" • ") || "No demographics"}
                  </p>
                </div>
              </div>
              <InfoRow icon={Droplet} label="Blood group" value={patient.blood_group} />
              <InfoRow icon={ShieldAlert} label="Allergies" value={patient.allergies} />
              <InfoRow icon={Phone} label="Phone" value={patient.phone} />
              {patient.medical_history && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">History: </span>
                  {patient.medical_history}
                </p>
              )}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <FileText className="size-4" /> View Patient Record
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>{patient.full_name}</DialogTitle>
                    <DialogDescription>
                      {[
                        patient.uhid ?? "No patient ID",
                        patient.gender || "Gender not documented",
                        patient.phone || "Phone not documented",
                      ].join(" · ")}
                    </DialogDescription>
                  </DialogHeader>
                  <PatientRecordView patient={patient} />
                </DialogContent>
              </Dialog>
            </div>

          ) : (
            <p className="text-sm text-muted-foreground">
              Choose a patient to attach this consultation to their record.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="surface-card flex flex-col items-center gap-5 p-6">
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-base font-bold">Voice recording</h2>
              <Badge variant={recording ? (paused ? "secondary" : "default") : "outline"}>
                {recording
                  ? paused
                    ? "Paused"
                    : STAGE_LABEL[(stage === "idle" ? "listening" : stage) as Exclude<Stage, "idle">]
                  : busy
                    ? STAGE_LABEL[stage as Exclude<Stage, "idle">]
                    : "Idle"}
              </Badge>
            </div>

            <MicPulse active={recording} paused={paused} />
            <p className="font-display text-4xl font-extrabold tabular-nums">
              {formatDuration(seconds)}
            </p>
            <Waveform levels={levels} active={recording && !paused} />

            <div className="flex flex-wrap items-center justify-center gap-2">
              {!recording ? (
                <Button onClick={startRecording} disabled={busy}>
                  <Mic className="size-4" /> Start
                </Button>
              ) : paused ? (
                <Button onClick={resumeRecording}>
                  <Play className="size-4" /> Resume
                </Button>
              ) : (
                <Button variant="secondary" onClick={pauseRecording}>
                  <Pause className="size-4" /> Pause
                </Button>
              )}
              <Button variant="destructive" onClick={stopRecording} disabled={!recording}>
                <Square className="size-4" /> Stop
              </Button>
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={recording || busy}
              >
                <Upload className="size-4" /> Upload audio
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={onUpload}
              />
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Speech is transcribed and translated live. Supported languages: English, Telugu,
              Hindi, Tamil and Kannada.
            </p>
          </div>

          <div className="surface-card space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-base font-bold">Original transcript</h2>
              <div className="flex items-center gap-2">
                {language && (
                  <Badge variant="outline" className="gap-1.5">
                    <Languages className="size-3" /> Detected language: {language}
                  </Badge>
                )}
                {(busy || recording) && (
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />{" "}
                    {STAGE_LABEL[(stage === "idle" ? "listening" : stage) as Exclude<Stage, "idle">]}
                  </span>
                )}
              </div>
            </div>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="The spoken language appears here live while you record — you can edit it afterwards."
              className="min-h-40 resize-y leading-relaxed"
            />
            {pending > 0 && (
              <p className="animate-pulse text-sm italic text-muted-foreground">
                … recognising speech ({pending} {pending === 1 ? "phrase" : "phrases"} in progress)
              </p>
            )}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void translateText(transcript.trim())}
                disabled={busy || !transcript.trim()}
              >
                <RefreshCw className="size-4" />
                {translation ? "Re-translate to English" : "Translate to English"}
              </Button>
            </div>
          </div>

          <div className="surface-card space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-base font-bold">English translation</h2>
              {translation && !busy && (
                <Badge variant="outline" className="gap-1.5">
                  <CheckCircle2 className="size-3 text-primary" /> Translation complete
                </Badge>
              )}
            </div>
            <Textarea
              value={translation}
              onChange={(e) => {
                setTranslation(e.target.value);
                translationRef.current = e.target.value;
              }}
              placeholder="The live English translation of each spoken segment appears here. Edit it if any clinical detail needs correcting."
              className="min-h-40 resize-y leading-relaxed"
            />
            {pending > 0 && (
              <p className="animate-pulse text-sm italic text-muted-foreground">
                … translating the latest speech
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              AI notes are generated from this English text — check symptoms, allergies, medicines,
              doses and follow-up before continuing.
            </p>
          </div>

          {generating && !note && (
            <div className="surface-card flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              Converting the English transcript into a structured SOAP clinical note…
            </div>
          )}

          {note && (
            <>
              <SoapCard
                draft={note}
                onChange={(next) => {
                  setNote(next);
                  setApproved(false);
                }}
                onSave={saveDraft}
                onGeneratePrescription={generatePrescription}
                onDownloadPdf={downloadPdf}
                saving={saveNote.isPending}
                generatingPrescription={savePrescription.isPending}
                subtitle={`${patient?.full_name ?? "Patient"} • ${language || "Unknown"} consultation • AI draft`}
              />

              <div className="surface-card flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0 space-y-1">
                  <h3 className="font-display text-base font-bold">
                    Review and Approve Clinical Note
                  </h3>
                  <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
                    MediScribe AI is a documentation assistant, not a substitute for clinical
                    judgement. Verify every SOAP section and the translation above. Prescriptions can
                    only be drafted after you approve the note.
                  </p>
                </div>
                {approved ? (
                  <Badge className="gap-1.5">
                    <ShieldCheck className="size-3.5" /> Approved
                  </Badge>
                ) : (
                  <Button onClick={approveNote} disabled={saveNote.isPending}>
                    {saveNote.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="size-4" />
                    )}
                    Approve clinical note
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="min-w-0 flex-1 break-words font-medium">{value || "—"}</span>
    </div>
  );
}
