import { musicAssets, soundAssets, type MusicKey, type SoundKey } from "./soundAssets";

export interface SoundPlaybackOptions {
  volume?: number;
}

class SoundManager {
  private readonly cache = new Map<SoundKey, HTMLAudioElement>();
  private readonly musicCache = new Map<MusicKey, HTMLAudioElement>();
  private currentMusicKey: MusicKey | null = null;

  play(key: SoundKey, options: SoundPlaybackOptions = {}): void {
    if (typeof Audio === "undefined" || this.isPlaybackUnavailable()) {
      return;
    }

    const audio = this.getAudio(key);
    audio.volume = Math.max(0, Math.min(1, options.volume ?? 1));
    audio.currentTime = 0;

    try {
      const playback = audio.play();
      if (playback && typeof playback.catch === "function") {
        playback.catch(() => undefined);
      }
    } catch {
      // Browsers can block playback before the first user gesture; tests can also lack media support.
    }
  }

  preload(keys: SoundKey[] = Object.keys(soundAssets) as SoundKey[]): void {
    if (typeof Audio === "undefined" || this.isPlaybackUnavailable()) {
      return;
    }

    for (const key of keys) {
      this.getAudio(key);
    }
  }

  playMusic(key: MusicKey, options: SoundPlaybackOptions = {}): void {
    if (typeof Audio === "undefined" || this.isPlaybackUnavailable()) {
      return;
    }

    const music = this.getMusic(key);
    music.volume = Math.max(0, Math.min(1, options.volume ?? 0.25));
    music.loop = true;
    this.currentMusicKey = key;

    try {
      const playback = music.play();
      if (playback && typeof playback.catch === "function") {
        playback.catch(() => undefined);
      }
    } catch {
      // Browsers can block music until the first user gesture.
    }
  }

  setMusicVolume(volume: number): void {
    if (!this.currentMusicKey) return;

    const music = this.musicCache.get(this.currentMusicKey);
    if (music) {
      music.volume = Math.max(0, Math.min(1, volume));
    }
  }

  stopMusic(): void {
    if (!this.currentMusicKey) return;

    const music = this.musicCache.get(this.currentMusicKey);
    if (music) {
      music.pause();
      music.currentTime = 0;
    }
    this.currentMusicKey = null;
  }

  private getAudio(key: SoundKey): HTMLAudioElement {
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    const audio = new Audio(soundAssets[key]);
    audio.preload = "auto";
    this.cache.set(key, audio);
    return audio;
  }

  private getMusic(key: MusicKey): HTMLAudioElement {
    const cached = this.musicCache.get(key);
    if (cached) {
      return cached;
    }

    const audio = new Audio(musicAssets[key]);
    audio.preload = "auto";
    audio.loop = true;
    this.musicCache.set(key, audio);
    return audio;
  }

  private isPlaybackUnavailable(): boolean {
    return typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("jsdom");
  }
}

export const soundManager = new SoundManager();
