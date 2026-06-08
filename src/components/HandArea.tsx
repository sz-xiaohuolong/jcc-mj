import { Trash2, Wand2 } from "lucide-react";
import { getWinningPatterns, estimateDistanceToWin } from "../engine/huChecker";
import { useGameStore } from "../store/gameStore";
import { TileCard } from "./TileCard";

export function HandArea() {
  const game = useGameStore((state) => state.game);
  const getDefinition = useGameStore((state) => state.getDefinition);
  const getTileDefinitions = useGameStore((state) => state.getTileDefinitions);
  const discard = useGameStore((state) => state.discard);
  const organizeHand = useGameStore((state) => state.organizeHand);
  const player = game.players.find((item) => item.id === game.currentPlayerId);

  if (!player) {
    return null;
  }

  const handDefinitions = getTileDefinitions(player.handTiles);
  const patterns = getWinningPatterns(handDefinitions);
  const distance = estimateDistanceToWin(handDefinitions);

  return (
    <section className="game-section">
      <div className="section-head">
        <div>
          <p className="eyebrow">手牌</p>
          <h3>{patterns.length > 0 ? patterns.map((pattern) => pattern.name).join(" / ") : `距离成型 ${distance}`}</h3>
        </div>
        <button className="control-button" type="button" onClick={organizeHand}>
          <Wand2 size={16} />
          整理
        </button>
      </div>
      <div className="tile-rack">
        {player.handTiles.map((tile) => (
          <TileCard
            key={tile.instanceId}
            tile={tile}
            definition={getDefinition(tile)}
            compact
            onClick={() => discard(tile.instanceId)}
            actionLabel="弃"
          />
        ))}
      </div>
      <div className="mt-4">
        <div className="area-label">
          <Trash2 size={15} />
          弃牌区
        </div>
        <div className="discard-line">
          {player.discardTiles.slice(-8).map((tile) => (
            <span key={tile.instanceId}>{getDefinition(tile)?.name}</span>
          ))}
          {player.discardTiles.length === 0 && <span className="empty-copy">尚未弃牌</span>}
        </div>
      </div>
    </section>
  );
}
