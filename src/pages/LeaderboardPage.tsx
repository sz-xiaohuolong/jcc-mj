import { ArrowLeft, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import type { LeaderboardItem } from "../../shared/rating/ratingTypes";
import { LeaderboardPanel } from "../components/LeaderboardPanel";
import { getSoloLeaderboard } from "../rating/localRatingStorage";
import { useGameStore } from "../store/gameStore";
import { resolveOnlineServerUrl } from "../utils/network";

type LeaderboardTab = "solo" | "online";

export function LeaderboardPage() {
  const goHome = useGameStore((state) => state.goHome);
  const [tab, setTab] = useState<LeaderboardTab>("solo");
  const [soloItems, setSoloItems] = useState<LeaderboardItem[]>(() => getSoloLeaderboard());
  const [onlineItems, setOnlineItems] = useState<LeaderboardItem[]>([]);
  const [lastError, setLastError] = useState<string | undefined>();

  const loadOnlineLeaderboard = async () => {
    try {
      setLastError(undefined);
      setSoloItems(getSoloLeaderboard());
      const serverUrl = resolveOnlineServerUrl(import.meta.env.VITE_SERVER_URL, window.location);
      const response = await fetch(`${serverUrl}/leaderboard`);
      const payload = (await response.json()) as { ok: boolean; data?: LeaderboardItem[] };
      setOnlineItems(payload.ok && payload.data ? payload.data : []);
    } catch {
      setLastError("联机榜暂时无法连接服务端。");
      setOnlineItems([]);
    }
  };

  useEffect(() => {
    void loadOnlineLeaderboard();
  }, []);

  return (
    <main className="rules-screen leaderboard-screen">
      <button className="ghost-button" type="button" onClick={goHome}>
        <ArrowLeft size={17} />
        返回首页
      </button>
      <header className="rules-header">
        <p className="eyebrow">RANKING</p>
        <h1>排行榜</h1>
      </header>
      <div className="leaderboard-toolbar">
        <div className="segmented-control">
          <button type="button" className={tab === "solo" ? "active" : ""} onClick={() => setTab("solo")}>
            单机榜
          </button>
          <button type="button" className={tab === "online" ? "active" : ""} onClick={() => setTab("online")}>
            联机榜
          </button>
        </div>
        <button className="control-button" type="button" onClick={() => void loadOnlineLeaderboard()}>
          <RefreshCcw size={16} />
          刷新
        </button>
      </div>
      {lastError && <p className="notice-line notice-line--warn">{lastError}</p>}
      <LeaderboardPanel items={tab === "solo" ? soloItems : onlineItems} />
    </main>
  );
}
