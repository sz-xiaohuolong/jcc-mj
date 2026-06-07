import { Home } from "lucide-react";
import { GameBoard } from "../components/GameBoard";
import { useGameStore } from "../store/gameStore";

export function GamePage() {
  const goHome = useGameStore((state) => state.goHome);

  return (
    <>
      <button className="home-float" type="button" onClick={goHome} title="返回首页">
        <Home size={17} />
      </button>
      <GameBoard />
    </>
  );
}
