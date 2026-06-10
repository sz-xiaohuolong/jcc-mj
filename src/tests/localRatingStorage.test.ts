import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOrCreateProfileId, readSoloRatingProfile, recordSoloMatch } from "../rating/localRatingStorage";

describe("localRatingStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000001");
  });

  it("initializes a persistent profile id", () => {
    expect(getOrCreateProfileId()).toBe("00000000-0000-4000-8000-000000000001");
    expect(getOrCreateProfileId()).toBe("00000000-0000-4000-8000-000000000001");
    expect(localStorage.getItem("jcc-mj-profile-id")).toBe("00000000-0000-4000-8000-000000000001");
  });

  it("saves and reads solo rating", () => {
    const change = recordSoloMatch({ nickname: "小火龙", rank: 1, highestHuScore: 28 });
    const profile = readSoloRatingProfile("小火龙");

    expect(change.delta).toBe(30);
    expect(profile.profileId).toBe("00000000-0000-4000-8000-000000000001");
    expect(profile.nickname).toBe("小火龙");
    expect(profile.soloPoints).toBe(30);
    expect(profile.soloMatches).toBe(1);
    expect(profile.soloWins).toBe(1);
    expect(profile.highestHuScore).toBe(28);
    expect(profile.matchRecords).toHaveLength(1);
  });
});
