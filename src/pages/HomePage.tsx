import { BookOpen, Play, RadioTower, Trophy } from "lucide-react";
import { SoundSettingsButton } from "../components/SoundSettingsButton";
import { useGameStore } from "../store/gameStore";

export function HomePage() {
  const startGame = useGameStore((state) => state.startGame);
  const openRules = useGameStore((state) => state.openRules);
  const openLeaderboard = useGameStore((state) => state.openLeaderboard);
  const openOnlineHome = useGameStore((state) => state.openOnlineHome);

  return (
    <main className="home-screen">
      <header className="home-topbar">
        <div className="home-brand">
          <div className="brand-tile" aria-hidden="true">
            雀
          </div>
          <div>
            <div className="brand-name">羁绊麻将</div>
            <div className="brand-subtitle">国风麻将 × 羁绊构筑</div>
          </div>
        </div>
        <SoundSettingsButton />
      </header>

      <section className="home-layout">
        <div className="home-hero-copy">
          <p className="eyebrow">原创机制：不仅要胡，还要胡得漂亮</p>
          <h1>
            胡牌只是开始，
            <br />
            羁绊才是胜负手。
          </h1>

          <p className="home-copy">
            创建房间邀请好友同局竞技，不足四人自动补 AI。每名玩家拥有私有商店和手牌，服务端统一结算胡牌质量、扣血和最终排名。
          </p>

          <div className="home-actions">
            <button className="primary-button home-action-primary" type="button" onClick={openOnlineHome}>
              <RadioTower size={20} />
              联机开房
            </button>
            <button className="home-action-secondary" type="button" onClick={startGame}>
              <Play size={18} />
              单机练习
            </button>
          </div>

          <div className="home-link-cards">
            <button className="mini-card" type="button" onClick={openRules}>
              <BookOpen size={18} />
              <span>规则说明</span>
            </button>
            <button className="mini-card" type="button" onClick={openLeaderboard}>
              <Trophy size={18} />
              <span>排行榜</span>
            </button>
          </div>

          <div className="home-tags" aria-label="游戏特色">
            <span>四人竞技</span>
            <span>私有商店</span>
            <span>羁绊加成</span>
            <span>AI 补位</span>
          </div>
        </div>

        <div className="home-visual" aria-hidden="true">
          <div className="visual-board">
            <div className="visual-board-head">
              <span>私有商店</span>
              <strong>Lv.5</strong>
            </div>
            <div className="visual-shop-row">
              {["万", "条", "筒", "风", "令"].map((tile, index) => (
                <span key={`${tile}-${index}`}>{tile}</span>
              ))}
            </div>
            <div className="visual-hand-row">
              {["3万", "6条", "东", "中", "8筒", "青"].map((tile) => (
                <span key={tile}>{tile}</span>
              ))}
            </div>
          </div>

          <div className="visual-bond-card">
            <p>羁绊激活</p>
            <strong>4 圣盾城 · 2 秘术师</strong>
          </div>

          <div className="floating-panel panel-rank">
            <span>当前排名</span>
            <strong>#1</strong>
          </div>

          <div className="floating-panel panel-round">
            <span>回合结算</span>
            <strong>胡牌 +12</strong>
          </div>
        </div>
      </section>
    </main>
  );
}
