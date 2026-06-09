import { BookOpen, Play, RadioTower } from "lucide-react";
import { SoundSettingsButton } from "../components/SoundSettingsButton";
import { useGameStore } from "../store/gameStore";

export function HomePage() {
  const startGame = useGameStore((state) => state.startGame);
  const openRules = useGameStore((state) => state.openRules);
  const openOnlineHome = useGameStore((state) => state.openOnlineHome);

  return (
    <main className="home-screen">
      <div className="home-sound-settings">
        <SoundSettingsButton />
      </div>
      <section className="home-hero">
        <div className="mahjong-mark" aria-hidden="true">
          雀
        </div>
        <p className="eyebrow">原创机制 · 单机策略构筑</p>
        <h1>羁绊麻将</h1>
        <p className="home-copy">
          用金币刷新牌池，用羁绊改变构筑，用基础胡牌击败三名 AI。第一版聚焦规则清晰、回合流畅和可扩展代码结构。
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button className="primary-button" type="button" onClick={startGame}>
            <Play size={18} />
            单机模式
          </button>
          <button className="primary-button" type="button" onClick={openOnlineHome}>
            <RadioTower size={18} />
            联机模式
          </button>
          <button className="ghost-button" type="button" onClick={openRules}>
            <BookOpen size={18} />
            规则说明
          </button>
        </div>
      </section>
    </main>
  );
}
