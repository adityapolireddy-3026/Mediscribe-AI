/** Browser-only PCM recorder that always yields a complete, decodable WAV blob. */

function encodeWav(chunks: Float32Array[], sampleRate: number, targetRate = 16000) {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }

  const ratio = sampleRate / targetRate;
  const outLength = Math.floor(merged.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i += 1) out[i] = merged[Math.floor(i * ratio)] ?? 0;

  const buffer = new ArrayBuffer(44 + out.length * 2);
  const view = new DataView(buffer);
  const writeString = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) view.setUint8(pos + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + out.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, out.length * 2, true);

  let pos = 44;
  for (let i = 0; i < out.length; i += 1) {
    const s = Math.max(-1, Math.min(1, out[i]));
    view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    pos += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export async function blobToBase64(blob: Blob) {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < buffer.length; i += step) {
    binary += String.fromCharCode(...buffer.subarray(i, i + step));
  }
  return btoa(binary);
}

export type RecorderHandlers = {
  onLevels?: (levels: number[]) => void;
  /** Fires with a complete WAV of everything captured so far. */
  onWindow?: (blob: Blob) => void;
  /**
   * Fires with a complete WAV of only the audio captured since the previous
   * segment, so each piece can be transcribed and translated live.
   */
  onSegment?: (blob: Blob) => void;
  /** Fires as soon as speech is heard, so the UI can show an interim line. */
  onSpeechStart?: () => void;
  /** Longest a segment may grow before it is flushed anyway, in ms (default 7000). */
  segmentMs?: number;
  /** Shortest speech burst worth transcribing, in ms (default 500). */
  minSegmentMs?: number;
  /** Pause length that ends a speech segment, in ms (default 650). */
  silenceMs?: number;
};

/** Preferred capture settings for clean, speech-optimised medical audio. */
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  sampleRate: 48000,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export class VoiceRecorder {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private chunks: Float32Array[] = [];
  private segment: Float32Array[] = [];
  /** Tail of the previous segment, replayed so words are never cut at a boundary. */
  private tail: Float32Array[] = [];
  private paused = false;
  private windowTimer: ReturnType<typeof setInterval> | null = null;
  private speechSamples = 0;
  private silenceSamples = 0;
  private speaking = false;

  constructor(private handlers: RecorderHandlers = {}) {}

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    if (this.ctx.state === "suspended") await this.ctx.resume().catch(() => undefined);
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1);
    this.chunks = [];
    this.segment = [];
    this.tail = [];
    this.speechSamples = 0;
    this.silenceSamples = 0;
    this.speaking = false;
    this.paused = false;

    const rate = this.ctx.sampleRate;
    const maxSamples = ((this.handlers.segmentMs ?? 7000) / 1000) * rate;
    const minSamples = ((this.handlers.minSegmentMs ?? 500) / 1000) * rate;
    const silenceLimit = ((this.handlers.silenceMs ?? 650) / 1000) * rate;
    const tailSamples = 0.25 * rate;

    this.processor.onaudioprocess = (event) => {
      if (this.paused) return;
      const input = event.inputBuffer.getChannelData(0);
      const copy = new Float32Array(input);
      this.chunks.push(copy);

      let peak = 0;
      let sum = 0;
      for (let i = 0; i < input.length; i += 1) {
        const abs = Math.abs(input[i]);
        if (abs > peak) peak = abs;
        sum += input[i] * input[i];
      }
      const rms = Math.sqrt(sum / input.length);
      const voiced = rms > 0.004 || peak > 0.02;

      if (this.handlers.onSegment) {
        this.segment.push(copy);
        if (voiced) {
          this.silenceSamples = 0;
          this.speechSamples += input.length;
          if (!this.speaking) {
            this.speaking = true;
            this.handlers.onSpeechStart?.();
          }
        } else {
          this.silenceSamples += input.length;
        }

        const length = this.segment.reduce((n, c) => n + c.length, 0);
        const endedByPause =
          this.speechSamples >= minSamples && this.silenceSamples >= silenceLimit;
        if (endedByPause || length >= maxSamples) {
          this.emitSegment(tailSamples);
        }
      }

      if (this.handlers.onLevels) {
        const bars = 48;
        const size = Math.floor(input.length / bars) || 1;
        const levels: number[] = [];
        for (let b = 0; b < bars; b += 1) {
          let barPeak = 0;
          for (let i = b * size; i < (b + 1) * size && i < input.length; i += 1) {
            barPeak = Math.max(barPeak, Math.abs(input[i]));
          }
          levels.push(Math.min(1, barPeak * 3));
        }
        this.handlers.onLevels(levels);
      }
    };

    this.source.connect(this.processor);
    this.processor.connect(this.ctx.destination);

    if (this.handlers.onWindow) {
      this.windowTimer = setInterval(() => {
        if (this.paused || !this.ctx || this.chunks.length === 0) return;
        this.handlers.onWindow?.(encodeWav(this.chunks, this.ctx.sampleRate));
      }, 12000);
    }
  }

  /** Emits the buffered speech as its own complete WAV, keeping a short overlap. */
  private emitSegment(tailSamples: number) {
    if (!this.ctx || !this.handlers.onSegment) return;
    const pending = [...this.tail, ...this.segment];
    const hadSpeech = this.speechSamples;
    this.segment = [];
    this.speechSamples = 0;
    this.silenceSamples = 0;
    this.speaking = false;

    // Keep the last slice of audio so a word split across the boundary survives.
    const kept: Float32Array[] = [];
    let keptLength = 0;
    for (let i = pending.length - 1; i >= 0 && keptLength < tailSamples; i -= 1) {
      kept.unshift(pending[i]);
      keptLength += pending[i].length;
    }
    this.tail = kept;

    if (hadSpeech < this.ctx.sampleRate * 0.15) return;
    this.handlers.onSegment(encodeWav(pending, this.ctx.sampleRate));
  }

  /** Flushes whatever speech is buffered right now (used on stop). */
  flushSegment() {
    if (!this.ctx) return;
    this.emitSegment(0);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    void this.ctx?.resume().catch(() => undefined);
  }

  async stop(): Promise<Blob> {
    if (this.windowTimer) clearInterval(this.windowTimer);
    this.windowTimer = null;
    this.paused = false;
    this.flushSegment();
    this.segment = [];
    this.tail = [];
    const rate = this.ctx?.sampleRate ?? 44100;
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    await this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.processor = null;
    this.source = null;
    this.stream = null;
    const blob = encodeWav(this.chunks, rate);
    this.chunks = [];
    return blob;
  }
}
