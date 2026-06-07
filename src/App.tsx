import { GamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";
import { RulePage } from "./pages/RulePage";
import { useGameStore } from "./store/gameStore";

export default function App() {
  const view = useGameStore((state) => state.view);

  if (view === "rules") {
    return <RulePage />;
  }

  if (view === "game") {
    return <GamePage />;
  }

  return <HomePage />;
}
