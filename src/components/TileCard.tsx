import type { TileDefinition, TileInstance } from "../types";
import { traitDefinitions } from "../data/traits";

const suitLabel: Record<TileDefinition["suit"], string> = {
  wan: "萬",
  tong: "筒",
  tiao: "条",
  wind: "風",
  dragon: "令"
};

const traitNameById = new Map(traitDefinitions.map((trait) => [trait.id, trait.name]));

interface TileCardProps {
  tile: TileInstance;
  definition?: TileDefinition;
  compact?: boolean;
  selected?: boolean;
  onClick?: () => void;
  actionLabel?: string;
  disabled?: boolean;
}

export function TileCard({ tile, definition, compact = false, selected = false, onClick, actionLabel, disabled = false }: TileCardProps) {
  if (!definition) {
    return null;
  }

  const traitNames = definition.traits.map((traitId) => ({
    id: traitId,
    name: traitNameById.get(traitId) ?? traitId
  }));

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`tile-card tile-card--${definition.suit} group ${compact ? "tile-card--compact" : ""} ${selected ? "ring-2 ring-jade" : ""} ${disabled ? "tile-card--disabled" : ""}`}
      title={`${definition.name} · ${definition.traits.join(" / ")}`}
    >
      <span className="text-[10px] uppercase tracking-[0.22em] text-brass/80">{suitLabel[definition.suit]}</span>
      <span className="tile-face">{definition.rank ?? definition.name.slice(0, 1)}</span>
      <span className="tile-name">{definition.name}</span>
      <span className="tile-traits">
        {traitNames.map((trait) => (
          <span key={trait.id} className={`tile-trait tile-trait--${trait.id}`}>
            {trait.name}
          </span>
        ))}
      </span>
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
