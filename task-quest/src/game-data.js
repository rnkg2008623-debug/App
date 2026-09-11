'use strict';

// 称号：一度手に入れたら二度と出現しない。rate は 3分ティックごとの独立抽選確率。
const TITLES = [
  { id: 'title_beginner', name: '初心者', rate: 0.10 },
  { id: 'title_apprentice', name: '見習い冒険者', rate: 0.07 },
  { id: 'title_diligent', name: '勤勉なる者', rate: 0.05 },
  { id: 'title_explorer', name: '熟練の探検者', rate: 0.03 },
  { id: 'title_focused', name: '集中の達人', rate: 0.02 },
  { id: 'title_tireless', name: '不屈の作業者', rate: 0.012 },
  { id: 'title_veteran', name: '深淵のベテラン', rate: 0.006 },
  { id: 'title_legend', name: '伝説の勇者', rate: 0.003 },
  { id: 'title_myth', name: '神話の存在', rate: 0.001 },
];

// アイテム：重複入手可能。使用すると一定時間、ドロップ頻度や確率を上げる。
const ITEMS = [
  {
    id: 'item_charm',
    name: '幸運のお守り',
    description: '10分間、報酬の出現確率が2倍になる。',
    weight: 50,
    effect: { type: 'boostRate', multiplier: 2, durationMinutes: 10 },
  },
  {
    id: 'item_hourglass',
    name: '加速の砂時計',
    description: '10分間、報酬判定の間隔が3分→1分に短縮される。',
    weight: 30,
    effect: { type: 'boostFrequency', intervalMinutes: 1, durationMinutes: 10 },
  },
  {
    id: 'item_crystal',
    name: '幸運の結晶',
    description: '20分間、報酬の出現確率が1.5倍になる。',
    weight: 15,
    effect: { type: 'boostRate', multiplier: 1.5, durationMinutes: 20 },
  },
  {
    id: 'item_relic',
    name: '古の秘宝',
    description: '30分間、報酬判定の間隔が3分→2分に短縮され、確率も1.3倍になる。',
    weight: 5,
    effect: { type: 'boostBoth', multiplier: 1.3, intervalMinutes: 2, durationMinutes: 30 },
  },
  // 強化専用アイテム（作業報酬としてもドロップ、強化タブで消費する）
  {
    id: 'item_enhance_stone',
    name: '強化の石',
    description: '強化タブでモンスターに使用すると経験値が加算される。',
    weight: 40,
    enhanceValue: 20,
  },
  {
    id: 'item_enhance_gem',
    name: '強化の宝玉',
    description: '強化タブでモンスターに使用すると大きく経験値が加算される。',
    weight: 10,
    enhanceValue: 80,
  },
];

// モンスター種族：重複入手可能。入手時に個体値(IV)がランダムに決まる。
const MONSTER_SPECIES = [
  { id: 'mon_slime', name: 'スライム', weight: 50, baseHp: 30, baseAtk: 6, baseDef: 4, baseSpd: 5 },
  { id: 'mon_pup', name: 'コインパピー', weight: 40, baseHp: 34, baseAtk: 8, baseDef: 5, baseSpd: 8 },
  { id: 'mon_golem', name: 'ミニゴーレム', weight: 30, baseHp: 46, baseAtk: 7, baseDef: 10, baseSpd: 2 },
  { id: 'mon_sprite', name: 'ライトスプライト', weight: 25, baseHp: 26, baseAtk: 10, baseDef: 3, baseSpd: 11 },
  { id: 'mon_wolf', name: 'シャドウウルフ', weight: 15, baseHp: 38, baseAtk: 12, baseDef: 6, baseSpd: 10 },
  { id: 'mon_drake', name: 'ベビードレイク', weight: 6, baseHp: 44, baseAtk: 14, baseDef: 8, baseSpd: 7 },
  { id: 'mon_phoenix', name: 'フェニックスの雛', weight: 2, baseHp: 40, baseAtk: 16, baseDef: 7, baseSpd: 13 },
  { id: 'mon_dragon', name: '古代竜の幼生', weight: 1, baseHp: 60, baseAtk: 20, baseDef: 12, baseSpd: 9 },
];

function weightedPick(pool) {
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return pool[pool.length - 1];
}

function rollIv() {
  return Math.floor(Math.random() * 32); // 0-31
}

function rollIvs() {
  return { hp: rollIv(), atk: rollIv(), def: rollIv(), spd: rollIv() };
}

function getTitleById(id) {
  return TITLES.find((t) => t.id === id) || null;
}

function getItemById(id) {
  return ITEMS.find((i) => i.id === id) || null;
}

function getSpeciesById(id) {
  return MONSTER_SPECIES.find((m) => m.id === id) || null;
}

module.exports = {
  TITLES,
  ITEMS,
  MONSTER_SPECIES,
  weightedPick,
  rollIvs,
  getTitleById,
  getItemById,
  getSpeciesById,
};
