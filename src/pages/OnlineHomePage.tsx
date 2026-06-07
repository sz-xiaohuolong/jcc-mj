import { ArrowLeft, DoorOpen, RadioTower } from "lucide-react";
import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { useOnlineStore } from "../store/onlineStore";

export function OnlineHomePage() {
  const goHome = useGameStore((state) => state.goHome);
  const nickname = useOnlineStore((state) => state.nickname);
  const setNickname = useOnlineStore((state) => state.setNickname);
  const createRoom = useOnlineStore((state) => state.createRoom);
  const joinRoom = useOnlineStore((state) => state.joinRoom);
  const connected = useOnlineStore((state) => state.connected);
  const connecting = useOnlineStore((state) => state.connecting);
  const lastError = useOnlineStore((state) => state.lastError);
  const [roomCode, setRoomCode] = useState("");

  return (
    <main className="rules-screen online-entry">
      <button className="ghost-button" type="button" onClick={goHome}>
        <ArrowLeft size={17} />
        返回首页
      </button>
      <section className="online-card">
        <p className="eyebrow">ONLINE MODE</p>
        <h1>联机对战大厅</h1>
        <p className="home-copy">创建房间，邀请 2-4 名真人玩家；不足 4 人时服务端自动补 AI。</p>
        <label className="field-label">
          昵称
          <input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="输入昵称" />
        </label>
        <div className="online-actions">
          <button className="primary-button" type="button" onClick={createRoom}>
            <RadioTower size={17} />
            创建房间
          </button>
          <label className="join-box">
            房间号
            <input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} />
          </label>
          <button className="ghost-button" type="button" onClick={() => joinRoom(roomCode)} disabled={roomCode.length < 6}>
            <DoorOpen size={17} />
            加入房间
          </button>
        </div>
        <p className="mt-4 text-sm text-slate-400">
          连接状态：{connected ? "已连接" : connecting ? "连接中" : "待连接"}
          {lastError ? ` · ${lastError}` : ""}
        </p>
      </section>
    </main>
  );
}
