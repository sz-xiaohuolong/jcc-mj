import { ArrowLeft, Check, Copy, Crown, Play, UserX } from "lucide-react";
import { useOnlineStore } from "../store/onlineStore";

export function RoomLobbyPage() {
  const room = useOnlineStore((state) => state.roomState);
  const playerId = useOnlineStore((state) => state.playerId);
  const lastError = useOnlineStore((state) => state.lastError);
  const setReady = useOnlineStore((state) => state.setReady);
  const kickPlayer = useOnlineStore((state) => state.kickPlayer);
  const startGame = useOnlineStore((state) => state.startGame);
  const leaveRoom = useOnlineStore((state) => state.leaveRoom);

  if (!room) {
    return (
      <main className="rules-screen">
        <button className="ghost-button" type="button" onClick={leaveRoom}>
          <ArrowLeft size={17} />
          返回
        </button>
        <p className="mt-6 text-slate-300">尚未进入房间。</p>
      </main>
    );
  }

  const me = room.players.find((player) => player.id === playerId);
  const isOwner = room.ownerId === playerId;

  return (
    <main className="rules-screen">
      <button className="ghost-button" type="button" onClick={leaveRoom}>
        <ArrowLeft size={17} />
        离开房间
      </button>
      <section className="lobby-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">ROOM</p>
            <h1>{room.id}</h1>
          </div>
          <button className="control-button" type="button" onClick={() => navigator.clipboard?.writeText(room.id)}>
            <Copy size={16} />
            复制房间号
          </button>
        </div>
        <div className="lobby-list">
          {room.players.map((player) => (
            <article key={player.id} className="lobby-player">
              <div className="flex items-center gap-2">
                {player.isOwner && <Crown size={16} className="text-brass" />}
                <strong>{player.nickname}</strong>
              </div>
              <span>{player.isAI ? "AI 补位" : player.connected ? "在线" : "离线"}</span>
              <div className="flex items-center justify-end gap-2">
                <span>{player.isOwner ? "房主" : player.ready ? "已准备" : "未准备"}</span>
                {isOwner && player.id !== playerId && !player.isAI && (
                  <button className="danger-button" type="button" onClick={() => kickPlayer(player.id)} title={`踢出 ${player.nickname}`}>
                    <UserX size={15} />
                    踢出
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-400">当前 {room.players.length}/4 人。不足 4 人时，开始游戏会由服务端自动补 AI。</p>
        {lastError && <p className="mt-4 text-sm text-rose-300">{lastError}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          {!isOwner && (
            <button className="primary-button" type="button" onClick={() => setReady(!me?.ready)}>
              <Check size={17} />
              {me?.ready ? "取消准备" : "准备"}
            </button>
          )}
          {isOwner && (
            <button className="primary-button" type="button" onClick={startGame}>
              <Play size={17} />
              开始游戏
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
