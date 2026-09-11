'use strict';

let state = null;
let selectedFormation = [];
let selectedEnhanceTarget = null;

const DAY_NAMES = ['月', '火', '水', '木', '金', '土', '日'];

// ------------------------- 初期化 -------------------------

async function init() {
  state = await window.api.getState();
  selectedFormation = [...state.party];
  window.api.onStateUpdate((next) => {
    state = next;
    renderAll();
  });
  setupTabs();
  setupTodoHandlers();
  setupTimetableHandlers();
  renderAll();
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('is-active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('is-active'));
      btn.classList.add('is-active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('is-active');
    });
  });
}

function renderAll() {
  renderSessionBar();
  renderTodo();
  renderTimetable();
  renderStats();
  renderBattle();
  renderFormation();
  renderEnhance();
  renderCollection();
}

function getSpecies(id) {
  return state.static.MONSTER_SPECIES.find((m) => m.id === id) || null;
}
function getItemDef(id) {
  return state.static.ITEMS.find((i) => i.id === id) || null;
}
function getTitleDef(id) {
  return state.static.TITLES.find((t) => t.id === id) || null;
}

function computeStatsClient(instance) {
  const species = getSpecies(instance.speciesId);
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

function expToNext(level) {
  return level * 100;
}

// ------------------------- モーダル -------------------------

function openModal(titleText, fieldsHtml, onSubmit, submitLabel) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-box">
        <h2>${titleText}</h2>
        <form id="modal-form">
          ${fieldsHtml}
          <div class="modal-actions">
            <button type="button" class="btn" id="modal-cancel">キャンセル</button>
            <button type="submit" class="btn btn-primary">${submitLabel || '保存'}</button>
          </div>
        </form>
      </div>
    </div>
  `;
  root.querySelector('#modal-cancel').addEventListener('click', closeModal);
  root.querySelector('.modal-backdrop').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) closeModal();
  });
  const form = root.querySelector('#modal-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    onSubmit(new FormData(form));
  });
}

function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
}

// ------------------------- セッションバー -------------------------

function fmtDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':');
}

function renderSessionBar() {
  const bar = document.getElementById('session-bar');
  if (!state.session) {
    bar.innerHTML = `
      <span>作業セッション：停止中</span>
      <form id="start-session-form" class="session-idle-form">
        <input type="number" min="1" max="600" value="25" name="minutes" /> 分
        <button type="submit" class="btn btn-primary btn-sm">▶ 作業開始</button>
      </form>
    `;
    bar.querySelector('#start-session-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const minutes = Number(new FormData(e.target).get('minutes')) || 25;
      await window.api.startSession(minutes);
    });
    return;
  }

  const session = state.session;
  const endAt = session.startedAt + session.plannedMinutes * 60000;
  const remaining = (endAt - state.now) / 1000;
  const boostActive = session.boost && session.boost.expiresAt > state.now;

  const boostItems = Object.entries(state.collection.items)
    .filter(([id, count]) => count > 0 && getItemDef(id) && getItemDef(id).effect)
    .map(([id, count]) => `<option value="${id}">${getItemDef(id).name}（${count}個）</option>`)
    .join('');

  bar.innerHTML = `
    <div class="session-active">
      <span>作業中</span>
      <span class="session-timer">残り ${fmtDuration(remaining)}</span>
      ${boostActive ? `<span class="boost-badge">ブースト中</span>` : ''}
      ${boostItems ? `
        <select id="boost-item-select">${boostItems}</select>
        <button id="use-boost-btn" class="btn btn-sm">使用</button>
      ` : ''}
      <button id="cancel-session-btn" class="btn btn-sm btn-danger">中止</button>
      <span class="session-log">${(session.rewardLog || []).slice(-3).join(' / ')}</span>
    </div>
  `;

  const useBtn = document.getElementById('use-boost-btn');
  if (useBtn) {
    useBtn.addEventListener('click', async () => {
      const itemId = document.getElementById('boost-item-select').value;
      await window.api.useBoostItem(itemId);
    });
  }
  document.getElementById('cancel-session-btn').addEventListener('click', async () => {
    await window.api.cancelSession();
  });
}

// ------------------------- Todo -------------------------

function setupTodoHandlers() {
  document.getElementById('btn-new-todo').addEventListener('click', () => {
    openModal('Todoを追加', `
      <div class="field"><label>タイトル</label><input name="title" required /></div>
      <div class="field"><label>説明</label><textarea name="description"></textarea></div>
      <div class="field"><label>所要時間（分）</label><input type="number" min="0" name="durationMinutes" value="30" /></div>
    `, async (fd) => {
      await window.api.addTodo({
        title: fd.get('title'),
        description: fd.get('description'),
        durationMinutes: Number(fd.get('durationMinutes')) || 0,
      });
      closeModal();
    }, '追加');
  });
}

function renderTodo() {
  const list = document.getElementById('todo-list');
  if (state.todos.length === 0) {
    list.innerHTML = `<div class="empty-hint">Todoがまだありません。「＋ Todoを追加」から作成してください。</div>`;
    return;
  }
  list.innerHTML = state.todos
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((t) => `
      <div class="todo-item ${t.done ? 'is-done' : ''}" data-id="${t.id}">
        <input type="checkbox" class="todo-check" ${t.done ? 'checked' : ''} />
        <div class="todo-main">
          <div class="todo-title">${escapeHtml(t.title)}</div>
          ${t.description ? `<div class="todo-desc">${escapeHtml(t.description)}</div>` : ''}
          <div class="todo-meta">所要時間：${t.durationMinutes}分</div>
        </div>
        <div class="todo-actions">
          <button class="btn btn-sm todo-edit">編集</button>
          <button class="btn btn-sm btn-danger todo-delete">削除</button>
        </div>
      </div>
    `).join('');

  list.querySelectorAll('.todo-item').forEach((el) => {
    const id = el.dataset.id;
    const todo = state.todos.find((t) => t.id === id);
    el.querySelector('.todo-check').addEventListener('change', (e) => {
      window.api.updateTodo(id, { done: e.target.checked });
    });
    el.querySelector('.todo-delete').addEventListener('click', () => {
      window.api.deleteTodo(id);
    });
    el.querySelector('.todo-edit').addEventListener('click', () => {
      openModal('Todoを編集', `
        <div class="field"><label>タイトル</label><input name="title" required value="${escapeAttr(todo.title)}" /></div>
        <div class="field"><label>説明</label><textarea name="description">${escapeHtml(todo.description || '')}</textarea></div>
        <div class="field"><label>所要時間（分）</label><input type="number" min="0" name="durationMinutes" value="${todo.durationMinutes}" /></div>
      `, async (fd) => {
        await window.api.updateTodo(id, {
          title: fd.get('title'),
          description: fd.get('description'),
          durationMinutes: Number(fd.get('durationMinutes')) || 0,
        });
        closeModal();
      }, '保存');
    });
  });
}

// ------------------------- Timetable -------------------------

function setupTimetableHandlers() {
  document.getElementById('btn-new-timetable').addEventListener('click', () => {
    openModal('予定を追加', timetableFieldsHtml(), async (fd) => {
      await window.api.addTimetableEntry({
        day: Number(fd.get('day')),
        startTime: fd.get('startTime'),
        endTime: fd.get('endTime'),
        label: fd.get('label'),
      });
      closeModal();
    }, '追加');
  });
}

function timetableFieldsHtml(entry) {
  const dayOptions = DAY_NAMES.map((name, i) => `<option value="${i}" ${entry && entry.day === i ? 'selected' : ''}>${name}曜日</option>`).join('');
  return `
    <div class="field"><label>内容</label><input name="label" required value="${entry ? escapeAttr(entry.label) : ''}" /></div>
    <div class="field"><label>曜日</label><select name="day">${dayOptions}</select></div>
    <div class="field"><label>開始時刻</label><input type="time" name="startTime" required value="${entry ? entry.startTime : '09:00'}" /></div>
    <div class="field"><label>終了時刻</label><input type="time" name="endTime" required value="${entry ? entry.endTime : '10:00'}" /></div>
  `;
}

function renderTimetable() {
  const grid = document.getElementById('timetable-grid');
  grid.innerHTML = DAY_NAMES.map((name, day) => {
    const entries = state.timetable
      .filter((e) => e.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return `
      <div class="tt-day">
        <h3>${name}</h3>
        ${entries.map((e) => `
          <div class="tt-entry" data-id="${e.id}">
            <div class="tt-time">${e.startTime}–${e.endTime}</div>
            <div>${escapeHtml(e.label)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.tt-entry').forEach((el) => {
    const id = el.dataset.id;
    const entry = state.timetable.find((e) => e.id === id);
    el.addEventListener('click', () => {
      openModal('予定を編集', timetableFieldsHtml(entry), async (fd) => {
        await window.api.updateTimetableEntry(id, {
          day: Number(fd.get('day')),
          startTime: fd.get('startTime'),
          endTime: fd.get('endTime'),
          label: fd.get('label'),
        });
        closeModal();
      }, '保存');
      const box = document.querySelector('.modal-box');
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-danger';
      delBtn.textContent = '削除';
      delBtn.addEventListener('click', async () => {
        await window.api.deleteTimetableEntry(id);
        closeModal();
      });
      box.querySelector('.modal-actions').prepend(delBtn);
    });
  });
}

// ------------------------- 統計 -------------------------

function renderStats() {
  const body = document.getElementById('stats-body');
  const totalSeconds = state.stats.totalWorkSeconds;
  const tiles = [
    { label: '完了セッション数', value: `${state.stats.completedSessions} 回` },
    { label: '秒換算', value: `${Math.round(totalSeconds)} 秒` },
    { label: '分換算', value: `${(totalSeconds / 60).toFixed(1)} 分` },
    { label: '時間換算', value: `${(totalSeconds / 3600).toFixed(2)} 時間` },
    { label: '日換算', value: `${(totalSeconds / 86400).toFixed(3)} 日` },
    { label: '月換算', value: `${(totalSeconds / (86400 * 30)).toFixed(3)} ヶ月` },
    { label: '年換算', value: `${(totalSeconds / (86400 * 365)).toFixed(4)} 年` },
    { label: '最深到達階', value: `F${state.dungeon.maxDepthReached}` },
  ];
  body.innerHTML = tiles.map((t) => `
    <div class="stat-tile">
      <div class="stat-label">${t.label}</div>
      <div class="stat-value">${t.value}</div>
    </div>
  `).join('');
}

// ------------------------- バトル -------------------------

function renderBattle() {
  const body = document.getElementById('battle-body');
  if (state.party.length === 0) {
    body.innerHTML = `<div class="empty-hint">編成タブでモンスターを3体選択すると探検が始まります。</div>`;
    return;
  }
  const dungeon = state.dungeon;
  const enemy = dungeon.enemy;
  const partyState = dungeon.partyState || [];

  const partyHtml = partyState.map((p, idx) => {
    const inst = state.collection.monsters.find((m) => m.uid === p.uid);
    const species = inst ? getSpecies(inst.speciesId) : null;
    const stats = inst ? computeStatsClient(inst) : { hp: 1 };
    const pct = Math.max(0, Math.min(100, (p.hp / stats.hp) * 100));
    return `
      <div class="p-slot ${idx === dungeon.activeIndex ? 'is-active' : ''} ${p.hp <= 0 ? 'is-down' : ''}">
        <div>${species ? species.name : '???'} Lv${inst ? inst.level : '?'}</div>
        <div class="hp-bar-track"><div class="hp-bar-fill ${pct < 30 ? 'low' : ''}" style="width:${pct}%"></div></div>
        <div>${Math.max(0, p.hp)} / ${stats.hp}</div>
      </div>
    `;
  }).join('');

  const enemyPct = enemy ? Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100)) : 0;

  body.innerHTML = `
    <div class="floor-badge">現在の階層：F${dungeon.floor}（最深到達：F${dungeon.maxDepthReached}）</div>
    <div class="battle-row">
      <div class="combatant">
        <h3>自パーティ</h3>
        <div class="party-mini">${partyHtml}</div>
      </div>
      <div class="combatant">
        <h3>敵：${enemy ? enemy.name : '-'}</h3>
        <div class="hp-bar-track"><div class="hp-bar-fill ${enemyPct < 30 ? 'low' : ''}" style="width:${enemyPct}%"></div></div>
        <div>${enemy ? `${enemy.hp} / ${enemy.maxHp}` : '-'}</div>
      </div>
    </div>
    <div class="battle-log">${(dungeon.log || []).slice(-40).reverse().map((l) => `<div>${escapeHtml(l)}</div>`).join('')}</div>
  `;
}

// ------------------------- 編成 -------------------------

function renderFormation() {
  const body = document.getElementById('formation-body');
  selectedFormation = selectedFormation.filter((uid) => state.collection.monsters.some((m) => m.uid === uid));

  const slots = [0, 1, 2].map((i) => {
    const uid = selectedFormation[i];
    if (!uid) return `<div class="slot-box">空き枠</div>`;
    const inst = state.collection.monsters.find((m) => m.uid === uid);
    const species = getSpecies(inst.speciesId);
    return `<div class="slot-box filled">${species.name}<br/>Lv${inst.level}</div>`;
  }).join('');

  const cards = state.collection.monsters.map((inst) => {
    const species = getSpecies(inst.speciesId);
    const selected = selectedFormation.includes(inst.uid);
    return `
      <div class="monster-card ${selected ? 'is-selected' : ''}" data-uid="${inst.uid}">
        <div class="mc-name">${species.name}</div>
        <div class="mc-sub">Lv${inst.level}</div>
        <div class="mc-ivs">
          <span class="iv-chip">H${inst.ivs.hp}</span>
          <span class="iv-chip">A${inst.ivs.atk}</span>
          <span class="iv-chip">D${inst.ivs.def}</span>
          <span class="iv-chip">S${inst.ivs.spd}</span>
        </div>
      </div>
    `;
  }).join('');

  body.innerHTML = `
    <div class="slot-row">${slots}</div>
    <div style="margin-bottom:12px;">
      <button id="save-formation-btn" class="btn btn-primary">この編成で確定</button>
    </div>
    <div class="monster-grid">${cards || '<div class="empty-hint">まだモンスターがいません。作業セッション中に低確率で入手できます。</div>'}</div>
  `;

  body.querySelectorAll('.monster-card').forEach((el) => {
    el.addEventListener('click', () => {
      const uid = el.dataset.uid;
      const idx = selectedFormation.indexOf(uid);
      if (idx >= 0) {
        selectedFormation.splice(idx, 1);
      } else if (selectedFormation.length < 3) {
        selectedFormation.push(uid);
      }
      renderFormation();
    });
  });

  const saveBtn = document.getElementById('save-formation-btn');
  saveBtn.addEventListener('click', async () => {
    await window.api.setParty(selectedFormation);
  });
}

// ------------------------- 強化 -------------------------

function renderEnhance() {
  const body = document.getElementById('enhance-body');
  if (selectedEnhanceTarget && !state.collection.monsters.some((m) => m.uid === selectedEnhanceTarget)) {
    selectedEnhanceTarget = null;
  }

  const listHtml = state.collection.monsters.map((inst) => {
    const species = getSpecies(inst.speciesId);
    return `
      <div class="monster-card ${selectedEnhanceTarget === inst.uid ? 'is-selected' : ''}" data-uid="${inst.uid}">
        <div class="mc-name">${species.name}</div>
        <div class="mc-sub">Lv${inst.level}（EXP ${inst.exp}/${expToNext(inst.level)}）</div>
      </div>
    `;
  }).join('');

  let panelHtml = `<div class="empty-hint">左のリストから強化したいモンスターを選択してください。</div>`;

  if (selectedEnhanceTarget) {
    const target = state.collection.monsters.find((m) => m.uid === selectedEnhanceTarget);
    const species = getSpecies(target.speciesId);
    const stats = computeStatsClient(target);
    const expPct = Math.min(100, (target.exp / expToNext(target.level)) * 100);

    const materials = state.collection.monsters.filter(
      (m) => m.uid !== target.uid && m.speciesId === target.speciesId && !state.party.includes(m.uid)
    );

    const enhanceItems = Object.entries(state.collection.items)
      .filter(([id, count]) => count > 0 && getItemDef(id) && getItemDef(id).enhanceValue)
      .map(([id, count]) => {
        const def = getItemDef(id);
        return `
          <div class="item-card">
            <div class="ic-name">${def.name} <span class="ic-count">×${count}</span></div>
            <div class="ic-desc">${def.description}</div>
            <button class="btn btn-sm enhance-item-btn" data-item="${id}">使用</button>
          </div>
        `;
      }).join('');

    panelHtml = `
      <h3>${species.name}（Lv${target.level}）</h3>
      <div>HP ${stats.hp} / ATK ${stats.atk} / DEF ${stats.def} / SPD ${stats.spd}</div>
      <div class="exp-bar-track"><div class="exp-bar-fill" style="width:${expPct}%"></div></div>
      <p class="panel-sub">個体値：H${target.ivs.hp} A${target.ivs.atk} D${target.ivs.def} S${target.ivs.spd}</p>

      <h3>素材（同種族の重複モンスター）</h3>
      <div class="monster-grid">
        ${materials.length ? materials.map((m) => `
          <div class="monster-card" data-material="${m.uid}">
            <div class="mc-name">Lv${m.level}</div>
            <button class="btn btn-sm fuse-btn" data-material="${m.uid}">合成する</button>
          </div>
        `).join('') : '<div class="empty-hint">合成できる重複モンスターがいません。</div>'}
      </div>

      <h3 style="margin-top:16px;">強化アイテム</h3>
      <div class="item-grid">${enhanceItems || '<div class="empty-hint">強化アイテムを所持していません。</div>'}</div>
    `;
  }

  body.innerHTML = `
    <div class="enhance-target-list">${listHtml || '<div class="empty-hint">モンスターがいません。</div>'}</div>
    <div class="enhance-panel">${panelHtml}</div>
  `;

  body.querySelectorAll('.enhance-target-list .monster-card').forEach((el) => {
    el.addEventListener('click', () => {
      selectedEnhanceTarget = el.dataset.uid;
      renderEnhance();
    });
  });
  body.querySelectorAll('.fuse-btn').forEach((el) => {
    el.addEventListener('click', async () => {
      await window.api.fuseMonster(selectedEnhanceTarget, el.dataset.material);
    });
  });
  body.querySelectorAll('.enhance-item-btn').forEach((el) => {
    el.addEventListener('click', async () => {
      await window.api.useEnhanceItem(selectedEnhanceTarget, el.dataset.item);
    });
  });
}

// ------------------------- 図鑑 -------------------------

function renderCollection() {
  const body = document.getElementById('collection-body');
  const ownedTitleIds = new Set(state.collection.titles.map((t) => t.id));

  const titleChips = state.static.TITLES.map((t) => `
    <span class="title-chip ${ownedTitleIds.has(t.id) ? '' : 'is-locked'}">${t.name}${ownedTitleIds.has(t.id) ? '' : '（未獲得）'}</span>
  `).join('');

  const itemCards = state.static.ITEMS.map((def) => {
    const count = state.collection.items[def.id] || 0;
    return `
      <div class="item-card" style="${count === 0 ? 'opacity:0.4' : ''}">
        <div class="ic-name">${def.name} <span class="ic-count">×${count}</span></div>
        <div class="ic-desc">${def.description}</div>
      </div>
    `;
  }).join('');

  const speciesCounts = {};
  state.collection.monsters.forEach((m) => {
    speciesCounts[m.speciesId] = (speciesCounts[m.speciesId] || 0) + 1;
  });
  const monsterDex = state.static.MONSTER_SPECIES.map((sp) => `
    <div class="item-card" style="${speciesCounts[sp.id] ? '' : 'opacity:0.4'}">
      <div class="ic-name">${sp.name} <span class="ic-count">×${speciesCounts[sp.id] || 0}</span></div>
    </div>
  `).join('');

  body.innerHTML = `
    <div class="collection-section">
      <h2>称号</h2>
      <div class="title-chip-list">${titleChips}</div>
    </div>
    <div class="collection-section">
      <h2>アイテム</h2>
      <div class="item-grid">${itemCards}</div>
    </div>
    <div class="collection-section">
      <h2>モンスター図鑑</h2>
      <div class="item-grid">${monsterDex}</div>
    </div>
  `;
}

// ------------------------- ユーティリティ -------------------------

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function escapeAttr(str) {
  return escapeHtml(str);
}

init();
