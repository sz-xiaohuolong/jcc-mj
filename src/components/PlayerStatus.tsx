import { Bot, Coins, Crown, Heart, UserRound } from "lucide-react";

export interface PlayerStatusItem {
  id: string;
  name: string;
  isAI: boolean;
  hp: number;
  gold: number;
  level: number;
  isAlive?: boolean;
  connected?: boolean;
  meta?: string;
}

export function PlayerStatus({ players, winnerId }: { players: PlayerStatusItem[]; winnerId: string | null }) {
  return (
    <section className="player-strip">
      {players.map((player) => (
        <article key={player.id} className={`hud-panel ${player.isAlive === false ? "opacity-45" : ""}`}>
          <div className="player-medallion">{player.isAI ? <Bot size={26} /> : <UserRound size={26} />}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <strong className="truncate">{player.name}</strong>
              <span className={`status-dot ${player.connected === false ? "status-dot--offline" : ""}`}>{player.connected === false ? "离线" : "在线"}</span>
            </div>
            <div className="hp-track mt-2">
              <div style={{ width: `${Math.max(0, Math.min(100, player.hp))}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="hud-stat">
                <Heart size={15} />
                {player.hp}
              </span>
              <span className="hud-stat">
                <Coins size={15} />
                {player.gold}
              </span>
              <span className="hud-level">Lv.{player.level}</span>
            </div>
            {player.meta && <p className="player-meta">{player.meta}</p>}
          </div>
          {winnerId === player.id && <Crown size={18} className="winner-crown" />}
        </article>
      ))}
    </section>
  );
}
