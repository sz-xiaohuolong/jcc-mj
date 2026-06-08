import { StepForward, Swords } from "lucide-react";
import { getLevelUpCost, useGameStore } from "../store/gameStore";
import { ArenaBoard } from "./ArenaBoard";
import { AugmentModal } from "./AugmentModal";
import { AugmentPanel } from "./AugmentPanel";
import { GameTopbar } from "./GameTopbar";
import { HandArea } from "./HandArea";
import { PlayerStatus } from "./PlayerStatus";
import { ResultModal } from "./ResultModal";
import { ShopArea } from "./ShopArea";
import { TraitPanel } from "./TraitPanel";

export function GameBoard() {
  const game = useGameStore((state) => state.game);
  const endTurn = useGameStore((state) => state.endTurn);
  const levelUp = useGameStore((state) => state.levelUp);
  const lastError = useGameStore((state) => state.lastError);
  const player = game.players.find((item) => item.id === game.currentPlayerId);
  const levelCost = player ? getLevelUpCost(player.level) : 0;

  return (
    <main className="game-shell">
      <GameTopbar city={game.city} round={game.round} stage={game.stage} gold={player?.gold ?? 0} hp={player?.hp ?? 0} level={player?.level ?? 0} />
      <PlayerStatus players={game.players} winnerId={game.winnerId} />
      <div className="game-grid">
        <aside className="space-y-4">
          <TraitPanel traits={player?.activeTraits ?? []} />
          <AugmentPanel augments={player?.augments ?? []} />
        </aside>
        <div className="table-stack">
          <ArenaBoard />
          <HandArea />
          <ShopArea />
        </div>
        <aside className="space-y-4">
          <section className="side-panel">
            <div className="panel-title">
              <Swords size={17} />
              操作台
            </div>
            <div className="resource-grid">
              <span>生命</span>
              <strong>{player?.hp}</strong>
              <span>金币</span>
              <strong>{player?.gold}</strong>
              <span>等级</span>
              <strong>{player?.level}</strong>
            </div>
            <button className="control-button mt-4 w-full" type="button" onClick={levelUp}>
              升级 · {levelCost} 金
            </button>
            {lastError && <p className="notice-line notice-line--warn">{lastError}</p>}
            <button className="primary-button mt-4 w-full" type="button" onClick={endTurn}>
              结束回合
              <StepForward size={17} />
            </button>
          </section>
          <section className="side-panel">
            <div className="panel-title">战报</div>
            <div className="log-list">
              {game.logs.slice(-8).map((log) => (
                <p key={log.id} className={`log-${log.tone ?? "info"}`}>
                  R{log.round} · {log.message}
                </p>
              ))}
            </div>
          </section>
        </aside>
      </div>
      <AugmentModal />
      <ResultModal />
    </main>
  );
}
