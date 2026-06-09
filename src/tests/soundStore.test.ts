import { beforeEach, describe, expect, it } from "vitest";
import { useSoundStore } from "../store/soundStore";

describe("soundStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useSoundStore.setState({ enabled: true, volume: 0.75, musicVolume: 0.25 });
  });

  it("persists enabled state and audio volumes to localStorage", () => {
    useSoundStore.getState().toggleEnabled();
    useSoundStore.getState().setVolume(0.35);
    useSoundStore.getState().setMusicVolume(0.2);

    expect(useSoundStore.getState().enabled).toBe(false);
    expect(useSoundStore.getState().volume).toBe(0.35);
    expect(useSoundStore.getState().musicVolume).toBe(0.2);
    expect(localStorage.getItem("jcc-mj-sound-enabled")).toBe("false");
    expect(localStorage.getItem("jcc-mj-sound-volume")).toBe("0.35");
    expect(localStorage.getItem("jcc-mj-music-volume")).toBe("0.2");
  });

  it("clamps volumes into the valid range", () => {
    useSoundStore.getState().setVolume(2);
    expect(useSoundStore.getState().volume).toBe(1);

    useSoundStore.getState().setVolume(-1);
    expect(useSoundStore.getState().volume).toBe(0);

    useSoundStore.getState().setMusicVolume(2);
    expect(useSoundStore.getState().musicVolume).toBe(1);

    useSoundStore.getState().setMusicVolume(-1);
    expect(useSoundStore.getState().musicVolume).toBe(0);
  });
});
