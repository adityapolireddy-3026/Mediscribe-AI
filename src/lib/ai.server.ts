const GATEWAY = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

function apiKey() {
  const key = process.env.OPENAI_API_KEY || process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured for this project. Please add OPENAI_API_KEY to your .env file.");
  return key;
}

function getCompletionConfig() {
  if (process.env.GEMINI_API_KEY) {
    return {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      key: process.env.GEMINI_API_KEY,
      model: "gemini-2.0-flash",
    };
  }
  return {
    url: `${GATEWAY}/chat/completions`,
    key: apiKey(),
    model: "gpt-4o-mini",
  };
}

function base64ToBytes(b64: string) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Domain bias sent to the speech model so medical words, units and dosing
 * phrases are recognised accurately instead of being guessed as everyday words.
 */
export const MEDICAL_PROMPT = [
  "Clinical consultation between a doctor and a patient. Transcribe speech exactly as spoken, in the spoken language.",
  "Expect medical terminology, symptoms, diseases, drug names, dosages, units and instructions such as:",
  "fever, cough, cold, headache, body pain, vomiting, loose motions, giddiness, breathlessness, chest pain, acidity, gastritis,",
  "diabetes, hypertension, blood pressure, thyroid, asthma, osteoarthritis, anaemia, jaundice, dengue, typhoid, urinary infection,",
  "Paracetamol 650 mg, Dolo 650, Azithromycin 500 mg, Amoxicillin 625 mg, Pantoprazole 40 mg, Metformin 500 mg, Amlodipine 5 mg,",
  "Cetirizine 10 mg, Ibuprofen 400 mg, ORS, syrup, tablet, capsule, injection, drops, mg, ml, mcg, units,",
  "once daily, twice daily, thrice daily, SOS, before food, after food, at bedtime, for five days, follow-up after two weeks,",
  "CBC, ESR, CRP, HbA1c, fasting blood sugar, lipid profile, thyroid profile, urine routine, X-ray, ECG, ultrasound, MRI, CT scan.",
  "Do not guess unclear words. Write [unclear audio] where the audio cannot be understood. Never invent medical details.",
].join(" ");

/** Retries only transient gateway failures (rate limits and upstream errors). */
async function fetchWithRetry(url: string, init: RequestInit, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const res = await fetch(url, init);
      if (res.status === 429 || res.status >= 500) {
        if (attempt === attempts - 1) return res;
        const retryAfter = Number(res.headers.get("retry-after"));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 600 * 2 ** attempt;
        await new Promise((r) => setTimeout(r, Math.min(waitMs, 4000)));
        continue;
      }
      return res;
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) break;
      await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Network error while reaching the AI service — please retry.");
}

/** Phrases speech models hallucinate over silence or noise; never clinical content. */
const HALLUCINATIONS = [
  "thank you for watching",
  "thanks for watching",
  "subscribe to my channel",
  "please subscribe",
  "www.",
  "amara.org",
];

function cleanTranscript(text: string) {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase().replace(/[.!]/g, "").trim();
  if (!trimmed) return "";
  if (HALLUCINATIONS.some((h) => lower === h || lower.includes(h))) return "";
  return trimmed;
}

/**
 * Transcribes audio using the Gemini multimodal API (avoids OpenAI Whisper rate limits).
 * Uses gemini-2.0-flash which supports inline audio data.
 */
async function geminiTranscribeAudioBase64(
  audioBase64: string,
  mimeType: string,
  opts: { language?: string; minBytes?: number; prompt?: string } = {},
): Promise<{ text: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set.");

  const bytes = base64ToBytes(audioBase64);
  if (bytes.byteLength < (opts.minBytes ?? 2048)) {
    throw new Error("That recording was too short or silent — please record again.");
  }

  // Gemini only accepts certain MIME types for inline audio
  const supportedMime = mimeType.startsWith("audio/") ? mimeType.split(";")[0] : "audio/wav";

  const systemPrompt = opts.prompt ?? MEDICAL_PROMPT;
  const languageLine = opts.language
    ? ` Transcribe in ${opts.language} only.`
    : " Transcribe in the language that was spoken.";

  const body = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: supportedMime,
              data: audioBase64,
            },
          },
          {
            text: `${systemPrompt}${languageLine} Output ONLY the verbatim transcription text with no commentary, labels, or formatting.`,
          },
        ],
      },
    ],
    generationConfig: { temperature: 0 },
  };

  const res = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI rate limit reached — please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted — add credits to continue.");
    throw new Error(`Transcription failed (${res.status}). ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return { text: cleanTranscript(text) };
}

export async function transcribeAudioBase64(
  audioBase64: string,
  mimeType: string,
  opts: { language?: string; minBytes?: number; prompt?: string } = {},
) {
  // Prefer Gemini when available to avoid OpenAI Whisper rate limits
  if (process.env.GEMINI_API_KEY) {
    return geminiTranscribeAudioBase64(audioBase64, mimeType, opts);
  }

  const bytes = base64ToBytes(audioBase64);
  if (bytes.byteLength < (opts.minBytes ?? 2048)) {
    throw new Error("That recording was too short or silent — please record again.");
  }
  const ext =
    (
      {
        "audio/wav": "wav",
        "audio/x-wav": "wav",
        "audio/webm": "webm",
        "audio/mp4": "mp4",
        "audio/mpeg": "mp3",
        "audio/m4a": "m4a",
      } as Record<string, string>
    )[mimeType.split(";")[0]] ?? "wav";

  const form = new FormData();
  form.append("model", "whisper-1");
  form.append("file", new Blob([bytes], { type: mimeType }), `recording.${ext}`);
  form.append("prompt", opts.prompt ?? MEDICAL_PROMPT);
  form.append("temperature", "0");
  if (opts.language) form.append("language", opts.language);

  const res = await fetchWithRetry(`${GATEWAY}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI rate limit reached — please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted — add credits to continue.");
    throw new Error(`Transcription failed (${res.status}). ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as { text?: string };
  return { text: cleanTranscript(json.text ?? "") };
}


export type SoapNote = {
  chief_complaint: string;
  history: string;
  vitals: string;
  examination: string;
  other_observations: string;
  assessment: string;
  clinical_impression: string;
  plan: string;
  medicines: string;
  lifestyle_advice: string;
  recommended_tests: string;
  follow_up: string;
};

const EMPTY: SoapNote = {
  chief_complaint: "",
  history: "",
  vitals: "",
  examination: "",
  other_observations: "",
  assessment: "",
  clinical_impression: "",
  plan: "",
  medicines: "",
  lifestyle_advice: "",
  recommended_tests: "",
  follow_up: "",
};

export async function generateSoap(transcript: string, patientContext: string) {
  const config = getCompletionConfig();
  const res = await fetchWithRetry(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content: [
            "You are a clinical documentation assistant. Convert a doctor-patient consultation transcript into a structured SOAP note.",
            "STRICT GROUNDING RULES:",
            "- Use ONLY information present in the transcript (plus the supplied patient context for demographics, allergies and known history).",
            "- Never invent vital signs, examination findings, investigations, medicines, doses or durations that were not spoken.",
            "- If vital signs or physical examination were not mentioned, output exactly \"Not documented\" for those fields.",
            "- Every medicine, strength, frequency and duration must appear in the transcript. If a detail was not stated, leave that segment blank rather than guessing.",
            "- The assessment must be a realistic clinical impression that follows directly from the complaints and findings actually discussed.",
            "- Lifestyle advice must reflect advice the doctor actually gave; you may only phrase it clearly, not add new instructions.",
            "- Recommended tests only if investigations were discussed, otherwise \"Not documented\".",
            "Respond with JSON only.",
          ].join("\n"),
        },
        {
          role: "user",
          content: `Patient context: ${patientContext || "not provided"}\n\nTranscript:\n${transcript}\n\nReturn JSON with exactly these string keys:\nchief_complaint — the patient's presenting complaint in their own terms.\nhistory — History of Present Illness (onset, duration, progression, aggravating/relieving factors) built from the conversation.\nvitals — vital signs if spoken, else "Not documented".\nexamination — physical examination findings if spoken, else "Not documented".\nother_observations — allergies, past medical history and previous illnesses mentioned in the transcript or patient context; write "Allergies: …", "Past history: …", "Previous illnesses: …" lines. Use "Not documented" for anything absent.\nassessment — likely diagnosis, grounded in the conversation.\nclinical_impression — short severity/risk reasoning.\nplan — brief overall management plan.\nmedicines — one medicine per line, EXACTLY in the format "Name Strength — Dosage — Frequency — Duration" (e.g. "Paracetamol 650 mg — 1 tablet — Twice daily after food — 5 days"). Omit a segment only if it was never stated. Empty string if no medicine was prescribed.\nlifestyle_advice — one advice point per line, no bullet characters.\nrecommended_tests — one per line, or "Not documented".\nfollow_up — follow-up instruction as spoken (e.g. "Review after 2 weeks").`,
        },
      ],
      response_format: { type: "json_object" },

    }),
  });


  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI rate limit reached — please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted — add credits to continue.");
    throw new Error(`Note generation failed (${res.status}). ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let raw = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: Partial<SoapNote> = {};
  try {
    raw = raw.replace(/^```(?:json)?\n?([\s\S]*?)\n?```$/, "$1").trim();
    parsed = JSON.parse(raw) as Partial<SoapNote>;
  } catch {
    parsed = {};
  }

  const note: SoapNote = { ...EMPTY };
  (Object.keys(EMPTY) as Array<keyof SoapNote>).forEach((k) => {
    const value: unknown = parsed[k];
    note[k] =
      typeof value === "string" ? value : Array.isArray(value) ? value.join("\n") : "";
  });
  return note;
}

/* ---------------- multilingual: language detection + English translation ---------------- */

export const SUPPORTED_LANGUAGES = ["English", "Telugu", "Hindi", "Tamil", "Kannada"] as const;

/** ISO-639-1 hints for the supported languages, used to steer streaming transcription. */
export const LANGUAGE_CODES: Record<string, string> = {
  English: "en",
  Telugu: "te",
  Hindi: "hi",
  Tamil: "ta",
  Kannada: "kn",
};

export type TranslationResult = {
  language: string;
  translation: string;
};

/**
 * Detects the spoken language of a consultation transcript and returns a faithful
 * English translation. Extra languages can be supported by extending
 * SUPPORTED_LANGUAGES — the model handles any language it recognises.
 */
export async function detectAndTranslate(transcript: string): Promise<TranslationResult> {
  const config = getCompletionConfig();
  const res = await fetchWithRetry(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content: [
            "You are a medical interpreter for doctor-patient consultations.",
            "Identify the dominant spoken language of the transcript and translate it into clear clinical English.",
            `Commonly expected languages include: ${SUPPORTED_LANGUAGES.join(", ")}. Any other language must be named accurately in English (e.g. "Tamil", "Marathi").`,
            "TRANSLATION RULES:",
            "- Preserve meaning exactly. Never add, omit or infer clinical information.",
            "- Preserve every symptom, medical history item, allergy, medicine name, strength, dosage, frequency, duration, diagnosis, advice and follow-up instruction verbatim in meaning.",
            "- Keep the speaker turns and ordering of the conversation.",
            "- Keep numbers, units and drug names unchanged.",
            "- If the transcript is already English, return it unchanged as the translation.",
            "Respond with JSON only.",
          ].join("\n"),
        },
        {
          role: "user",
          content: `Transcript:\n${transcript}\n\nReturn JSON with exactly these string keys:\nlanguage — the detected language name in English.\ntranslation — the full English translation of the transcript.`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI rate limit reached — please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted — add credits to continue.");
    throw new Error(`Translation failed. Please retry. (${res.status}) ${detail.slice(0, 160)}`);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  let content = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: Partial<TranslationResult> = {};
  try {
    content = content.replace(/^```(?:json)?\n?([\s\S]*?)\n?```$/, "$1").trim();
    parsed = JSON.parse(content) as Partial<TranslationResult>;
  } catch {
    parsed = {};
  }

  let translation = typeof parsed.translation === "string" ? parsed.translation.trim() : "";
  const detectedLanguage = (typeof parsed.language === "string" && parsed.language.trim()) || "Unknown";
  if (!translation && detectedLanguage === "English") translation = transcript.trim();
  if (!translation) throw new Error("Translation failed. Please retry.");
  return {
    language: (typeof parsed.language === "string" && parsed.language.trim()) || "Unknown",
    translation,
  };
}

/* ---------------- live bilingual segments ---------------- */

export type LiveSegment = {
  /** Text exactly as recognised in the spoken language. */
  original: string;
  /** English meaning of that same text. */
  english: string;
  /** Detected language name (one of SUPPORTED_LANGUAGES) or "Unknown". */
  language: string;
};

/**
 * Transcribes one short recording window and, in the same round trip, returns its
 * English meaning so the UI can render both panels live while recording continues.
 * `languageHint` is the language detected from earlier windows of the same session.
 */
export async function transcribeAndTranslateSegment(
  audioBase64: string,
  mimeType: string,
  languageHint?: string,
): Promise<LiveSegment> {
  // The language heard so far is passed as a soft prompt hint rather than a hard
  // `language` lock, so a mid-consultation switch between the supported
  // languages is still transcribed correctly.
  const hintLine = languageHint
    ? ` The consultation so far has been spoken mainly in ${languageHint}, but the speaker may switch between ${SUPPORTED_LANGUAGES.join(", ")}.`
    : ` The speech may be in any of: ${SUPPORTED_LANGUAGES.join(", ")}.`;
  const { text } = await transcribeAudioBase64(audioBase64, mimeType, {
    minBytes: 1024,
    prompt: `${MEDICAL_PROMPT}${hintLine}`,
  });
  const original = text.trim();
  if (!original) return { original: "", english: "", language: languageHint ?? "" };

  const config = getCompletionConfig();
  const res = await fetchWithRetry(config.url, {

    method: "POST",
    headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content: [
            "You are a live medical interpreter working on short fragments of a doctor-patient consultation.",
            `The spoken language is one of: ${SUPPORTED_LANGUAGES.join(", ")}. Name it exactly as one of those words, or "Unknown".`,
            "Translate the fragment into clinical English, preserving every symptom, duration, allergy, medicine name, strength, dose, frequency and instruction exactly.",
            "If the fragment is already English, return it unchanged as the translation.",
            "Never add, omit or infer clinical information. Never comment on the text.",
            "Respond with JSON only.",
          ].join("\n"),
        },
        {
          role: "user",
          content: `${languageHint ? `Language detected so far: ${languageHint}.\n` : ""}Fragment:\n${original}\n\nReturn JSON with string keys: language, translation.`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI rate limit reached — please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted — add credits to continue.");
    throw new Error(`Live translation failed (${res.status}). ${detail.slice(0, 160)}`);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  let content = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: { language?: string; translation?: string } = {};
  try {
    content = content.replace(/^```(?:json)?\n?([\s\S]*?)\n?```$/, "$1").trim();
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
  }

  const detected =
    typeof parsed.language === "string" &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(parsed.language.trim())
      ? parsed.language.trim()
      : (languageHint ?? "Unknown");

  return {
    original,
    english: (typeof parsed.translation === "string" ? parsed.translation : "").trim() || original,
    language: detected,
  };
}
