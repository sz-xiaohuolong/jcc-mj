import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Trophy } from "lucide-react";
import { useGameStore } from "../store/gameStore";
import { GameOverModal } from "./GameOverModal";

export function ResultModal() {
  const game = useGameStore((state) => state.game);
  const closeSettlement = useGameStore((state) => state.closeSettlement);
  const goHome = useGameStore((state) => state.goHome);
  const currentPlayer = game.players.find((player) => player.id === game.currentPlayerId);
  const showEndModal = game.phase === "game_over" || currentPlayer?.isAlive === false;
  const visible = game.lastSettlement.length > 0 || showEndModal;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {showEndModal ? (
            <GameOverModal players={game.players} winnerId={game.winnerId} currentPlayerId={game.currentPlayerId} onPrimary={goHome} />
          ) : (
            <motion.div className="result-modal" initial={{ y: 30, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.97 }}>
              <div className="flex items-center gap-3">
                <div className="icon-orb">
                  <Trophy size={22} />
                </div>
                <div>
                  <p className="eyebrow">结算</p>
                  <h2>{`第 ${Math.max(1, game.round - 1)} 回合结果`}</h2>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                {game.lastSettlement.map((entry) => (
                  <div key={entry.playerId} className="settlement-row">
                    <strong>{entry.playerName}</strong>
                    <span>
                      {entry.status === "winning"
                        ? `${entry.isRoundWinner ? "本回合胜者 · " : "质量落败 · "}${entry.patterns.map((pattern) => pattern.name).join("、")} · ${entry.combatScore}分`
                        : "未胡牌"}
                    </span>
                    <span>
                      {entry.hpBefore} → {entry.hpAfter}
                      {entry.damage > 0 ? ` / 扣 ${entry.damage}` : ""}
                    </span>
                  </div>
                ))}
              </div>
              <button className="primary-button mt-6 w-full" type="button" onClick={closeSettlement}>
                下一回合
                <ArrowRight size={17} />
              </button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
