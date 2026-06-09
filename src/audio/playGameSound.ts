import { useSoundStore } from "../store/soundStore";
import { soundManager } from "./soundManager";
import type { SoundKey } from "./soundAssets";

export interface PlayGameSoundOptions {
  volumeMultiplier?: number;
  delayMs?: number;
}

export function playGameSound(key: SoundKey, options: PlayGameSoundOptions = {}): void {
  const { enabled, volume } = useSoundStore.getState();
  if (!enabled) {
    return;
  }

  const play = () => soundManager.play(key, { volume: volume * (options.volumeMultiplier ?? 1) });

  if (options.delayMs && options.delayMs > 0) {
    globalThis.setTimeout(play, options.delayMs);
    return;
  }

  play();
}
