// Haptic and sound feedback for tactile interactions

export type HapticType = "tap" | "success" | "warning" | "error" | "pop";

class AudioFeedback {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  play(type: HapticType) {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === "tap" || type === "pop") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(type === "pop" ? 440 : 320, now);
        osc.frequency.exponentialRampToValueAtTime(type === "pop" ? 660 : 180, now + 0.04);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (type === "success") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.06); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.12); // G5
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === "warning" || type === "error") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch {
      // AudioContext unavailable or blocked
    }
  }
}

const audio = new AudioFeedback();

export function triggerHaptic(type: HapticType = "tap", playSound = false) {
  if (typeof window === "undefined") return;

  // Haptic vibration via Vibration API (Android / PWA / TWA)
  if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
    try {
      if (type === "tap") {
        navigator.vibrate(12);
      } else if (type === "pop") {
        navigator.vibrate([8, 16, 8]);
      } else if (type === "success") {
        navigator.vibrate([20, 30, 40]);
      } else if (type === "warning" || type === "error") {
        navigator.vibrate([40, 40, 60]);
      }
    } catch {
      // Ignore vibration error
    }
  }

  if (playSound) {
    audio.play(type);
  }
}
