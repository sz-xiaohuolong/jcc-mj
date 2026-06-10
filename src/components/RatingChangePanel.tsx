import type { RatingChange } from "../../shared/rating/ratingTypes";

export function RatingChangePanel({ change }: { change?: RatingChange }) {
  if (!change) return null;

  const deltaLabel = change.delta > 0 ? `+${change.delta}` : String(change.delta);

  return (
    <div className="rating-change-card">
      <div>
        <p className="eyebrow">积分变化</p>
        <strong className={change.delta >= 0 ? "rating-delta-positive" : "rating-delta-negative"}>{deltaLabel}</strong>
      </div>
      <div className="rating-change-grid">
        <span>本局排名</span>
        <strong>第 {change.rank} 名</strong>
        <span>变化前</span>
        <strong>{change.pointsBefore}</strong>
        <span>变化后</span>
        <strong>{change.pointsAfter}</strong>
        <span>当前段位</span>
        <strong>{change.tierAfter}</strong>
      </div>
    </div>
  );
}
