export const SOUND_NAMES = ["correct", "wrong", "levelup", "achievement", "warning", "combo", "gameover"] as const;
export type SoundName = (typeof SOUND_NAMES)[number];

const VOLUME: Record<SoundName, number> = {
  correct: 0.55,
  wrong: 0.45,
  levelup: 0.6,
  achievement: 0.6,
  warning: 0.35,
  combo: 0.5,
  gameover: 0.55,
};

type AudioContextCtor = typeof AudioContext;

/**
 * Plays the WAV files in /public/sounds through Web Audio. Files are fetched
 * lazily on the first user gesture, so they never cost anything on page load.
 */
class SoundManager {
  private ctx: AudioContext | null = null;
  private buffers = new Map<SoundName, AudioBuffer>();
  private loading: Promise<void> | null = null;
  muted = false;

  private context(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor: AudioContextCtor | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  /** Call from a click/keypress: resumes audio and starts downloading sounds. */
  unlock(): void {
    const ctx = this.context();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    if (!this.loading) {
      this.loading = Promise.all(
        SOUND_NAMES.map(async (name) => {
          try {
            const res = await fetch(`/sounds/${name}.wav`);
            const data = await res.arrayBuffer();
            this.buffers.set(name, await ctx.decodeAudioData(data));
          } catch {
            // A missing sound should never break the game.
          }
        }),
      ).then(() => undefined);
    }
  }

  play(name: SoundName): void {
    if (this.muted) return;
    const ctx = this.context();
    if (!ctx) return;
    this.unlock();
    const buffer = this.buffers.get(name);
    if (!buffer) {
      // Not decoded yet (first ever sound) — play once it is ready if it's still relevant.
      void this.loading?.then(() => {
        const ready = this.buffers.get(name);
        if (ready && !this.muted && name !== "warning") this.start(ctx, ready, name);
      });
      return;
    }
    this.start(ctx, buffer, name);
  }

  private start(ctx: AudioContext, buffer: AudioBuffer, name: SoundName) {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = VOLUME[name];
    source.buffer = buffer;
    source.connect(gain).connect(ctx.destination);
    source.start();
  }
}

export const sound = new SoundManager();
