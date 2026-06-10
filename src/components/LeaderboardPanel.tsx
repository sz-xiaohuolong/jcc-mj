import type { LeaderboardItem } from "../../shared/rating/ratingTypes";

export function LeaderboardPanel({ items }: { items: LeaderboardItem[] }) {
  return (
    <div className="leaderboard-table">
      <div className="leaderboard-row leaderboard-row--head">
        <span>排名</span>
        <span>昵称</span>
        <span>段位</span>
        <span>积分</span>
        <span>胜场</span>
        <span>对局</span>
        <span>胜率</span>
        <span>最高胡牌战力</span>
      </div>
      {items.length === 0 ? (
        <div className="leaderboard-empty">暂无排行榜数据</div>
      ) : (
        items.map((item, index) => (
          <div key={item.profileId} className="leaderboard-row">
            <strong>#{index + 1}</strong>
            <span>{item.nickname}</span>
            <span>{item.tier}</span>
            <strong>{item.points}</strong>
            <span>{item.wins}</span>
            <span>{item.matches}</span>
            <span>{Math.round(item.winRate * 100)}%</span>
            <span>{item.highestHuScore}</span>
          </div>
        ))
      )}
    </div>
  );
}
