'use strict';

const Store = require('electron-store');

const defaults = {
  todos: [],
  timetable: [],
  stats: {
    completedSessions: 0,
    totalWorkSeconds: 0,
  },
  session: null,
  collection: {
    titles: [],
    items: {},
    monsters: [],
  },
  party: [],
  dungeon: {
    floor: 1,
    partyState: null,
    activeIndex: 0,
    enemy: null,
    log: [],
    lastTurnAt: null,
    maxDepthReached: 1,
  },
};

const store = new Store({ defaults });

module.exports = store;
