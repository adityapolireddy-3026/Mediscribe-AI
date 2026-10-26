import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  transcribeAudioBase64,
  generateSoap,
  detectAndTranslate,
  transcribeAndTranslateSegment,
  geminiTranscribeAndTranslate,
} from "@/lib/ai.server";

export const transcribeAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { audioBase64: string; mimeType: string }) => {
    if (!input?.audioBase64) throw new Error("No audio provided.");
    return input;
  })
  .handler(async ({ data }) => transcribeAudioBase64(data.audioBase64, data.mimeType));

export const generateSoapNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { transcript: string; patientContext?: string }) => {
    if (!input?.transcript?.trim()) throw new Error("Transcript is empty.");
    return input;
  })
  .handler(async ({ data }) => generateSoap(data.transcript, data.patientContext ?? ""));

export const translateTranscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { transcript: string }) => {
    if (!input?.transcript?.trim()) throw new Error("Transcript is empty.");
    return input;
  })
  .handler(async ({ data }) => detectAndTranslate(data.transcript));

export const transcribeLiveSegment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { audioBase64: string; mimeType: string; languageHint?: string }) => {
    if (!input?.audioBase64) throw new Error("No audio provided.");
    return input;
  })
  .handler(async ({ data }) =>
    transcribeAndTranslateSegment(data.audioBase64, data.mimeType, data.languageHint),
  );

/**
 * Single-call transcription + translation + language detection.
 * Replaces the old pattern of calling transcribeAudio then translateTranscript separately.
 * Cuts API calls from 2 → 1, halving rate-limit risk and latency.
 */
export const transcribeAndTranslateAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { audioBase64: string; mimeType: string }) => {
    if (!input?.audioBase64) throw new Error("No audio provided.");
    return input;
  })
  .handler(async ({ data }) =>
    geminiTranscribeAndTranslate(data.audioBase64, data.mimeType),
  );
