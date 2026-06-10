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
        <p className="eyebrow">原创机制</p>
        <h1>羁绊麻将</h1>
        <p className="home-copy">
          创建房间邀请朋友同局竞技，不足四人自动补 AI。每名玩家拥有私有商店和手牌，服务端统一结算胡牌质量、扣血和最终排名。
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
