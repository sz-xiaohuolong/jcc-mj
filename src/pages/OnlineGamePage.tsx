import { AnimatePresence, motion } from "framer-motion";
import { Lock, RefreshCcw, StepForward, Unlock, Wand2 } from "lucide-react";
import { tileDefinitions } from "../data/tiles";
import { getLevelUpCost } from "../store/gameStore";
import { useOnlineStore } from "../store/onlineStore";
import type { TileInstance } from "../types";
import { ArenaBoard } from "../components/ArenaBoard";
import { AugmentPanel } from "../components/AugmentPanel";
import { GameTopbar } from "../components/GameTopbar";
import { GameOverModal } from "../components/GameOverModal";
import { PlayerStatus } from "../components/PlayerStatus";
import { TileCard } from "../components/TileCard";
import { TraitPanel } from "../components/TraitPanel";

function definitionFor(tile: TileInstance) {
  return tileDefinitions.find((definition) => definition.id === tile.tileId);
}

export function OnlineGamePage() {
  const gameView = useOnlineStore((state) => state.gameView);
  const timerRemainingMs = useOnlineStore((state) => state.timerRemainingMs);
  const lastError = useOnlineStore((state) => state.lastError);
  const buyTile = useOnlineStore((state) => state.buyTile);
  const refreshShop = useOnlineStore((state) => state.refreshShop);
  const lockShop = useOnlineStore((state) => state.lockShop);
  const levelUp = useOnlineStore((state) => state.levelUp);
  const organizeHand = useOnlineStore((state) => state.organizeHand);
  const discardTile = useOnlineStore((state) => state.discardTile);
  const chooseAugment = useOnlineStore((state) => state.chooseAugment);
  const endTurn = useOnlineStore((state) => state.endTurn);
  const leaveRoom = useOnlineStore((state) => state.leaveRoom);

  if (!gameView) {
    return <main className="game-shell">等待服务端同步游戏状态...</main>;
  }

  const publicGame = gameView.public;
  const privatePlayer = gameView.privatePlayer;
  const me = publicGame.players.find((player) => player.id === privatePlayer.playerId);
  const players = publicGame.players.map((player) => ({
    ...player,
    meta: `手牌 ${player.handTileCount} · ${player.endedTurn ? "已结束" : "操作中"}`
  }));
  const showEndModal = publicGame.phase === "game_over" || me?.isAlive === false;
  const remainingSeconds = timerRemainingMs ? Math.ceil(timerRemainingMs / 1000) : publicGame.deadlineAt ? Math.max(0, Math.ceil((publicGame.deadlineAt - Date.now()) / 1000)) : 60;

  return (
    <main className="game-shell">
      <GameTopbar city={publicGame.city} round={publicGame.round} stage={publicGame.stage} gold={privatePlayer.gold} hp={privatePlayer.hp} level={privatePlayer.level} />
      <PlayerStatus players={players} winnerId={publicGame.winnerId} />
      <div className="online-phase-strip">
        <span>阶段：{publicGame.phase}</span>
        <span>倒计时：{remainingSeconds}s</span>
        {lastError && <span className="text-rose-300">{lastError}</span>}
      </div>
      <div className="game-grid">
        <aside className="space-y-4">
          <TraitPanel traits={me?.activeTraits ?? []} />
          <AugmentPanel augments={me?.augments.map((augment) => ({ ...augment, tags: [] })) ?? []} />
        </aside>
        <section className="table-stack">
          <ArenaBoard />
          {privatePlayer.augmentChoices.length > 0 && publicGame.phase === "augment_select" && (
            <div className="game-section">
              <div className="section-head">
                <h3>选择海克斯</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {privatePlayer.augmentChoices.map((augment) => (
                  <button key={augment.id} type="button" className="augment-option" onClick={() => chooseAugment(augment.id)}>
                    <span>{augment.rarity}</span>
                    <strong>{augment.name}</strong>
                    <p>{augment.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="game-section">
            <div className="section-head">
              <div>
                <p className="eyebrow">私有手牌</p>
                <h3>{privatePlayer.handTiles.length} 张</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="control-button" type="button" onClick={organizeHand}>
                  <Wand2 size={16} />
                  整理
                </button>
                <button className="primary-button" type="button" onClick={endTurn} disabled={privatePlayer.endedTurn}>
                  <StepForward size={17} />
                  {privatePlayer.endedTurn ? "等待其他玩家" : "结束回合"}
                </button>
              </div>
            </div>
            <div className="tile-rack">
              {privatePlayer.handTiles.map((tile) => (
                <TileCard key={tile.instanceId} tile={tile} definition={definitionFor(tile)} compact onClick={() => discardTile(tile.instanceId)} actionLabel="弃" />
              ))}
            </div>
          </div>
          <div className="game-section">
            <div className="section-head">
              <div>
                <p className="eyebrow">私有商店</p>
                <h3>五张牌刷新</h3>
              </div>
              <div className="flex gap-2">
                <button className="control-button" type="button" onClick={levelUp} disabled={privatePlayer.level >= 6 || privatePlayer.gold < getLevelUpCost(privatePlayer.level)}>
                  升级 · {getLevelUpCost(privatePlayer.level)} 金
                </button>
                <button className="control-button" type="button" onClick={refreshShop}>
                  <RefreshCcw size={16} />
                  刷新
                </button>
                <button className="icon-button" type="button" onClick={lockShop} title="锁定商店">
                  {privatePlayer.lockedShop ? <Lock size={17} /> : <Unlock size={17} />}
                </button>
              </div>
            </div>
            <div className="shop-grid">
              {privatePlayer.shop.map((tile) => {
                const definition = definitionFor(tile);
                const cannotAfford = Boolean(definition && privatePlayer.gold < definition.cost);
                const handFull = privatePlayer.handTiles.length >= 14;

                return (
                  <TileCard
                    key={tile.instanceId}
                    tile={tile}
                    definition={definition}
                    onClick={() => buyTile(tile.instanceId)}
                    actionLabel={handFull ? "手牌已满" : cannotAfford ? "金币不足" : "购买"}
                    disabled={cannotAfford || handFull}
                  />
                );
              })}
            </div>
          </div>
        </section>
        <aside className="side-panel">
          <div className="panel-title">同步战报</div>
          <div className="log-list">
            {publicGame.logs.slice(-10).map((log) => (
              <p key={log.id} className={`log-${log.tone ?? "info"}`}>
                R{log.round} · {log.message}
              </p>
            ))}
          </div>
          {publicGame.phase === "game_over" && (
            <div className="mt-4 rounded-lg bg-white/10 p-3">
              <strong>排名</strong>
              {publicGame.ranking.map((playerId, index) => (
                <p key={playerId} className="text-sm text-slate-300">
                  #{index + 1} {publicGame.players.find((player) => player.id === playerId)?.name ?? playerId}
                </p>
              ))}
            </div>
          )}
        </aside>
      </div>
      <AnimatePresence>
        {showEndModal && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GameOverModal
              players={publicGame.players}
              ranking={publicGame.ranking}
              winnerId={publicGame.winnerId}
              currentPlayerId={privatePlayer.playerId}
              ratingChanges={publicGame.ratingChanges}
              onPrimary={leaveRoom}
              primaryLabel="离开房间"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
