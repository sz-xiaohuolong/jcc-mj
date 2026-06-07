import { GamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";
import { OnlineGamePage } from "./pages/OnlineGamePage";
import { OnlineHomePage } from "./pages/OnlineHomePage";
import { RoomLobbyPage } from "./pages/RoomLobbyPage";
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

  if (view === "online-home") {
    return <OnlineHomePage />;
  }

  if (view === "online-lobby") {
    return <RoomLobbyPage />;
  }

  if (view === "online-game") {
    return <OnlineGamePage />;
  }

  return <HomePage />;
}
