(() => {
  'use strict';

  const STORAGE_TEXT = 'speech.text';
  const STORAGE_HINT = 'speech.hint';
  const $ = (id) => document.getElementById(id);
  const els = {
    tabs: document.querySelectorAll('.tab'),
    viewEdit: $('view-edit'), viewTest: $('view-test'),
    source: $('source'), blockCount: $('block-count'), preview: $('preview'), goTest: $('btn-go-test'),
    optHint: $('opt-hint'),
    check: $('btn-check'), returnWrong: $('btn-return-wrong'), answer: $('btn-answer'), reset: $('btn-reset'),
    result: $('result'),
    chain: $('chain'), chainList: $('chain-list'), chainEmpty: $('chain-empty'), chainCount: $('chain-count'),
    pool: $('pool'), poolList: $('pool-list'), poolEmpty: $('pool-empty'), poolCount: $('pool-count'),
    totalCount: $('total-count'),
  };

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* 保存できなくても動作は続ける */ } },
  };

  // ブロック分割: 改行ごと、空行は無視
  const splitBlocks = (text) => text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---- 状態 ----
  let texts = [];      // 正しい順番のブロック本文
  let builtFrom = null; // テストを作った時点の原稿
  let chain = [];      // 並べたブロックのインデックス
  let pool = [];       // 未使用ブロックのインデックス
  let fixedCount = 0;  // ヒントとして固定された先頭ブロック数
  let graded = false;  // 答え合わせ結果を表示中か

  // ---- 原稿入力 ----
  function updatePreview() {
    const blocks = splitBlocks(els.source.value);
    els.blockCount.textContent = blocks.length;
    els.preview.replaceChildren(...blocks.map((t) => {
      const li = document.createElement('li');
      li.textContent = t;
      return li;
    }));
    els.goTest.disabled = blocks.length < 2;
  }

  els.source.addEventListener('input', () => {
    store.set(STORAGE_TEXT, els.source.value);
    updatePreview();
  });

  // ---- タブ切り替え ----
  function showView(name) {
    els.tabs.forEach((t) => t.classList.toggle('active', t.dataset.view === name));
    els.viewEdit.hidden = name !== 'edit';
    els.viewTest.hidden = name !== 'test';
    if (name === 'test' && builtFrom !== els.source.value) startTest();
    window.scrollTo(0, 0);
  }
  els.tabs.forEach((t) => t.addEventListener('click', () => showView(t.dataset.view)));
  els.goTest.addEventListener('click', () => showView('test'));

  // ---- テスト ----
  function startTest() {
    builtFrom = els.source.value;
    texts = splitBlocks(builtFrom);
    const all = texts.map((_, i) => i);
    fixedCount = els.optHint.checked && texts.length > 0 ? 1 : 0;
    chain = all.slice(0, fixedCount);
    const rest = all.slice(fixedCount);
    pool = shuffle(rest);
    // 偶然正しい順番のままにならないようにする
    for (let tries = 0; tries < 10 && rest.length > 1 && pool.every((v, i) => v === rest[i]); tries++) {
      pool = shuffle(rest);
    }
    graded = false;
    els.result.hidden = true;
    render();
  }

  const isCorrectAt = (i) => texts[chain[i]] === texts[i];
  // a の直後に b が来るのが正しいか（同じ文のブロックが複数あっても本文で判定）
  function isCorrectLink(a, b) {
    for (let j = 0; j < texts.length - 1; j++) {
      if (texts[j] === texts[a] && texts[j + 1] === texts[b]) return true;
    }
    return false;
  }

  function makeBlock(idx, zone, pos) {
    const el = document.createElement('div');
    el.className = 'block';
    el.dataset.idx = idx;
    el.dataset.zone = zone;
    el.dataset.pos = pos;
    const handle = document.createElement('div');
    handle.className = 'handle';
    handle.textContent = '⠿';
    const num = document.createElement('div');
    num.className = 'num';
    num.textContent = pos + 1;
    const text = document.createElement('div');
    text.className = 'text';
    text.textContent = texts[idx];
    el.append(handle, num, text);
    if (zone === 'chain' && pos < fixedCount) el.classList.add('fixed');
    if (graded && zone === 'chain') {
      const ok = isCorrectAt(pos);
      el.classList.add(ok ? 'ok' : 'ng');
      const mark = document.createElement('div');
      mark.className = 'mark';
      mark.textContent = ok ? '○' : '✗';
      el.append(mark);
    }
    return el;
  }

  function makeJoint(pos) {
    const j = document.createElement('div');
    j.className = 'joint';
    const label = document.createElement('span');
    if (graded) {
      const ok = pos === 0 ? texts[chain[0]] === texts[0] : isCorrectLink(chain[pos - 1], chain[pos]);
      j.classList.add(ok ? 'ok' : 'ng');
      label.textContent = ok ? '○' : '✗';
    } else {
      label.textContent = '↓';
    }
    j.append(label);
    return j;
  }

  function render() {
    els.chainList.replaceChildren(...chain.map((idx, pos) => {
      const link = document.createElement('div');
      link.className = 'link';
      link.append(makeJoint(pos), makeBlock(idx, 'chain', pos));
      return link;
    }));
    els.poolList.replaceChildren(...pool.map((idx, pos) => makeBlock(idx, 'pool', pos)));
    els.chainEmpty.hidden = chain.length > 0;
    els.poolEmpty.hidden = pool.length > 0 || texts.length === 0;
    els.chainCount.textContent = chain.length;
    els.poolCount.textContent = pool.length;
    els.totalCount.textContent = texts.length;
    els.returnWrong.disabled = !graded;
  }

  function clearGrade() {
    if (!graded) return;
    graded = false;
    els.result.hidden = true;
  }

  function move(fromZone, fromPos, toZone, toPos) {
    const src = fromZone === 'chain' ? chain : pool;
    const [idx] = src.splice(fromPos, 1);
    const dst = toZone === 'chain' ? chain : pool;
    if (toZone === 'chain') toPos = Math.max(fixedCount, Math.min(toPos, dst.length));
    else toPos = dst.length;
    dst.splice(toPos, 0, idx);
    clearGrade();
    render();
  }

  // ---- 答え合わせ ----
  els.check.addEventListener('click', () => {
    if (!texts.length) return;
    graded = true;
    const n = texts.length;
    let pos = 0, links = 0;
    chain.forEach((idx, i) => {
      if (isCorrectAt(i)) pos++;
      if (i === 0 ? texts[idx] === texts[0] : isCorrectLink(chain[i - 1], idx)) links++;
    });
    const perfect = pos === n;
    els.result.className = 'result' + (perfect ? ' perfect' : '');
    els.result.innerHTML = perfect
      ? '🎉 <b>全問正解！</b> スピーチの流れは完璧です。'
      : `位置が正しいブロック: <b>${pos}</b> / ${n}　・　正しいつながり: <b>${links}</b> / ${n}` +
        (pool.length ? `　<span class="muted">（未配置 ${pool.length} ブロック）</span>` : '');
    els.result.hidden = false;
    render();
  });

  els.returnWrong.addEventListener('click', () => {
    if (!graded) return;
    const keep = [], back = [];
    chain.forEach((idx, i) => (i < fixedCount || isCorrectAt(i) ? keep : back).push(idx));
    chain = keep;
    pool = shuffle(pool.concat(back));
    clearGrade();
    render();
  });

  els.answer.addEventListener('click', () => {
    chain = texts.map((_, i) => i);
    pool = [];
    graded = true;
    els.result.className = 'result';
    els.result.innerHTML = '📖 正解の順番を表示しています。「↻ やり直す」でもう一度挑戦できます。';
    els.result.hidden = false;
    render();
  });

  els.reset.addEventListener('click', startTest);
  els.optHint.addEventListener('change', () => {
    store.set(STORAGE_HINT, els.optHint.checked ? '1' : '0');
    startTest();
  });

  // ---- ドラッグ＆ドロップ（マウス・タッチ共通の Pointer Events） ----
  const DRAG_THRESHOLD = 6;
  let press = null; // { el, zone, pos, x, y, id, canDrag }
  let drag = null;  // { ghost, offX, offY, x, y, slot, target, raf }

  function onPointerDown(e) {
    const el = e.target.closest('.block');
    if (!el || el.classList.contains('fixed') || e.button > 0) return;
    const onHandle = !!e.target.closest('.handle');
    press = {
      el, zone: el.dataset.zone, pos: Number(el.dataset.pos),
      x: e.clientX, y: e.clientY, id: e.pointerId,
      // タッチは本文部分だとスクロールを優先し、⠿ の部分でドラッグ
      canDrag: e.pointerType !== 'touch' || onHandle,
    };
    if (onHandle || e.pointerType === 'mouse') e.preventDefault();
  }

  function onPointerMove(e) {
    if (!press || e.pointerId !== press.id) return;
    if (!drag) {
      if (!press.canDrag) return;
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < DRAG_THRESHOLD) return;
      beginDrag(e);
    }
    e.preventDefault();
    drag.x = e.clientX;
    drag.y = e.clientY;
    positionGhost();
    updateTarget();
  }

  function onPointerUp(e) {
    if (!press || e.pointerId !== press.id) return;
    if (drag) {
      endDrag(true);
    } else if (e.type === 'pointerup') {
      // クリック／タップ: バラバラ → 流れの末尾、流れ → バラバラに戻す
      if (press.zone === 'pool') move('pool', press.pos, 'chain', chain.length);
      else move('chain', press.pos, 'pool', pool.length);
    }
    press = null;
  }

  function beginDrag(e) {
    const rect = press.el.getBoundingClientRect();
    const ghost = press.el.cloneNode(true);
    ghost.classList.add('ghost');
    ghost.style.width = rect.width + 'px';
    document.body.append(ghost);
    drag = {
      ghost, offX: press.x - rect.left, offY: press.y - rect.top,
      x: e.clientX, y: e.clientY, slot: document.createElement('div'), target: null, raf: 0,
    };
    drag.slot.className = 'drop-slot';
    drag.slot.style.height = Math.min(rect.height, 120) + 'px';
    // 流れの中から持ち上げたときは、その場所を空ける
    if (press.zone === 'chain') press.el.parentElement.hidden = true;
    else press.el.classList.add('dragging-src');
    document.body.classList.add('is-dragging');
    drag.raf = requestAnimationFrame(autoScroll);
  }

  function positionGhost() {
    drag.ghost.style.left = (drag.x - drag.offX) + 'px';
    drag.ghost.style.top = (drag.y - drag.offY) + 'px';
  }

  function zoneAt(x, y) {
    const hit = document.elementFromPoint(x, y);
    const zone = hit && hit.closest('.zone');
    return zone ? zone.dataset.zone : null;
  }

  function updateTarget() {
    const zone = zoneAt(drag.x, drag.y);
    els.chain.classList.toggle('over', zone === 'chain');
    els.pool.classList.toggle('over', zone === 'pool');
    if (zone !== 'chain') {
      drag.slot.remove();
      drag.target = zone ? { zone, pos: pool.length } : null;
      return;
    }
    // 流れの中での差し込み位置: ポインタより下にある最初のブロックの前
    const links = [...els.chainList.children].filter((l) => l.classList.contains('link') && !l.hidden);
    // 差し込みスロット自身の高さで位置がずれないよう、スロットが無い状態の座標で判定する
    const slotShift = drag.slot.parentElement ? drag.slot.getBoundingClientRect().height + 8 : 0;
    let pos = links.length;
    for (let i = 0; i < links.length; i++) {
      const r = links[i].querySelector('.block').getBoundingClientRect();
      const afterSlot = slotShift && (drag.slot.compareDocumentPosition(links[i]) & Node.DOCUMENT_POSITION_FOLLOWING);
      const mid = r.top + r.height / 2 - (afterSlot ? slotShift : 0);
      if (drag.y < mid) { pos = i; break; }
    }
    pos = Math.max(fixedCount, pos);
    const ref = links[pos] || null;
    if (drag.slot.nextSibling !== ref || drag.slot.parentElement !== els.chainList) {
      els.chainList.insertBefore(drag.slot, ref);
    }
    drag.target = { zone: 'chain', pos };
  }

  function autoScroll() {
    if (!drag) return;
    const edge = 80;
    let dy = 0;
    if (drag.y < edge) dy = -Math.ceil((edge - drag.y) / 4);
    else if (drag.y > innerHeight - edge) dy = Math.ceil((drag.y - (innerHeight - edge)) / 4);
    if (dy) {
      window.scrollBy(0, dy);
      updateTarget();
    }
    drag.raf = requestAnimationFrame(autoScroll);
  }

  function endDrag(commit) {
    cancelAnimationFrame(drag.raf);
    drag.ghost.remove();
    drag.slot.remove();
    els.chain.classList.remove('over');
    els.pool.classList.remove('over');
    document.body.classList.remove('is-dragging');
    const t = drag.target;
    drag = null;
    if (commit && t && !(t.zone === 'pool' && press.zone === 'pool')) {
      move(press.zone, press.pos, t.zone, t.pos);
    } else {
      render();
    }
  }

  document.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', (e) => {
    if (!press || e.pointerId !== press.id) return;
    if (drag) endDrag(false);
    press = null;
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drag) { endDrag(false); press = null; }
  });

  // ---- 初期化 ----
  els.source.value = store.get(STORAGE_TEXT) || '';
  els.optHint.checked = store.get(STORAGE_HINT) === '1';
  updatePreview();
})();
