import { Bot, Crown, Heart, UserRound } from "lucide-react";
import type { PlayerState } from "../types";

export function PlayerStatus({ players, winnerId }: { players: PlayerState[]; winnerId: string | null }) {
  return (
    <section className="grid gap-3 md:grid-cols-4">
      {players.map((player) => (
        <article key={player.id} className={`hud-panel ${!player.isAlive ? "opacity-45" : ""}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {player.isAI ? <Bot size={17} className="text-violet" /> : <UserRound size={17} className="text-jade" />}
              <strong>{player.name}</strong>
            </div>
            {winnerId === player.id && <Crown size={18} className="text-brass" />}
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
            <span className="flex items-center gap-1">
              <Heart size={15} className="text-rose-300" />
              {player.hp}
            </span>
            <span>{player.gold} 金</span>
            <span>Lv.{player.level}</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-brass" style={{ width: `${player.hp}%` }} />
          </div>
        </article>
      ))}
    </section>
  );
}
