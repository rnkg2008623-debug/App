'use strict';

const {
  TITLES,
  ITEMS,
  MONSTER_SPECIES,
  weightedPick,
  rollIvs,
  getItemById,
  getSpeciesById,
} = require('./game-data');

const BASE_TICK_MS = 3 * 60 * 1000; // 3分
const BASE_DROP_CHANCE = 0.6; // ティックごとに何かが出る基礎確率
const BATTLE_TURN_MS = 5000; // 5秒/ターン
const MAX_TURNS_PER_CATCHUP = 20000;
const MAX_TICKS_PER_CATCHUP = 20000;
const MAX_LOG = 30;

function nowActiveBoost(session, atMs) {
  if (!session || !session.boost) return null;
  if (session.boost.expiresAt && session.boost.expiresAt > atMs) return session.boost;
  return null;
}

function currentIntervalMs(session, atMs) {
  const boost = nowActiveBoost(session, atMs);
  if (boost && (boost.type === 'boostFrequency' || boost.type === 'boostBoth')) {
    return boost.intervalMinutes * 60 * 1000;
  }
  return BASE_TICK_MS;
}

function currentRateMultiplier(session, atMs) {
  const boost = nowActiveBoost(session, atMs);
  if (boost && (boost.type === 'boostRate' || boost.type === 'boostBoth')) {
    return boost.multiplier;
  }
  return 1;
}

function pushLog(arr, message) {
  arr.push(message);
  while (arr.length > MAX_LOG) arr.shift();
}

// ------------------------- 作業セッション / 報酬ティック -------------------------

function rollOneReward(state, rateMultiplier) {
  const dropChance = Math.min(1, BASE_DROP_CHANCE * rateMultiplier);
  if (Math.random() > dropChance) return null;

  const ownedTitleIds = new Set(state.collection.titles.map((t) => t.id));
  const availableTitles = TITLES.filter((t) => !ownedTitleIds.has(t.id));

  const categories = [];
  if (availableTitles.length > 0) categories.push({ key: 'title', weight: 20 });
  categories.push({ key: 'item', weight: 50 });
  categories.push({ key: 'monster', weight: 30 });

  const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
  let roll = Math.random() * totalWeight;
  let chosen = categories[categories.length - 1].key;
  for (const c of categories) {
    roll -= c.weight;
    if (roll <= 0) {
      chosen = c.key;
      break;
    }
  }

  if (chosen === 'title') {
    // レア度が低い(rate値が小さい)ほど出にくいよう、rateを重みとして抽選
    const pool = availableTitles.map((t) => ({ ...t, weight: t.rate }));
    const picked = weightedPick(pool);
    state.collection.titles.push({ id: picked.id, acquiredAt: Date.now() });
    return { type: 'title', name: picked.name };
  }

  if (chosen === 'item') {
    const picked = weightedPick(ITEMS);
    state.collection.items[picked.id] = (state.collection.items[picked.id] || 0) + 1;
    return { type: 'item', name: picked.name };
  }

  const species = weightedPick(MONSTER_SPECIES);
  const uid = `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  state.collection.monsters.push({
    uid,
    speciesId: species.id,
    ivs: rollIvs(),
    level: 1,
    exp: 0,
    acquiredAt: Date.now(),
  });
  return { type: 'monster', name: species.name };
}

function finalizeSession(state, nowMs) {
  const session = state.session;
  if (!session) return;
  const plannedSeconds = session.plannedMinutes * 60;
  state.stats.completedSessions += 1;
  state.stats.totalWorkSeconds += plannedSeconds;
  pushLog(session.rewardLog, `作業完了！（${session.plannedMinutes}分）`);
  state.session = null;
}

function processElapsedSession(state, nowMs) {
  const session = state.session;
  if (!session) return;

  const endAt = session.startedAt + session.plannedMinutes * 60 * 1000;
  let ticks = 0;
  while (ticks < MAX_TICKS_PER_CATCHUP) {
    const interval = currentIntervalMs(session, nowMs);
    const nextTickAt = session.lastTickAt + interval;
    if (nextTickAt > nowMs || nextTickAt > endAt) break;
    const rate = currentRateMultiplier(session, nextTickAt);
    const reward = rollOneReward(state, rate);
    if (reward) {
      pushLog(session.rewardLog, `${reward.type === 'title' ? '称号' : reward.type === 'item' ? 'アイテム' : 'モンスター'}獲得：${reward.name}`);
    }
    session.lastTickAt = nextTickAt;
    ticks += 1;
  }

  if (nowMs >= endAt) {
    finalizeSession(state, nowMs);
  }
}

function startSession(state, plannedMinutes) {
  if (state.session) return { ok: false, error: 'すでに作業中です' };
  const now = Date.now();
  state.session = {
    startedAt: now,
    plannedMinutes,
    lastTickAt: now,
    boost: null,
    rewardLog: [],
  };
  return { ok: true };
}

function cancelSession(state) {
  state.session = null;
}

function useBoostItem(state, itemId) {
  const owned = state.collection.items[itemId] || 0;
  if (owned <= 0) return { ok: false, error: 'アイテムを所持していません' };
  const def = getItemById(itemId);
  if (!def || !def.effect) return { ok: false, error: 'このアイテムはブースト効果を持ちません' };
  if (!state.session) return { ok: false, error: '作業中のみ使用できます' };

  state.collection.items[itemId] = owned - 1;
  const now = Date.now();
  state.session.boost = {
    type: def.effect.type,
    multiplier: def.effect.multiplier || 1,
    intervalMinutes: def.effect.intervalMinutes || 3,
    expiresAt: now + def.effect.durationMinutes * 60 * 1000,
  };
  return { ok: true };
}

// ------------------------- モンスターのステータス計算 -------------------------

function computeMonsterStats(instance) {
  const species = getSpeciesById(instance.speciesId);
  if (!species) return { hp: 1, atk: 1, def: 1, spd: 1 };
  const lv = instance.level;
  const iv = instance.ivs;
  return {
    hp: Math.round(species.baseHp * (1 + lv * 0.08) + iv.hp * 2),
    atk: Math.round(species.baseAtk * (1 + lv * 0.06) + iv.atk * 0.6),
    def: Math.round(species.baseDef * (1 + lv * 0.06) + iv.def * 0.6),
    spd: Math.round(species.baseSpd * (1 + lv * 0.04) + iv.spd * 0.3),
  };
}

function expToNextLevel(level) {
  return level * 100;
}

function addExp(instance, amount) {
  instance.exp += amount;
  let next = expToNextLevel(instance.level);
  while (instance.exp >= next && instance.level < 200) {
    instance.exp -= next;
    instance.level += 1;
    next = expToNextLevel(instance.level);
  }
}

// ------------------------- 編成 -------------------------

function setParty(state, uids) {
  if (!Array.isArray(uids) || uids.length > 3) {
    return { ok: false, error: '3体まで選択できます' };
  }
  const owned = new Set(state.collection.monsters.map((m) => m.uid));
  for (const uid of uids) {
    if (!owned.has(uid)) return { ok: false, error: '所持していないモンスターです' };
  }
  state.party = uids;
  state.dungeon.partyState = null; // 編成が変わったら次ターンで再初期化
  return { ok: true };
}

// ------------------------- 強化 -------------------------

function fuseMonster(state, targetUid, materialUid) {
  const target = state.collection.monsters.find((m) => m.uid === targetUid);
  const material = state.collection.monsters.find((m) => m.uid === materialUid);
  if (!target || !material) return { ok: false, error: 'モンスターが見つかりません' };
  if (target.uid === material.uid) return { ok: false, error: '同じモンスターは使用できません' };
  if (target.speciesId !== material.speciesId) {
    return { ok: false, error: '同じ種族のモンスターのみ合成できます' };
  }
  if (state.party.includes(material.uid)) {
    return { ok: false, error: '編成中のモンスターは素材にできません' };
  }
  const gained = 50 * material.level;
  addExp(target, gained);
  state.collection.monsters = state.collection.monsters.filter((m) => m.uid !== material.uid);
  return { ok: true, gained };
}

function useEnhanceItem(state, targetUid, itemId) {
  const target = state.collection.monsters.find((m) => m.uid === targetUid);
  if (!target) return { ok: false, error: 'モンスターが見つかりません' };
  const owned = state.collection.items[itemId] || 0;
  if (owned <= 0) return { ok: false, error: 'アイテムを所持していません' };
  const def = getItemById(itemId);
  if (!def || !def.enhanceValue) return { ok: false, error: 'このアイテムは強化に使用できません' };
  state.collection.items[itemId] = owned - 1;
  addExp(target, def.enhanceValue);
  return { ok: true, gained: def.enhanceValue };
}

// ------------------------- バトル -------------------------

function enemyForFloor(floor) {
  const depthIndex = 1 - floor; // floor=1 -> 0, floor=-1000 -> 1001
  const names = ['野良スライム', 'はぐれ狼', '洞窟コウモリ', '石の番人', '影の落とし子', '深淵の使者'];
  const name = names[depthIndex % names.length];
  return {
    name: `${name} (F${floor})`,
    hp: Math.round(20 + depthIndex * 3.5),
    maxHp: Math.round(20 + depthIndex * 3.5),
    atk: Math.round(4 + depthIndex * 0.9),
    def: Math.round(1 + depthIndex * 0.4),
  };
}

function ensureDungeonInit(state) {
  const dungeon = state.dungeon;
  if (!dungeon.enemy) {
    dungeon.enemy = enemyForFloor(dungeon.floor);
  }
  if (!dungeon.partyState && state.party.length > 0) {
    dungeon.partyState = state.party.map((uid) => {
      const inst = state.collection.monsters.find((m) => m.uid === uid);
      const stats = inst ? computeMonsterStats(inst) : { hp: 1 };
      return { uid, hp: stats.hp };
    });
    dungeon.activeIndex = 0;
  }
}

function firstAliveIndex(partyState) {
  return partyState.findIndex((p) => p.hp > 0);
}

function processBattleTurn(state) {
  const dungeon = state.dungeon;
  if (state.party.length === 0) return;
  ensureDungeonInit(state);
  if (!dungeon.partyState || !dungeon.enemy) return;

  let activeIdx = firstAliveIndex(dungeon.partyState);
  if (activeIdx === -1) {
    // 全滅：同じ階でフルHPから再挑戦（階はリセットされない）
    dungeon.partyState = state.party.map((uid) => {
      const inst = state.collection.monsters.find((m) => m.uid === uid);
      const stats = inst ? computeMonsterStats(inst) : { hp: 1 };
      return { uid, hp: stats.hp };
    });
    dungeon.enemy = enemyForFloor(dungeon.floor);
    pushLog(dungeon.log, `全滅…F${dungeon.floor}に再挑戦します`);
    return;
  }
  dungeon.activeIndex = activeIdx;

  const activeEntry = dungeon.partyState[activeIdx];
  const inst = state.collection.monsters.find((m) => m.uid === activeEntry.uid);
  if (!inst) return;
  const stats = computeMonsterStats(inst);
  const enemy = dungeon.enemy;

  const playerFirst = stats.spd >= (enemy.spd || 0);

  const attack = (attackerAtk, defenderDef) => {
    const raw = attackerAtk - defenderDef * 0.5;
    const variance = 0.85 + Math.random() * 0.3;
    return Math.max(1, Math.round(raw * variance));
  };

  const doPlayerAttack = () => {
    const dmg = attack(stats.atk, enemy.def);
    enemy.hp = Math.max(0, enemy.hp - dmg);
    const species = getSpeciesById(inst.speciesId);
    pushLog(dungeon.log, `${species ? species.name : 'モンスター'}の攻撃！ ${enemy.name} に ${dmg} ダメージ`);
  };
  const doEnemyAttack = () => {
    const dmg = attack(enemy.atk, stats.def);
    activeEntry.hp = Math.max(0, activeEntry.hp - dmg);
    pushLog(dungeon.log, `${enemy.name} の攻撃！ 見方に ${dmg} ダメージ`);
  };

  if (playerFirst) {
    doPlayerAttack();
    if (enemy.hp > 0) doEnemyAttack();
  } else {
    doEnemyAttack();
    if (activeEntry.hp > 0) doPlayerAttack();
  }

  if (enemy.hp <= 0) {
    pushLog(dungeon.log, `${enemy.name} を撃破！ 次の階へ`);
    dungeon.floor -= 1;
    dungeon.maxDepthReached = Math.min(dungeon.maxDepthReached, dungeon.floor);
    if (dungeon.floor < -1000) dungeon.floor = -1000;
    dungeon.enemy = enemyForFloor(dungeon.floor);
  }
}

function processElapsedBattle(state, nowMs) {
  const dungeon = state.dungeon;
  if (state.party.length === 0) {
    dungeon.lastTurnAt = nowMs;
    return;
  }
  if (!dungeon.lastTurnAt) dungeon.lastTurnAt = nowMs;
  let turns = 0;
  while (dungeon.lastTurnAt + BATTLE_TURN_MS <= nowMs && turns < MAX_TURNS_PER_CATCHUP) {
    processBattleTurn(state);
    dungeon.lastTurnAt += BATTLE_TURN_MS;
    turns += 1;
  }
  if (turns >= MAX_TURNS_PER_CATCHUP) {
    dungeon.lastTurnAt = nowMs; // 巨大な空白はここで打ち切って追従
  }
}

// ------------------------- 統計換算 -------------------------

function convertSeconds(totalSeconds) {
  return {
    seconds: totalSeconds,
    minutes: totalSeconds / 60,
    hours: totalSeconds / 3600,
    days: totalSeconds / 86400,
    months: totalSeconds / (86400 * 30),
    years: totalSeconds / (86400 * 365),
  };
}

function tick(state, nowMs) {
  processElapsedSession(state, nowMs);
  processElapsedBattle(state, nowMs);
}

module.exports = {
  tick,
  startSession,
  cancelSession,
  useBoostItem,
  setParty,
  fuseMonster,
  useEnhanceItem,
  computeMonsterStats,
  convertSeconds,
  BATTLE_TURN_MS,
  BASE_TICK_MS,
};
