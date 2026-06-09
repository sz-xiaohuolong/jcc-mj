import { Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import { playGameSound } from "../audio/playGameSound";
import { useSoundStore } from "../store/soundStore";

export function SoundSettingsButton() {
  const [open, setOpen] = useState(false);
  const enabled = useSoundStore((state) => state.enabled);
  const volume = useSoundStore((state) => state.volume);
  const musicVolume = useSoundStore((state) => state.musicVolume);
  const toggleEnabled = useSoundStore((state) => state.toggleEnabled);
  const setVolume = useSoundStore((state) => state.setVolume);
  const setMusicVolume = useSoundStore((state) => state.setMusicVolume);
  const Icon = enabled ? Volume2 : VolumeX;

  return (
    <div className="sound-settings">
      <button
        className="icon-button sound-toggle"
        type="button"
        title={enabled ? "关闭音效" : "开启音效"}
        onClick={() => {
          playGameSound("uiClick");
          toggleEnabled();
          setOpen(true);
        }}
      >
        <Icon size={18} />
      </button>
      <button
        className="ghost-button sound-more"
        type="button"
        onClick={() => {
          playGameSound("uiClick");
          setOpen((value) => !value);
        }}
      >
        音效
      </button>
      {open && (
        <div className="sound-popover">
          <label>
            <span>音效音量</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              onMouseUp={() => playGameSound("uiClick")}
              onTouchEnd={() => playGameSound("uiClick")}
            />
            <span>{Math.round(volume * 100)}%</span>
          </label>
          <label>
            <span>BGM 音量</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={(event) => setMusicVolume(Number(event.target.value))}
            />
            <span>{Math.round(musicVolume * 100)}%</span>
          </label>
        </div>
      )}
    </div>
  );
}
