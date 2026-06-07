import { Landmark } from "lucide-react";
import type { CityDefinition } from "../types";

export function CityBanner({ city, round, stage }: { city: CityDefinition | null; round: number; stage: number }) {
  return (
    <section className="city-banner">
      <div className="flex items-center gap-3">
        <div className="icon-orb">
          <Landmark size={22} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-jade/80">ROUND {round} · STAGE {stage}</p>
          <h2 className="font-display text-2xl text-white">{city?.name ?? "未知城邦"}</h2>
        </div>
      </div>
      <p className="max-w-2xl text-sm leading-6 text-slate-300">{city?.description}</p>
    </section>
  );
}
