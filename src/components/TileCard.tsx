import type { TileDefinition, TileInstance } from "../types";

const suitLabel: Record<TileDefinition["suit"], string> = {
  wan: "萬",
  tong: "筒",
  tiao: "索",
  wind: "風",
  dragon: "令"
};

interface TileCardProps {
  tile: TileInstance;
  definition?: TileDefinition;
  compact?: boolean;
  selected?: boolean;
  onClick?: () => void;
  actionLabel?: string;
}

export function TileCard({ tile, definition, compact = false, selected = false, onClick, actionLabel }: TileCardProps) {
  if (!definition) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`tile-card group ${compact ? "tile-card--compact" : ""} ${selected ? "ring-2 ring-jade" : ""}`}
      title={`${definition.name} · ${definition.traits.join(" / ")}`}
    >
      <span className="text-[10px] uppercase tracking-[0.22em] text-brass/80">{suitLabel[definition.suit]}</span>
      <span className="tile-face">{definition.rank ?? definition.name.slice(0, 1)}</span>
      <span className="text-xs font-semibold text-slate-900">{definition.name}</span>
      {!compact && (
        <span className="mt-1 flex w-full items-center justify-between text-[10px] text-slate-700">
          <span>{definition.cost}金</span>
          <span>{definition.rarity}</span>
        </span>
      )}
      {actionLabel && <span className="tile-action">{actionLabel}</span>}
      <span className="sr-only">{tile.instanceId}</span>
    </button>
  );
}
