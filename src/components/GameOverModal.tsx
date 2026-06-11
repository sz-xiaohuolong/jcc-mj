import { motion } from "framer-motion";
import { ArrowRight, Crown, Eye, Skull, Trophy } from "lucide-react";
import type { RatingChange } from "../../shared/rating/ratingTypes";
import { RatingChangePanel } from "./RatingChangePanel";

export interface GameOverPlayer {
  id: string;
  name: string;
  hp: number;
  gold?: number;
  level?: number;
  isAlive: boolean;
}

export function GameOverModal({
  players,
  ranking,
  winnerId,
  currentPlayerId,
  ratingChanges = [],
  onPrimary,
  primaryLabel = "返回首页",
  onSecondary,
  secondaryLabel
}: {
  players: GameOverPlayer[];
  ranking?: string[];
  winnerId: string | null;
  currentPlayerId?: string;
  ratingChanges?: RatingChange[];
  onPrimary: () => void;
  primaryLabel?: string;
  onSecondary?: () => void;
  secondaryLabel?: string;
}) {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const orderedRanking =
    ranking && ranking.length > 0
      ? ranking
      : [...players].sort((left, right) => Number(right.isAlive) - Number(left.isAlive) || right.hp - left.hp).map((player) => player.id);
  const winner = winnerId ? playerById.get(winnerId) : undefined;
  const currentPlayer = currentPlayerId ? playerById.get(currentPlayerId) : undefined;
  const currentRank = currentPlayerId ? orderedRanking.indexOf(currentPlayerId) + 1 : 0;
  const currentWon = Boolean(currentPlayerId && currentPlayerId === winnerId);
  const currentEliminated = Boolean(currentPlayer && !currentPlayer.isAlive && !currentWon);
  const title = currentWon ? "你获得了胜利" : currentEliminated ? "你已被淘汰" : winner ? `${winner.name} 获胜` : "本局结算";
  const currentRatingChange = currentPlayerId
    ? ratingChanges.find((change) => change.playerId === currentPlayerId || change.profileId === currentPlayerId) ?? ratingChanges[0]
    : ratingChanges[0];

  return (
    <motion.div className="game-over-modal" initial={{ y: 30, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.97 }}>
      <div className="game-over-hero">
        <div className="icon-orb icon-orb--large">
          {currentWon ? <Crown size={30} /> : <Trophy size={30} />}
        </div>
        <div>
          <p className="eyebrow">最终结算</p>
          <h2>{title}</h2>
          <p>{currentRank > 0 ? `你的当前名次：第 ${currentRank} 名` : "本局已经结束"}</p>
        </div>
      </div>

      <RatingChangePanel change={currentRatingChange} />

      <div className="final-ranking">
        {orderedRanking.map((playerId, index) => {
          const player = playerById.get(playerId);
          if (!player) return null;

          return (
            <div key={player.id} className={`final-ranking-row ${player.id === currentPlayerId ? "final-ranking-row--me" : ""}`}>
              <span className="rank-number">#{index + 1}</span>
              <span className="rank-icon">{index === 0 ? <Crown size={18} /> : player.isAlive ? <Trophy size={17} /> : <Skull size={17} />}</span>
              <strong>{player.name}</strong>
              <span>{player.id === winnerId ? "胜利" : player.isAlive ? "存活" : "淘汰"}</span>
              <span>生命 {player.hp}</span>
              {typeof player.level === "number" && <span>Lv.{player.level}</span>}
            </div>
          );
        })}
      </div>

      <div className={`game-over-actions ${onSecondary && secondaryLabel ? "" : "game-over-actions--single"}`}>
        {onSecondary && secondaryLabel && (
          <button className="control-button" type="button" onClick={onSecondary}>
            <Eye size={17} />
            {secondaryLabel}
          </button>
        )}
        <button className="primary-button" type="button" onClick={onPrimary}>
          {primaryLabel}
          <ArrowRight size={17} />
        </button>
      </div>
    </motion.div>
  );
}
