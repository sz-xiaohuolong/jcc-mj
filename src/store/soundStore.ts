import { create } from "zustand";

const enabledKey = "jcc-mj-sound-enabled";
const volumeKey = "jcc-mj-sound-volume";
const musicVolumeKey = "jcc-mj-music-volume";

interface SoundState {
  enabled: boolean;
  volume: number;
  musicVolume: number;
  toggleEnabled: () => void;
  setVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
}

function readBoolean(key: string, fallback: boolean): boolean {
  if (typeof localStorage === "undefined") {
    return fallback;
  }

  const value = localStorage.getItem(key);
  return value === null ? fallback : value === "true";
}

function readVolume(): number {
  if (typeof localStorage === "undefined") {
    return 0.75;
  }

  const raw = Number(localStorage.getItem(volumeKey));
  return Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0.75;
}

export const useSoundStore = create<SoundState>((set) => ({
  enabled: readBoolean(enabledKey, true),
  volume: readVolume(),
  musicVolume: (() => {
    if (typeof localStorage === "undefined") {
      return 0.25;
    }

    const raw = Number(localStorage.getItem(musicVolumeKey));
    return Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0.25;
  })(),

  toggleEnabled() {
    set((state) => {
      const enabled = !state.enabled;
      localStorage.setItem(enabledKey, String(enabled));
      return { enabled };
    });
  },

  setVolume(volume) {
    const nextVolume = Math.max(0, Math.min(1, volume));
    localStorage.setItem(volumeKey, String(nextVolume));
    set({ volume: nextVolume });
  },

  setMusicVolume(volume) {
    const nextVolume = Math.max(0, Math.min(1, volume));
    localStorage.setItem(musicVolumeKey, String(nextVolume));
    set({ musicVolume: nextVolume });
  }
}));
