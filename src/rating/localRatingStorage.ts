import { applyRatingDelta, calculateRatingDelta, tierForPoints } from "../../shared/rating/ratingRules";
import type { LeaderboardItem, RatingChange, RatingMatchRecord } from "../../shared/rating/ratingTypes";
import type { SoloRatingProfile } from "./ratingTypes";

const profileIdKey = "jcc-mj-profile-id";
const soloProfileKey = "jcc-mj-solo-rating-profile";
const maxLocalRecords = 50;

function storage(): Storage | null {
  return typeof localStorage === "undefined" ? null : localStorage;
}

function createProfileId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `profile_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

export function getOrCreateProfileId(): string {
  const local = storage();
  if (!local) return createProfileId();

  const existing = local.getItem(profileIdKey);
  if (existing) return existing;

  const profileId = createProfileId();
  local.setItem(profileIdKey, profileId);
  return profileId;
}

function emptyProfile(nickname = "玩家"): SoloRatingProfile {
  return {
    profileId: getOrCreateProfileId(),
    nickname: nickname.trim() || "玩家",
    soloPoints: 0,
    soloMatches: 0,
    soloWins: 0,
    highestHuScore: 0,
    matchRecords: []
  };
}

export function readSoloRatingProfile(nickname?: string): SoloRatingProfile {
  const local = storage();
  if (!local) return emptyProfile(nickname);

  const raw = local.getItem(soloProfileKey);
  if (!raw) return emptyProfile(nickname);

  try {
    const parsed = JSON.parse(raw) as Partial<SoloRatingProfile>;
    return {
      ...emptyProfile(nickname),
      ...parsed,
      profileId: parsed.profileId || getOrCreateProfileId(),
      nickname: nickname?.trim() || parsed.nickname || "玩家",
      soloPoints: Math.max(0, Math.floor(parsed.soloPoints ?? 0)),
      soloMatches: Math.max(0, Math.floor(parsed.soloMatches ?? 0)),
      soloWins: Math.max(0, Math.floor(parsed.soloWins ?? 0)),
      highestHuScore: Math.max(0, Math.floor(parsed.highestHuScore ?? 0)),
      matchRecords: Array.isArray(parsed.matchRecords) ? parsed.matchRecords.slice(0, maxLocalRecords) : []
    };
  } catch {
    return emptyProfile(nickname);
  }
}

export function saveSoloRatingProfile(profile: SoloRatingProfile): void {
  const local = storage();
  if (!local) return;

  local.setItem(profileIdKey, profile.profileId);
  local.setItem(
    soloProfileKey,
    JSON.stringify({
      ...profile,
      soloPoints: Math.max(0, Math.floor(profile.soloPoints)),
      matchRecords: profile.matchRecords.slice(0, maxLocalRecords)
    })
  );
}

export function recordSoloMatch({
  nickname,
  rank,
  highestHuScore
}: {
  nickname: string;
  rank: number;
  highestHuScore: number;
}): RatingChange {
  const profile = readSoloRatingProfile(nickname);
  const pointsBefore = profile.soloPoints;
  const delta = calculateRatingDelta({ mode: "solo", rank });
  const pointsAfter = applyRatingDelta(pointsBefore, delta);
  const change: RatingChange = {
    profileId: profile.profileId,
    nickname: profile.nickname,
    mode: "solo",
    rank,
    pointsBefore,
    pointsAfter,
    delta: pointsAfter - pointsBefore,
    tierBefore: tierForPoints(pointsBefore),
    tierAfter: tierForPoints(pointsAfter),
    highestHuScore
  };
  const record: RatingMatchRecord = {
    ...change,
    id: `solo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    playedAt: Date.now()
  };

  saveSoloRatingProfile({
    ...profile,
    soloPoints: pointsAfter,
    soloMatches: profile.soloMatches + 1,
    soloWins: profile.soloWins + (rank === 1 ? 1 : 0),
    highestHuScore: Math.max(profile.highestHuScore, highestHuScore),
    matchRecords: [record, ...profile.matchRecords].slice(0, maxLocalRecords)
  });

  return change;
}

export function getSoloLeaderboard(): LeaderboardItem[] {
  const profile = readSoloRatingProfile();
  return [
    {
      profileId: profile.profileId,
      nickname: profile.nickname,
      tier: tierForPoints(profile.soloPoints),
      points: profile.soloPoints,
      wins: profile.soloWins,
      matches: profile.soloMatches,
      winRate: profile.soloMatches > 0 ? profile.soloWins / profile.soloMatches : 0,
      highestHuScore: profile.highestHuScore
    }
  ];
}
