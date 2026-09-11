'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getState: () => ipcRenderer.invoke('state:get'),
  onStateUpdate: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('state:update', listener);
    return () => ipcRenderer.removeListener('state:update', listener);
  },

  addTodo: (todo) => ipcRenderer.invoke('todo:add', todo),
  updateTodo: (id, patch) => ipcRenderer.invoke('todo:update', id, patch),
  deleteTodo: (id) => ipcRenderer.invoke('todo:delete', id),

  addTimetableEntry: (entry) => ipcRenderer.invoke('timetable:add', entry),
  updateTimetableEntry: (id, patch) => ipcRenderer.invoke('timetable:update', id, patch),
  deleteTimetableEntry: (id) => ipcRenderer.invoke('timetable:delete', id),

  startSession: (minutes) => ipcRenderer.invoke('session:start', minutes),
  cancelSession: () => ipcRenderer.invoke('session:cancel'),
  useBoostItem: (itemId) => ipcRenderer.invoke('session:useBoostItem', itemId),

  setParty: (uids) => ipcRenderer.invoke('party:set', uids),

  fuseMonster: (targetUid, materialUid) => ipcRenderer.invoke('enhance:fuse', targetUid, materialUid),
  useEnhanceItem: (targetUid, itemId) => ipcRenderer.invoke('enhance:useItem', targetUid, itemId),
});
