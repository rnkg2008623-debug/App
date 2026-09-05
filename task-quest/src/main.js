'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const store = require('./store');
const engine = require('./engine');
const { TITLES, ITEMS, MONSTER_SPECIES } = require('./game-data');

let mainWindow = null;
let tickTimer = null;

function getState() {
  return store.store;
}

function setState(state) {
  store.set(state);
}

function runTick() {
  const state = getState();
  engine.tick(state, Date.now());
  setState(state);
  broadcastState();
}

function broadcastState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('state:update', buildViewState());
  }
}

function buildViewState() {
  const state = getState();
  return {
    ...state,
    static: { TITLES, ITEMS, MONSTER_SPECIES },
    now: Date.now(),
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 900,
    minHeight: 640,
    title: 'TaskQuest',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  // 起動時に、前回終了〜今回起動までの経過時間を一括で追いつかせる
  runTick();
  createWindow();
  tickTimer = setInterval(runTick, 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (tickTimer) clearInterval(tickTimer);
  if (process.platform !== 'darwin') app.quit();
});

// ------------------------- IPC -------------------------

function handle(channel, fn) {
  ipcMain.handle(channel, (_event, ...args) => {
    const state = getState();
    const result = fn(state, ...args);
    setState(state);
    broadcastState();
    return result;
  });
}

ipcMain.handle('state:get', () => buildViewState());

handle('todo:add', (state, todo) => {
  state.todos.push({
    id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: todo.title,
    description: todo.description || '',
    durationMinutes: todo.durationMinutes || 0,
    done: false,
    createdAt: Date.now(),
  });
  return { ok: true };
});

handle('todo:update', (state, id, patch) => {
  const item = state.todos.find((t) => t.id === id);
  if (!item) return { ok: false, error: '見つかりません' };
  Object.assign(item, patch);
  return { ok: true };
});

handle('todo:delete', (state, id) => {
  state.todos = state.todos.filter((t) => t.id !== id);
  return { ok: true };
});

handle('timetable:add', (state, entry) => {
  state.timetable.push({
    id: `tt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    day: entry.day,
    startTime: entry.startTime,
    endTime: entry.endTime,
    label: entry.label || '',
  });
  return { ok: true };
});

handle('timetable:update', (state, id, patch) => {
  const item = state.timetable.find((t) => t.id === id);
  if (!item) return { ok: false, error: '見つかりません' };
  Object.assign(item, patch);
  return { ok: true };
});

handle('timetable:delete', (state, id) => {
  state.timetable = state.timetable.filter((t) => t.id !== id);
  return { ok: true };
});

handle('session:start', (state, plannedMinutes) => engine.startSession(state, plannedMinutes));
handle('session:cancel', (state) => {
  engine.cancelSession(state);
  return { ok: true };
});
handle('session:useBoostItem', (state, itemId) => engine.useBoostItem(state, itemId));

handle('party:set', (state, uids) => engine.setParty(state, uids));

handle('enhance:fuse', (state, targetUid, materialUid) => engine.fuseMonster(state, targetUid, materialUid));
handle('enhance:useItem', (state, targetUid, itemId) => engine.useEnhanceItem(state, targetUid, itemId));
