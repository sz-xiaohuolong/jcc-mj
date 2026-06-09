import { augmentDefinitions } from "../../../src/data/augments";
import { tileDefinitions } from "../../../src/data/tiles";
import { applyImmediateAugmentEffect } from "../../../src/engine/augmentEffects";
import { chooseAugmentForAI, createAugmentChoices, getLevelUpCostModifier, getRefreshCostModifier, getRefreshCostRefund, getSuitFocusShopBias } from "../../../src/engine/augmentEngine";
import { runAITurn } from "../../../src/engine/aiEngine";
import { createInitialGame, createLog, definitionsForInstances, endRound, getLevelUpCost, rebuildPool } from "../../../src/engine/gameEngine";
import { refreshShop } from "../../../src/engine/shopEngine";
import { calculateActiveTraits, getRefreshDiscount } from "../../../src/engine/traitEngine";
import type { AugmentDefinition, GamePhase, GameState, PlayerState, RandomSource, TileInstance, TileWithDefinition } from "../../../src/types";
import { createSeededRandom } from "../../../src/utils/random";
import { sortTiles } from "../../../src/utils/tileSort";
import type { AckResponse, ActionResult, ClientGameView, PrivatePlayerView, PublicGameView } from "../../../shared/types/network";
import type { Room, RoomPlayer } from "./RoomManager";
import { fail, ok } from "../utils/result";

export interface GameSession {
  roomId: string;
  game: GameState;
  playerShops: Record<string, TileInstance[]>;
  playerAugmentChoices: Record<string, AugmentDefinition[]>;
  endedTurnPlayerIds: string[];
  ranking: string[];
  deadlineAt: number;
  rngSeed: number;
}

type ActionGuard =
  | { valid: true; session: GameSession; player: PlayerState }
  | { valid: false; response: AckResponse<never> };

function rng(seed: number): RandomSource {
  return createSeededRandom(seed);
}

function toTileInstances(tiles: TileWithDefinition[]): TileInstance[] {
  return tiles.map(({ instanceId, tileId }) => ({ instanceId, tileId }));
}

function createAIPlayer(index: number): RoomPlayer {
  return {
    id: `ai-${index}`,
    nickname: `AI ${index}`,
    isOwner: false,
    isAI: true,
    ready: true,
    connected: true,
    sessionToken: `ai-session-${index}`
  };
}

export class GameSessionManager {
  private sessions = new Map<string, GameSession>();

  startGame(room: Room, seed = Date.now()): GameSession {
    const participants = [...room.players];

    while (participants.length < 4) {
      participants.push(createAIPlayer(participants.length));
    }

    room.players = participants;
    room.status = "playing";

    const initial = createInitialGame({ rng: rng(seed) });
    let pool = rebuildPool([...initial.tilePool, ...initial.shop]);
    const players = initial.players.map((player, index): PlayerState => {
      const participant = participants[index];

      return {
        ...player,
        id: participant.id,
        name: participant.nickname,
        isAI: participant.isAI
      };
    });
    const playerShops: Record<string, TileInstance[]> = {};

    for (const player of players) {
    const result = refreshShop({
      pool,
      level: player.level,
      rng: rng(seed + player.id.length + Object.keys(playerShops).length),
      highCostBias: initial.city?.modifiers.highCostShopBias ?? 0,
      tripletBias: initial.city?.modifiers.tripletShopBias ?? 0,
      suitBias: getSuitFocusShopBias(player)
    });
      pool = result.pool;
      playerShops[player.id] = toTileInstances(result.shop);
    }

    const game: GameState = {
      ...initial,
      players,
      currentPlayerId: players[0].id,
      shop: [],
      tilePool: toTileInstances(pool)
    };
    const playerAugmentChoices = Object.fromEntries(
      players.map((player, index) => [
        player.id,
        createAugmentChoices(
          rng(seed + 900 + index),
          3,
          player.augments.map((augment) => augment.id)
        )
      ])
    );
    const session: GameSession = {
      roomId: room.id,
      game,
      playerShops,
      playerAugmentChoices,
      endedTurnPlayerIds: [],
      ranking: [],
      deadlineAt: Date.now() + 60_000,
      rngSeed: seed
    };

    this.sessions.set(room.id, session);
    return session;
  }

  getSession(roomId: string): GameSession | undefined {
    return this.sessions.get(roomId);
  }

  deleteSession(roomId: string): void {
    this.sessions.delete(roomId);
  }

  isGameOver(roomId: string): boolean {
    return this.sessions.get(roomId)?.game.phase === "game_over";
  }

  buildClientGameView(roomId: string, playerId: string): ClientGameView | undefined {
    const session = this.sessions.get(roomId);
    const player = session?.game.players.find((item) => item.id === playerId);

    if (!session || !player) return undefined;

    return {
      public: this.buildPublicGameView(session),
      privatePlayer: this.buildPrivatePlayerView(session, player.id)
    };
  }

  buildPublicGameView(session: GameSession): PublicGameView {
    return {
      roomId: session.roomId,
      phase: session.game.phase,
      round: session.game.round,
      stage: session.game.stage,
      city: session.game.city,
      players: session.game.players.map((player) => ({
        id: player.id,
        name: player.name,
        isAI: player.isAI,
        hp: player.hp,
        gold: player.gold,
        level: player.level,
        isAlive: player.isAlive,
        isWinning: player.isWinning,
        lockedShop: player.lockedShop,
        endedTurn: session.endedTurnPlayerIds.includes(player.id),
        connected: true,
        activeTraits: player.activeTraits,
        augments: player.augments.map(({ id, name, rarity, description }) => ({ id, name, rarity, description })),
        discardTiles: player.discardTiles,
        handTileCount: player.handTiles.length,
        benchTileCount: 0
      })),
      logs: session.game.logs,
      lastSettlement: session.game.lastSettlement,
      winnerId: session.game.winnerId,
      ranking: session.ranking,
      deadlineAt: session.deadlineAt
    };
  }

  buildPrivatePlayerView(session: GameSession, playerId: string): PrivatePlayerView {
    const player = session.game.players.find((item) => item.id === playerId);

    if (!player) {
      throw new Error(`Missing player ${playerId}`);
    }

    return {
      playerId,
      handTiles: player.handTiles,
      benchTiles: [],
      shop: session.playerShops[playerId] ?? [],
      augmentChoices: session.playerAugmentChoices[playerId] ?? [],
      gold: player.gold,
      level: player.level,
      hp: player.hp,
      lockedShop: player.lockedShop,
      endedTurn: session.endedTurnPlayerIds.includes(playerId)
    };
  }

  buyTile(roomId: string, playerId: string, instanceId: string): AckResponse<ActionResult> {
    const guard = this.canAct(roomId, playerId);
    if (!guard.valid) return guard.response;
    const session = guard.session;
    const player = guard.player;
    const shop = session.playerShops[playerId] ?? [];
    const shopTile = shop.find((tile) => tile.instanceId === instanceId);
    const definition = tileDefinitions.find((tile) => tile.id === shopTile?.tileId);

    if (!shopTile || !definition) return fail("TILE_NOT_FOUND", "商店中没有这张牌");
    if (player.gold < definition.cost) return fail("NOT_ENOUGH_GOLD", "金币不足");
    if (player.handTiles.length >= 14) return fail("INVALID_ACTION", "手牌已满，请先弃 1 张牌再购买");

    const players = session.game.players.map((item) => {
      if (item.id !== playerId) return item;
      const next = { ...item, gold: item.gold - definition.cost, handTiles: [...item.handTiles, shopTile] };
      return { ...next, activeTraits: definitionsForInstances(next.handTiles).length > 0 ? this.recalculateTraits(next) : next.activeTraits };
    });

    session.game = {
      ...session.game,
      players,
      logs: [...session.game.logs, createLog(session.game.round, `${player.name} 买入 ${definition.name}`, "good")]
    };
    session.playerShops[playerId] = shop.filter((tile) => tile.instanceId !== instanceId);
    return ok({ game: this.buildClientGameView(roomId, playerId) });
  }

  sellTile(roomId: string, playerId: string, instanceId: string): AckResponse<ActionResult> {
    const guard = this.canAct(roomId, playerId);
    if (!guard.valid) return guard.response;

    const player = guard.player;
    const sold = player.handTiles.find((tile) => tile.instanceId === instanceId);
    const definition = tileDefinitions.find((tile) => tile.id === sold?.tileId);
    if (!sold || !definition) return fail("TILE_NOT_FOUND", "没有这张牌");

    guard.session.game = {
      ...guard.session.game,
      players: guard.session.game.players.map((item) => {
        if (item.id !== playerId) return item;
        const handTiles = item.handTiles.filter((tile) => tile.instanceId !== instanceId);
        const next = {
          ...item,
          gold: item.gold + Math.max(1, definition.cost - 1),
          handTiles,
          discardTiles: [...item.discardTiles, sold]
        };
        return { ...next, activeTraits: this.recalculateTraits(next) };
      }),
      tilePool: [...guard.session.game.tilePool, sold]
    };
    return ok({ game: this.buildClientGameView(roomId, playerId) });
  }

  refreshShop(roomId: string, playerId: string): AckResponse<ActionResult> {
    const guard = this.canAct(roomId, playerId);
    if (!guard.valid) return guard.response;
    const { session, player } = guard;
    if (player.lockedShop) return fail("INVALID_ACTION", "商店已锁定");

    const discount = getRefreshDiscount(player.activeTraits, !player.hasRefreshedThisRound) + Math.abs(getRefreshCostModifier(player));
    const cost = Math.max(0, 2 - discount);
    if (player.gold < cost) return fail("NOT_ENOUGH_GOLD", "金币不足");

    const currentShop = session.playerShops[playerId] ?? [];
    const pool = rebuildPool([...session.game.tilePool, ...currentShop]);
    const refreshRng = rng(session.rngSeed + session.game.round + playerId.length + Date.now());
    const finalCost = cost - getRefreshCostRefund(player, cost, refreshRng);
    const result = refreshShop({
      pool,
      level: player.level,
      rng: refreshRng,
      highCostBias: session.game.city?.modifiers.highCostShopBias ?? 0,
      tripletBias: session.game.city?.modifiers.tripletShopBias ?? 0,
      suitBias: getSuitFocusShopBias(player)
    });

    session.playerShops[playerId] = toTileInstances(result.shop);
    session.game = {
      ...session.game,
      tilePool: toTileInstances(result.pool),
      players: session.game.players.map((item) => (item.id === playerId ? { ...item, gold: item.gold - finalCost, hasRefreshedThisRound: true } : item)),
      logs: [...session.game.logs, createLog(session.game.round, `${player.name} 刷新商店，花费 ${finalCost} 金币。`)]
    };

    return ok({ game: this.buildClientGameView(roomId, playerId) });
  }

  levelUp(roomId: string, playerId: string): AckResponse<ActionResult> {
    const guard = this.canAct(roomId, playerId);
    if (!guard.valid) return guard.response;
    const { session, player } = guard;

    if (player.level >= 6) {
      return fail("INVALID_ACTION", "已经达到最高等级");
    }

    const cost = getLevelUpCost(player.level) + getLevelUpCostModifier(player);
    if (player.gold < cost) {
      return fail("NOT_ENOUGH_GOLD", "金币不足");
    }

    session.game = {
      ...session.game,
      players: session.game.players.map((item) =>
        item.id === playerId ? { ...item, gold: item.gold - cost, level: item.level + 1, xp: 0 } : item
      ),
      logs: [...session.game.logs, createLog(session.game.round, `${player.name} 升级到 ${player.level + 1}。`, "good")]
    };

    return ok({ game: this.buildClientGameView(roomId, playerId) });
  }

  organizeHand(roomId: string, playerId: string): AckResponse<ActionResult> {
    const guard = this.canAct(roomId, playerId);
    if (!guard.valid) return guard.response;
    const { session } = guard;

    session.game = {
      ...session.game,
      players: session.game.players.map((player) => {
        if (player.id !== playerId) return player;

        const orderedDefinitions = sortTiles(definitionsForInstances(player.handTiles));
        const sortedIds = orderedDefinitions.map((tile) => tile.id);
        const handTiles = [...player.handTiles].sort(
          (left, right) => sortedIds.indexOf(left.tileId) - sortedIds.indexOf(right.tileId) || left.instanceId.localeCompare(right.instanceId)
        );

        return { ...player, handTiles };
      })
    };

    return ok({ game: this.buildClientGameView(roomId, playerId) });
  }

  lockShop(roomId: string, playerId: string): AckResponse<ActionResult> {
    const guard = this.canAct(roomId, playerId);
    if (!guard.valid) return guard.response;
    guard.session.game = {
      ...guard.session.game,
      players: guard.session.game.players.map((player) => (player.id === playerId ? { ...player, lockedShop: !player.lockedShop } : player))
    };
    return ok({ game: this.buildClientGameView(roomId, playerId) });
  }

  discardTile(roomId: string, playerId: string, instanceId: string): AckResponse<ActionResult> {
    const guard = this.canAct(roomId, playerId);
    if (!guard.valid) return guard.response;
    if (guard.player.hasDiscardedThisRound) return fail("INVALID_ACTION", "每回合只能弃 1 张牌");
    const tile = guard.player.handTiles.find((item) => item.instanceId === instanceId);
    if (!tile) return fail("TILE_NOT_FOUND", "手牌中没有这张牌");

    guard.session.game = {
      ...guard.session.game,
      players: guard.session.game.players.map((player) => {
        if (player.id !== playerId) return player;
        const handTiles = player.handTiles.filter((item) => item.instanceId !== instanceId);
        const next = { ...player, handTiles, discardTiles: [...player.discardTiles, tile], hasDiscardedThisRound: true };
        return { ...next, activeTraits: this.recalculateTraits(next) };
      }),
      tilePool: [...guard.session.game.tilePool, tile]
    };
    return ok({ game: this.buildClientGameView(roomId, playerId) });
  }

  chooseAugment(roomId: string, playerId: string, augmentId: string): AckResponse<ActionResult> {
    const session = this.sessions.get(roomId);
    const player = session?.game.players.find((item) => item.id === playerId);
    if (!session) return fail("ROOM_NOT_FOUND", "房间不存在");
    if (!player) return fail("PLAYER_NOT_FOUND", "玩家不存在");
    if (session.game.phase !== "augment_select") return fail("INVALID_PHASE", "当前不能选择海克斯");
    const choice = (session.playerAugmentChoices[playerId] ?? []).find((augment) => augment.id === augmentId);
    if (!choice) return fail("INVALID_ACTION", "海克斯选项无效");

    session.game = applyImmediateAugmentEffect(
      {
        ...session.game,
        players: session.game.players.map((item) => (item.id === playerId ? { ...item, augments: [...item.augments, choice] } : item)),
        logs: [...session.game.logs, createLog(session.game.round, `${player.name} 选择海克斯：${choice.name}`, "good")]
      },
      playerId,
      choice,
      rng(session.rngSeed + session.game.round + playerId.length + 2000)
    );
    session.playerAugmentChoices[playerId] = [];

    if (session.game.players.filter((item) => !item.isAI).every((item) => (session.playerAugmentChoices[item.id] ?? []).length === 0)) {
      session.game = { ...session.game, phase: "shop" };
    }

    return ok({ game: this.buildClientGameView(roomId, playerId) });
  }

  endTurn(roomId: string, playerId: string): AckResponse<ActionResult> {
    const guard = this.canAct(roomId, playerId);
    if (!guard.valid) return guard.response;
    const { session } = guard;

    if (session.endedTurnPlayerIds.includes(playerId)) {
      return fail("ALREADY_ENDED_TURN", "已经结束本回合");
    }

    session.endedTurnPlayerIds.push(playerId);

    const humans = session.game.players.filter((player) => !player.isAI && player.isAlive);
    if (humans.every((player) => session.endedTurnPlayerIds.includes(player.id))) {
      this.settleRound(session);
    }

    return ok({ game: this.buildClientGameView(roomId, playerId) });
  }

  expireTurn(roomId: string): AckResponse<void> {
    const session = this.sessions.get(roomId);
    if (!session) return fail("ROOM_NOT_FOUND", "房间不存在");
    if (session.game.phase !== "shop") return fail("INVALID_PHASE", "当前阶段不能超时结算");

    session.endedTurnPlayerIds = session.game.players.filter((player) => !player.isAI && player.isAlive).map((player) => player.id);
    this.settleRound(session);
    return ok(undefined);
  }

  forcePhaseForTest(roomId: string, phase: GamePhase): void {
    const session = this.sessions.get(roomId);
    if (!session) return;
    session.game = { ...session.game, phase };
    if (phase === "augment_select") {
      session.playerAugmentChoices = Object.fromEntries(
        session.game.players.map((player, index) => [
          player.id,
          createAugmentChoices(
            rng(session.rngSeed + 700 + index),
            3,
            player.augments.map((augment) => augment.id)
          )
        ])
      );
    }
  }

  setPlayerGoldForTest(roomId: string, playerId: string, gold: number): void {
    const session = this.sessions.get(roomId);
    if (!session) return;
    session.game = {
      ...session.game,
      players: session.game.players.map((player) => (player.id === playerId ? { ...player, gold } : player))
    };
  }

  setPlayerHandForTest(roomId: string, playerId: string, handTiles: TileInstance[]): void {
    const session = this.sessions.get(roomId);
    if (!session) return;
    session.game = {
      ...session.game,
      players: session.game.players.map((player) => (player.id === playerId ? { ...player, handTiles } : player))
    };
  }

  private canAct(roomId: string, playerId: string): ActionGuard {
    const session = this.sessions.get(roomId);
    const player = session?.game.players.find((item) => item.id === playerId);
    if (!session) return { valid: false, response: fail("ROOM_NOT_FOUND", "房间不存在") };
    if (!player) return { valid: false, response: fail("PLAYER_NOT_FOUND", "玩家不存在") };
    if (!player.isAlive) return { valid: false, response: fail("INVALID_ACTION", "玩家已淘汰") };
    if (session.game.phase !== "shop") return { valid: false, response: fail("INVALID_PHASE", "当前阶段不能操作") };
    return { valid: true, session, player };
  }

  private recalculateTraits(player: PlayerState): PlayerState["activeTraits"] {
    return calculateActiveTraits(definitionsForInstances(player.handTiles));
  }

  private settleRound(session: GameSession): void {
    let game = session.game;
    for (const ai of game.players.filter((player) => player.isAI && player.isAlive)) {
      game = runAITurn({ game: { ...game, currentPlayerId: ai.id, shop: session.playerShops[ai.id] ?? [] }, playerId: ai.id, definitions: tileDefinitions, rng: rng(session.rngSeed + game.round + ai.id.length) });
      session.playerShops[ai.id] = game.shop;
      game = { ...game, shop: [] };
    }
    const settled = endRound({ ...game, shop: [] }, rng(session.rngSeed + game.round + 400));
    const shopsToReturn = Object.entries(session.playerShops).flatMap(([playerId, shop]) => {
      const player = settled.players.find((item) => item.id === playerId);
      return player?.lockedShop && player.isAlive ? [] : shop;
    });
    let pool = rebuildPool([...settled.tilePool, ...settled.shop, ...shopsToReturn]);
    const playerShops: Record<string, TileInstance[]> = {};
    for (const player of settled.players) {
      if (player.lockedShop && session.playerShops[player.id]) {
        playerShops[player.id] = session.playerShops[player.id];
        continue;
      }
      const result = refreshShop({ pool, level: player.level, rng: rng(session.rngSeed + settled.round + player.id.length), suitBias: getSuitFocusShopBias(player) });
      pool = result.pool;
      playerShops[player.id] = toTileInstances(result.shop);
    }
    session.game = { ...settled, shop: [], tilePool: toTileInstances(pool) };
    session.playerShops = playerShops;
    session.endedTurnPlayerIds = [];
    session.deadlineAt = Date.now() + 60_000;
    if (session.game.phase === "augment_select") {
      session.playerAugmentChoices = Object.fromEntries(
        session.game.players.map((player, index) => [
          player.id,
          createAugmentChoices(
            rng(session.rngSeed + settled.round + index),
            3,
            player.augments.map((augment) => augment.id)
          )
        ])
      );
      for (const ai of session.game.players.filter((player) => player.isAI)) {
        const choice = chooseAugmentForAI(ai, session.playerAugmentChoices[ai.id] ?? augmentDefinitions.slice(0, 3));
        session.game = {
          ...session.game,
          players: session.game.players.map((player) => (player.id === ai.id ? { ...player, augments: [...player.augments, choice] } : player))
        };
        session.game = applyImmediateAugmentEffect(session.game, ai.id, choice, rng(session.rngSeed + settled.round + ai.id.length + 2300));
        session.playerAugmentChoices[ai.id] = [];
      }
    }
    session.ranking = [...session.game.players].sort((left, right) => Number(right.isAlive) - Number(left.isAlive) || right.hp - left.hp).map((player) => player.id);
  }
}
