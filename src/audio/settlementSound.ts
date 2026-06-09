import type { GamePhase, SettlementEntry } from "../types";
import { playGameSound } from "./playGameSound";

interface SettlementSoundInput {
  scope: "single" | "online";
  round: number;
  phase: GamePhase;
  currentPlayerId?: string;
  winnerId: string | null;
  lastSettlement: SettlementEntry[];
}

const playedSettlementSignatures = new Set<string>();

function createSignature(input: SettlementSoundInput): string {
  const settlementPart = input.lastSettlement
    .map((entry) => `${entry.playerId}:${entry.hpBefore}:${entry.hpAfter}:${entry.damage}:${entry.status}:${entry.combatScore}`)
    .join("|");

  return `${input.scope}:${input.currentPlayerId ?? "unknown"}:${input.round}:${input.phase}:${input.winnerId ?? "none"}:${settlementPart}`;
}

export function resetSettlementSoundHistory(): void {
  playedSettlementSignatures.clear();
}

export function playSettlementSounds(input: SettlementSoundInput): void {
  if (!input.currentPlayerId || input.lastSettlement.length === 0) {
    return;
  }

  const signature = createSignature(input);
  if (playedSettlementSignatures.has(signature)) {
    return;
  }
  playedSettlementSignatures.add(signature);

  if (input.phase === "game_over") {
    playGameSound(input.winnerId === input.currentPlayerId ? "gameWin" : "gameLose", { delayMs: 300 });
    return;
  }

  const currentEntry = input.lastSettlement.find((entry) => entry.playerId === input.currentPlayerId);
  const otherWinningEntry = input.lastSettlement.find((entry) => entry.playerId !== input.currentPlayerId && entry.status === "winning");

  if (currentEntry?.status === "winning") {
    playGameSound("winHu", { delayMs: 300 });
    return;
  }

  if (currentEntry && currentEntry.damage > 0) {
    playGameSound("damageHit", { delayMs: 300 });
  }

  if (otherWinningEntry) {
    playGameSound("aiHu", { delayMs: 300, volumeMultiplier: 0.65 });
  }
}
