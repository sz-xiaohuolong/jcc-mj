export function ArenaBoard() {
  return (
    <section className="arena-board" aria-label="桌面">
      <div className="arena-lotus" />
      <div className="arena-slots">
        {Array.from({ length: 10 }).map((_, index) => (
          <span key={index} />
        ))}
      </div>
    </section>
  );
}
