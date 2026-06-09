import { useEffect, useRef } from "react";
import { soundManager } from "../audio/soundManager";
import { useSoundStore } from "../store/soundStore";

export function BackgroundMusic() {
  const enabled = useSoundStore((state) => state.enabled);
  const musicVolume = useSoundStore((state) => state.musicVolume);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      soundManager.stopMusic();
      startedRef.current = false;
      return;
    }

    const startMusic = () => {
      startedRef.current = true;
      soundManager.playMusic("bgmLoop", { volume: musicVolume });
    };

    if (startedRef.current) {
      soundManager.playMusic("bgmLoop", { volume: musicVolume });
      return;
    }

    window.addEventListener("pointerdown", startMusic, { once: true });
    window.addEventListener("keydown", startMusic, { once: true });

    return () => {
      window.removeEventListener("pointerdown", startMusic);
      window.removeEventListener("keydown", startMusic);
    };
  }, [enabled, musicVolume]);

  useEffect(() => {
    soundManager.setMusicVolume(enabled ? musicVolume : 0);
  }, [enabled, musicVolume]);

  return null;
}
