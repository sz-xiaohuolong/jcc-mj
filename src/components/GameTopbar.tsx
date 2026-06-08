import { Coins, Gem, Heart } from "lucide-react";
import type { CityDefinition } from "../types";
import { CityBanner } from "./CityBanner";

interface GameTopbarProps {
  city: CityDefinition | null;
  round: number;
  stage: number;
  gold: number;
  hp: number;
  level: number;
}

export function GameTopbar({ city, round, stage, gold, hp, level }: GameTopbarProps) {
  return (
    <div className="game-topbar">
      <div className="game-brand">
        <span className="brand-knot" />
        <div>
          <p className="eyebrow">JCC MAHJONG</p>
          <h1>羁绊麻将</h1>
        </div>
      </div>
      <CityBanner city={city} round={round} stage={stage} />
      <div className="resource-dock" aria-label="玩家资源">
        <span>
          <Coins size={18} />
          {gold}
        </span>
        <span>
          <Heart size={18} />
          {hp}
        </span>
        <span>
          <Gem size={18} />
          Lv.{level}
        </span>
      </div>
    </div>
  );
}
