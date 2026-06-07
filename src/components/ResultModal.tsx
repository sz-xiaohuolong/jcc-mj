import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Trophy } from "lucide-react";
import { useGameStore } from "../store/gameStore";

export function ResultModal() {
  const game = useGameStore((state) => state.game);
  const closeSettlement = useGameStore((state) => state.closeSettlement);
  const goHome = useGameStore((state) => state.goHome);
  const visible = game.lastSettlement.length > 0 || game.phase === "game_over";
  const winner = game.players.find((player) => player.id === game.winnerId);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="result-modal" initial={{ y: 30, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, scale: 0.97 }}>
            <div className="flex items-center gap-3">
              <div className="icon-orb">
                <Trophy size={22} />
              </div>
              <div>
                <p className="eyebrow">结算</p>
                <h2>{game.phase === "game_over" ? `${winner?.name ?? "无人"} 获胜` : `第 ${Math.max(1, game.round - 1)} 回合结果`}</h2>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {game.lastSettlement.map((entry) => (
                <div key={entry.playerId} className="settlement-row">
                  <strong>{entry.playerName}</strong>
                  <span>{entry.status === "winning" ? entry.patterns.map((pattern) => pattern.name).join("、") : "未胡牌"}</span>
                  <span>
                    {entry.hpBefore} → {entry.hpAfter}
                  </span>
                </div>
              ))}
            </div>
            <button className="primary-button mt-6 w-full" type="button" onClick={game.phase === "game_over" ? goHome : closeSettlement}>
              {game.phase === "game_over" ? "返回首页" : "下一回合"}
              <ArrowRight size={17} />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
