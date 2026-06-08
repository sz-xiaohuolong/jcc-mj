import { Lock, RefreshCcw, Unlock } from "lucide-react";
import { useGameStore } from "../store/gameStore";
import { TileCard } from "./TileCard";

export function ShopArea() {
  const game = useGameStore((state) => state.game);
  const getDefinition = useGameStore((state) => state.getDefinition);
  const buyFromShop = useGameStore((state) => state.buyFromShop);
  const refreshShop = useGameStore((state) => state.refreshShop);
  const toggleLockShop = useGameStore((state) => state.toggleLockShop);
  const player = game.players.find((item) => item.id === game.currentPlayerId);

  return (
    <section className="game-section">
      <div className="section-head">
        <div>
          <p className="eyebrow">商店</p>
          <h3>五张牌刷新</h3>
        </div>
        <div className="flex gap-2">
          <button className="control-button" type="button" onClick={refreshShop}>
            <RefreshCcw size={16} />
            刷新
          </button>
          <button className="icon-button" type="button" onClick={toggleLockShop} title="锁定商店">
            {player?.lockedShop ? <Lock size={17} /> : <Unlock size={17} />}
          </button>
        </div>
      </div>
      <div className="shop-grid">
        {game.shop.map((tile) => {
          const definition = getDefinition(tile);
          const cannotAfford = Boolean(player && definition && player.gold < definition.cost);
          const handFull = Boolean(player && player.handTiles.length >= 14);

          return (
            <TileCard
              key={tile.instanceId}
              tile={tile}
              definition={definition}
              onClick={() => buyFromShop(tile.instanceId)}
              actionLabel={handFull ? "手牌已满" : cannotAfford ? "金币不足" : "购买"}
              disabled={cannotAfford || handFull}
            />
          );
        })}
      </div>
    </section>
  );
}
