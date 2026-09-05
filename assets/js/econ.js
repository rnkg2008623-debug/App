(() => {
  "use strict";

  const sidebarEl = document.getElementById("econ-sidebar");
  const contentEl = document.getElementById("econ-content");
  if (!sidebarEl || !contentEl) return;

  /* ============================== Utilities ============================== */

  const SVG_NS = "http://www.w3.org/2000/svg";
  const VB_W = 440, VB_H = 380;
  const OX = 60, OY = 330;      // origin (Q=0, P=0) in SVG pixels
  const PW = 350, PH = 290;     // plot width/height in SVG pixels

  const toX = (q) => OX + (q / 100) * PW;
  const toY = (p) => OY - (p / 100) * PH;
  const fromX = (x) => ((x - OX) / PW) * 100;
  const fromY = (y) => ((OY - y) / PH) * 100;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const round0 = (n) => Math.round(n);

  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  let arrowMarkerReady = false;
  function ensureArrowMarker(svg) {
    if (arrowMarkerReady) return;
    const defs = svgEl("defs", {});
    const marker = svgEl("marker", { id: "econ-arrow", markerWidth: 8, markerHeight: 8, refX: 6, refY: 4, orient: "auto" });
    marker.appendChild(svgEl("path", { d: "M0,0 L8,4 L0,8 Z", fill: "#2b2a24" }));
    defs.appendChild(marker);
    svg.appendChild(defs);
    arrowMarkerReady = true;
  }

  function buildAxes(svg, xLabel, yLabel) {
    svg.appendChild(svgEl("line", {
      x1: OX, y1: OY, x2: OX + PW + 12, y2: OY,
      stroke: "#2b2a24", "stroke-width": 1.5, "marker-end": "url(#econ-arrow)",
    }));
    svg.appendChild(svgEl("line", {
      x1: OX, y1: OY, x2: OX, y2: OY - PH - 12,
      stroke: "#2b2a24", "stroke-width": 1.5, "marker-end": "url(#econ-arrow)",
    }));
    const xText = svgEl("text", { x: OX + PW + 16, y: OY + 5, "font-size": 13, fill: "#2b2a24" });
    xText.textContent = xLabel || "数量 Q";
    svg.appendChild(xText);
    const yText = svgEl("text", { x: OX - 6, y: OY - PH - 18, "font-size": 13, fill: "#2b2a24", "text-anchor": "end" });
    yText.textContent = yLabel || "価格 P";
    svg.appendChild(yText);
    const oText = svgEl("text", { x: OX - 14, y: OY + 16, "font-size": 12, fill: "#6b6a5c" });
    oText.textContent = "O";
    svg.appendChild(oText);
  }

  function lineIntersection(p1, p2, p3, p4) {
    const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (Math.abs(denom) < 1e-6) return null;
    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
    return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
  }

  function getSvgPoint(svg, clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    return pt.matrixTransform(ctm.inverse());
  }

  // `session` is a plain object owned by the caller (created once, outside the
  // per-render rebuild) so drag state survives the DOM being torn down and
  // rebuilt mid-drag (render() runs on every pointermove for live feedback,
  // which replaces hitEl — without this, pointer capture on the old, now
  // detached element would be silently lost after the first movement).
  function makeDraggable(svg, hitEl, axis, session, onDrag, onStart) {
    hitEl.classList.add("econ-draggable");
    if (session.active) {
      try { hitEl.setPointerCapture(session.pointerId); } catch (e) { /* pointer no longer active */ }
    }
    hitEl.addEventListener("pointerdown", (e) => {
      session.active = true;
      session.pointerId = e.pointerId;
      session.start = getSvgPoint(svg, e.clientX, e.clientY);
      if (onStart) onStart();
      hitEl.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    hitEl.addEventListener("pointermove", (e) => {
      if (!session.active || e.pointerId !== session.pointerId) return;
      const cur = getSvgPoint(svg, e.clientX, e.clientY);
      const dx = cur.x - session.start.x;
      const dy = cur.y - session.start.y;
      onDrag(axis === "horizontal" ? (dx / PW) * 100 : (-dy / PH) * 100);
    });
    hitEl.addEventListener("pointerup", (e) => { if (e.pointerId === session.pointerId) session.active = false; });
    hitEl.addEventListener("pointercancel", (e) => { if (e.pointerId === session.pointerId) session.active = false; });
  }

  function makeGraphSvg() {
    const svg = svgEl("svg", { viewBox: `0 0 ${VB_W} ${VB_H}`, class: "econ-graph-svg" });
    ensureArrowMarker(svg);
    return svg;
  }

  /* ============================== Terminology (Unit 2: Microeconomics) ============================== */

  const UNIT2_TERMS = [
    ["需要 (Demand)", "ある価格で消費者が購入しようとする財・サービスの量。価格が下がると需要量は増える（需要の法則）。"],
    ["供給 (Supply)", "ある価格で生産者が販売しようとする財・サービスの量。価格が上がると供給量は増える（供給の法則）。"],
    ["均衡価格・均衡数量 (Equilibrium price/quantity)", "需要量と供給量が一致する価格と数量。市場で自然に成立する価格・数量の組み合わせ。"],
    ["需要曲線のシフト (Shift in demand)", "価格以外の要因（所得・嗜好・関連財の価格・人口など）の変化によって需要曲線全体が左右に移動すること。"],
    ["供給曲線のシフト (Shift in supply)", "価格以外の要因（生産コスト・技術・税/補助金・生産者数など）の変化によって供給曲線全体が左右に移動すること。"],
    ["需要の価格弾力性 PED", "価格が1%変化したときに需要量が何%変化するかを表す指標。|PED|>1は弾力的、|PED|<1は非弾力的。"],
    ["供給の価格弾力性 PES", "価格が1%変化したときに供給量が何%変化するかを表す指標。生産の時間的余裕が大きいほど弾力的になりやすい。"],
    ["需要の所得弾力性 YED", "所得が1%変化したときに需要量が何%変化するかを表す指標。正なら正常財、負なら下級財。"],
    ["需要の交差弾力性 XED", "ある財の価格が1%変化したときに、別の財の需要量が何%変化するかを示す指標。正なら代替財、負なら補完財。"],
    ["消費者余剰 (Consumer surplus)", "消費者が支払ってもよいと考える価格と、実際に支払った価格との差の合計（需要曲線と価格線の間の面積）。"],
    ["生産者余剰 (Producer surplus)", "生産者が実際に受け取る価格と、最低限受け取りたい価格（供給曲線）との差の合計（供給曲線と価格線の間の面積）。"],
    ["市場の失敗 (Market failure)", "市場メカニズムが資源を効率的に配分できない状態。外部性・公共財・情報の非対称性などが原因となる。"],
    ["外部性 (Externality)", "ある経済活動が、取引の当事者以外の第三者に及ぼす便益・費用。正の外部性（便益）と負の外部性（費用）がある。"],
    ["負の生産の外部性", "生産活動が第三者に費用を与える externality（例：工場の公害）。社会的限界費用MSCが私的限界費用MPCを上回り、過剰生産が起こる。"],
    ["正の消費の外部性", "消費活動が第三者に便益を与える externality（例：教育、予防接種）。社会的限界便益MSBが私的限界便益MPBを上回り、過少消費が起こる。"],
    ["公共財 (Public goods)", "非排除性（対価を払わない人を排除できない）と非競合性（一人の消費が他人の消費を減らさない）を持つ財。市場では供給されにくい。"],
    ["価格の上限規制 (Price ceiling)", "政府が定める価格の上限。均衡価格より低く設定されると需要超過（不足）が発生する。"],
    ["価格の下限規制 (Price floor)", "政府が定める価格の下限。均衡価格より高く設定されると供給超過（余剰）が発生する。"],
    ["間接税 (Indirect tax)", "生産者に課される税で、供給曲線を左（上）にシフトさせる。従量税と従価税がある。税負担は消費者と生産者で分担される。"],
    ["補助金 (Subsidy)", "政府が生産者に支払う給付金で、供給曲線を右（下）にシフトさせ、価格の低下と数量の増加をもたらす。"],
    ["死荷重 (Deadweight loss)", "市場が効率的な水準で取引されないことによって失われる社会全体の余剰（税・規制・外部性・独占などによって発生）。"],
    ["完全競争 (Perfect competition)", "多数の売り手・買い手、同質財、自由な参入退出、完全情報を特徴とする市場構造。個々の企業はプライステイカー。"],
    ["独占 (Monopoly)", "単一の企業が市場全体を供給する市場構造。参入障壁が高く、企業は価格支配力を持つ（プライスメイカー）。"],
    ["寡占 (Oligopoly)", "少数の大企業が市場を支配する市場構造。企業間の相互依存性が強く、価格・数量の決定が互いの行動に影響される。"],
  ];

  /* ============================== Graph builder shared bits ============================== */

  function graphCard(title, desc) {
    const card = document.createElement("div");
    card.className = "econ-graph-card";
    const h3 = document.createElement("h3");
    h3.textContent = title;
    card.appendChild(h3);
    if (desc) {
      const p = document.createElement("p");
      p.className = "econ-graph-desc";
      p.textContent = desc;
      card.appendChild(p);
    }
    return card;
  }

  function controlsRow(card) {
    const row = document.createElement("div");
    row.className = "econ-graph-controls";
    card.appendChild(row);
    return row;
  }

  function resetButton(label, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-outline btn-sm";
    btn.textContent = label || "リセット";
    btn.addEventListener("click", onClick);
    return btn;
  }

  function explanationBox(card) {
    const box = document.createElement("div");
    box.className = "econ-explanation";
    card.appendChild(box);
    return box;
  }

  function eqDot(svg, x, y, labelText) {
    svg.appendChild(svgEl("circle", { cx: x, cy: y, r: 4.5, fill: "#2b2a24" }));
    svg.appendChild(svgEl("line", { x1: x, y1: y, x2: x, y2: OY, stroke: "#6b6a5c", "stroke-dasharray": "3,3" }));
    svg.appendChild(svgEl("line", { x1: OX, y1: y, x2: x, y2: y, stroke: "#6b6a5c", "stroke-dasharray": "3,3" }));
    if (labelText) {
      const t = svgEl("text", { x: x + 6, y: y - 8, "font-size": 11, fill: "#2b2a24" });
      t.textContent = labelText;
      svg.appendChild(t);
    }
  }

  /* ============================== Graph 1: Demand & Supply shift ============================== */

  function buildGraph1() {
    const card = graphCard(
      "① 需要・供給曲線のシフト",
      "D（需要曲線）または S（供給曲線）を左右にドラッグすると、均衡価格・均衡数量がどう変化するかを確認できます。"
    );
    const svg = makeGraphSvg();
    const wrap = document.createElement("div");
    wrap.className = "econ-graph-svg-wrap";
    wrap.appendChild(svg);
    card.appendChild(wrap);
    const explain = explanationBox(card);
    const row = controlsRow(card);
    card.insertBefore(row, wrap);

    const base = { d: { q1: 0, p1: 90, q2: 100, p2: 10 }, s: { q1: 0, p1: 10, q2: 100, p2: 90 } };
    const state = { dOffset: 0, sOffset: 0 };
    const dSession = { active: false, valueAtStart: 0 };
    const sSession = { active: false, valueAtStart: 0 };
    const origEq = solveEq(0, 0);

    function solveEq(dOff, sOff) {
      const d1 = { x: toX(base.d.q1 + dOff), y: toY(base.d.p1) };
      const d2 = { x: toX(base.d.q2 + dOff), y: toY(base.d.p2) };
      const s1 = { x: toX(base.s.q1 + sOff), y: toY(base.s.p1) };
      const s2 = { x: toX(base.s.q2 + sOff), y: toY(base.s.p2) };
      const pt = lineIntersection(d1, d2, s1, s2);
      if (!pt) return { q: 0, p: 0 };
      return { q: fromX(pt.x), p: fromY(pt.y) };
    }

    function render() {
      svg.innerHTML = "";
      ensureArrowMarker(svg);
      buildAxes(svg, "数量 Q", "価格 P");

      const dLine = svgEl("line", { x1: toX(base.d.q1 + state.dOffset), y1: toY(base.d.p1), x2: toX(base.d.q2 + state.dOffset), y2: toY(base.d.p2), stroke: "#3f5744", "stroke-width": 2.5 });
      const dHit = svgEl("line", { x1: toX(base.d.q1 + state.dOffset), y1: toY(base.d.p1), x2: toX(base.d.q2 + state.dOffset), y2: toY(base.d.p2), stroke: "transparent", "stroke-width": 18 });
      const sLine = svgEl("line", { x1: toX(base.s.q1 + state.sOffset), y1: toY(base.s.p1), x2: toX(base.s.q2 + state.sOffset), y2: toY(base.s.p2), stroke: "#b5602f", "stroke-width": 2.5 });
      const sHit = svgEl("line", { x1: toX(base.s.q1 + state.sOffset), y1: toY(base.s.p1), x2: toX(base.s.q2 + state.sOffset), y2: toY(base.s.p2), stroke: "transparent", "stroke-width": 18 });
      svg.appendChild(dLine); svg.appendChild(sLine); svg.appendChild(dHit); svg.appendChild(sHit);

      const dLabel = svgEl("text", { x: toX(base.d.q1 + state.dOffset) - 14, y: toY(base.d.p1) + 4, "font-size": 13, fill: "#3f5744", "font-weight": 700 });
      dLabel.textContent = state.dOffset ? "D₁" : "D";
      svg.appendChild(dLabel);
      const sLabel = svgEl("text", { x: toX(base.s.q2 + state.sOffset) + 6, y: toY(base.s.p2) + 4, "font-size": 13, fill: "#b5602f", "font-weight": 700 });
      sLabel.textContent = state.sOffset ? "S₁" : "S";
      svg.appendChild(sLabel);

      const eq = solveEq(state.dOffset, state.sOffset);
      eqDot(svg, toX(clamp(eq.q, -20, 120)), toY(clamp(eq.p, -20, 120)), `E (${round0(eq.q)}, ${round0(eq.p)})`);

      makeDraggable(svg, dHit, "horizontal", dSession,
        (dq) => { state.dOffset = clamp(round0(dSession.valueAtStart + dq), -55, 55); render(); },
        () => { dSession.valueAtStart = state.dOffset; });
      makeDraggable(svg, sHit, "horizontal", sSession,
        (dq) => { state.sOffset = clamp(round0(sSession.valueAtStart + dq), -55, 55); render(); },
        () => { sSession.valueAtStart = state.sOffset; });

      const parts = [];
      if (Math.round(state.dOffset) !== 0) parts.push(`需要曲線が${state.dOffset > 0 ? "右" : "左"}にシフト（D→D₁）`);
      if (Math.round(state.sOffset) !== 0) parts.push(`供給曲線が${state.sOffset > 0 ? "右" : "左"}にシフト（S→S₁）`);
      const lead = parts.length ? parts.join("、") + "した結果、" : "D・Sをドラッグしてシフトさせてみましょう。現在は初期状態（変化なし）です。";
      const priceDir = eq.p > origEq.p + 0.5 ? "上昇" : eq.p < origEq.p - 0.5 ? "下落" : "変化なし";
      const qtyDir = eq.q > origEq.q + 0.5 ? "増加" : eq.q < origEq.q - 0.5 ? "減少" : "変化なし";
      explain.innerHTML = `${lead}${parts.length ? `均衡価格は ${round0(origEq.p)} → <strong>${round0(eq.p)}</strong>（${priceDir}）、均衡数量は ${round0(origEq.q)} → <strong>${round0(eq.q)}</strong>（${qtyDir}）になりました。` : ""}`;
    }

    row.appendChild(resetButton("リセット", () => { state.dOffset = 0; state.sOffset = 0; dSession.valueAtStart = 0; sSession.valueAtStart = 0; render(); }));
    render();
    return card;
  }

  /* ============================== Graph 2: Price ceiling / floor ============================== */

  function buildGraph2() {
    const card = graphCard(
      "② 価格の上限規制・下限規制",
      "緑の水平線（規制価格）を上下にドラッグしてください。均衡価格より下げると「上限規制（不足）」、上げると「下限規制（余剰）」の状態になります。"
    );
    const svg = makeGraphSvg();
    const wrap = document.createElement("div");
    wrap.className = "econ-graph-svg-wrap";
    wrap.appendChild(svg);
    const row = controlsRow(card);
    card.appendChild(wrap);
    const explain = explanationBox(card);

    const D = { q1: 0, p1: 90, q2: 100, p2: 10 }; // p = 90 - 0.8q
    const S = { q1: 0, p1: 10, q2: 100, p2: 90 }; // p = 10 + 0.8q
    const eqP0 = 50, eqQ0 = 50;
    const qAtD = (p) => (90 - p) / 0.8;
    const qAtS = (p) => (p - 10) / 0.8;

    const state = { regPrice: 50 };
    const regSession = { active: false, valueAtStart: 50 };

    function render() {
      svg.innerHTML = "";
      ensureArrowMarker(svg);
      buildAxes(svg, "数量 Q", "価格 P");
      svg.appendChild(svgEl("line", { x1: toX(D.q1), y1: toY(D.p1), x2: toX(D.q2), y2: toY(D.p2), stroke: "#3f5744", "stroke-width": 2.5 }));
      svg.appendChild(svgEl("line", { x1: toX(S.q1), y1: toY(S.p1), x2: toX(S.q2), y2: toY(S.p2), stroke: "#b5602f", "stroke-width": 2.5 }));
      const dLabel = svgEl("text", { x: toX(D.q1) - 14, y: toY(D.p1) + 4, "font-size": 13, fill: "#3f5744", "font-weight": 700 }); dLabel.textContent = "D";
      const sLabel = svgEl("text", { x: toX(S.q2) + 6, y: toY(S.p2) + 4, "font-size": 13, fill: "#b5602f", "font-weight": 700 }); sLabel.textContent = "S";
      svg.appendChild(dLabel); svg.appendChild(sLabel);

      const qd = clamp(qAtD(state.regPrice), 0, 100);
      const qs = clamp(qAtS(state.regPrice), 0, 100);
      const y = toY(state.regPrice);
      const binding = Math.abs(state.regPrice - eqP0) > 1.5;

      if (binding) {
        const isCeiling = state.regPrice < eqP0;
        const [lo, hi] = isCeiling ? [qs, qd] : [qd, qs];
        svg.appendChild(svgEl("rect", { x: toX(lo), y: y - 5, width: Math.max(toX(hi) - toX(lo), 0), height: 10, fill: isCeiling ? "#a1402b" : "#a9821c", opacity: 0.35 }));
      }

      const regLine = svgEl("line", { x1: OX, y1: y, x2: OX + PW, y2: y, stroke: "#2f6f76", "stroke-width": 2.5, "stroke-dasharray": binding ? "0" : "5,4" });
      const regHit = svgEl("line", { x1: OX, y1: y, x2: OX + PW, y2: y, stroke: "transparent", "stroke-width": 18 });
      svg.appendChild(regLine); svg.appendChild(regHit);
      const regLabel = svgEl("text", { x: OX + PW + 16, y: y + 4, "font-size": 12, fill: "#2f6f76", "font-weight": 700 });
      regLabel.textContent = `規制価格 ${round0(state.regPrice)}`;
      svg.appendChild(regLabel);

      eqDot(svg, toX(eqQ0), toY(eqP0), `E (${eqQ0}, ${eqP0})`);

      makeDraggable(svg, regHit, "vertical", regSession,
        (dp) => { state.regPrice = clamp(round0(regSession.valueAtStart + dp), 5, 95); render(); },
        () => { regSession.valueAtStart = state.regPrice; });

      if (!binding) {
        explain.innerHTML = `規制価格 <strong>${round0(state.regPrice)}</strong> は均衡価格（${eqP0}）とほぼ同じなので、規制は効果を持ちません（non-binding）。市場は均衡どおり Q=${eqQ0} で取引されます。`;
      } else if (state.regPrice < eqP0) {
        const shortage = round0(qd - qs);
        explain.innerHTML = `これは<strong>価格の上限規制（Price Ceiling）</strong>です。規制価格 ${round0(state.regPrice)} では需要量 Qd=${round0(qd)} が供給量 Qs=${round0(qs)} を上回り、<strong>${shortage}の超過需要（不足）</strong>が発生します。価格メカニズムが働かないため、非価格的な配分方法（行列・配給など）が必要になり、闇市場が生まれる可能性もあります。`;
      } else {
        const surplus = round0(qs - qd);
        explain.innerHTML = `これは<strong>価格の下限規制（Price Floor）</strong>です。規制価格 ${round0(state.regPrice)} では供給量 Qs=${round0(qs)} が需要量 Qd=${round0(qd)} を上回り、<strong>${surplus}の超過供給（余剰）</strong>が発生します（例：農産物の支持価格、最低賃金）。政府が余剰を買い取る場合は財政負担が生じます。`;
      }
    }

    row.appendChild(resetButton("リセット", () => { state.regPrice = 50; regSession.valueAtStart = 50; render(); }));
    render();
    return card;
  }

  /* ============================== Graph 3: Indirect tax / subsidy ============================== */

  function buildGraph3() {
    const card = graphCard(
      "③ 間接税・補助金",
      "供給曲線 S を上にドラッグすると「従量税」、下にドラッグすると「補助金」を表します。税・補助金の負担がどう分配されるかを確認できます。"
    );
    const svg = makeGraphSvg();
    const wrap = document.createElement("div");
    wrap.className = "econ-graph-svg-wrap";
    wrap.appendChild(svg);
    const row = controlsRow(card);
    card.appendChild(wrap);
    const explain = explanationBox(card);

    const D = { q1: 0, p1: 90, q2: 100, p2: 10 }; // p = 90 - 0.8q
    const S = { q1: 0, p1: 10, q2: 100, p2: 90 }; // p = 10 + 0.8q
    const eqP0 = 50, eqQ0 = 50;
    const state = { t: 0 };
    const tSession = { active: false, valueAtStart: 0 };

    function render() {
      svg.innerHTML = "";
      ensureArrowMarker(svg);
      buildAxes(svg, "数量 Q", "価格 P");

      svg.appendChild(svgEl("line", { x1: toX(D.q1), y1: toY(D.p1), x2: toX(D.q2), y2: toY(D.p2), stroke: "#3f5744", "stroke-width": 2.5 }));
      const dLabel = svgEl("text", { x: toX(D.q1) - 14, y: toY(D.p1) + 4, "font-size": 13, fill: "#3f5744", "font-weight": 700 }); dLabel.textContent = "D";
      svg.appendChild(dLabel);

      svg.appendChild(svgEl("line", { x1: toX(S.q1), y1: toY(S.p1), x2: toX(S.q2), y2: toY(S.p2), stroke: "#c9b98a", "stroke-width": 2, "stroke-dasharray": "5,4" }));

      const t = state.t;
      const s1p = S.p1 + t, s2p = S.p2 + t;
      const sLine = svgEl("line", { x1: toX(S.q1), y1: toY(s1p), x2: toX(S.q2), y2: toY(s2p), stroke: "#b5602f", "stroke-width": 2.5 });
      const sHit = svgEl("line", { x1: toX(S.q1), y1: toY(s1p), x2: toX(S.q2), y2: toY(s2p), stroke: "transparent", "stroke-width": 18 });
      svg.appendChild(sLine); svg.appendChild(sHit);
      const sLabel = svgEl("text", { x: toX(S.q2) - 4, y: toY(s2p) - 8, "font-size": 12, fill: "#b5602f", "font-weight": 700, "text-anchor": "end" });
      sLabel.textContent = t !== 0 ? "S₁ (S+税/補助金)" : "S";
      svg.appendChild(sLabel);

      // new equilibrium: 90-0.8q = 10+t+0.8q  =>  q = (80-t)/1.6
      const q1 = clamp((80 - t) / 1.6, 0, 100);
      const p1 = 90 - 0.8 * q1;
      const producerReceives = p1 - t;

      if (Math.round(t) !== 0) {
        const topP = Math.max(p1, eqP0), botP = Math.min(p1, eqP0);
        svg.appendChild(svgEl("rect", { x: toX(0), y: toY(topP), width: toX(q1) - toX(0), height: toY(botP) - toY(topP), fill: "#3f5744", opacity: 0.18 }));
        const topP2 = Math.max(eqP0, producerReceives), botP2 = Math.min(eqP0, producerReceives);
        svg.appendChild(svgEl("rect", { x: toX(0), y: toY(topP2), width: toX(q1) - toX(0), height: toY(botP2) - toY(topP2), fill: "#b5602f", opacity: 0.18 }));
      }

      eqDot(svg, toX(eqQ0), toY(eqP0), `元のE (${eqQ0}, ${eqP0})`);
      if (Math.round(t) !== 0) {
        svg.appendChild(svgEl("circle", { cx: toX(q1), cy: toY(p1), r: 4.5, fill: "#2b2a24" }));
        const lbl = svgEl("text", { x: toX(q1) + 6, y: toY(p1) - 8, "font-size": 11, fill: "#2b2a24" });
        lbl.textContent = `新E (${round0(q1)}, ${round0(p1)})`;
        svg.appendChild(lbl);
      }

      makeDraggable(svg, sHit, "vertical", tSession,
        (dp) => { state.t = clamp(round0(tSession.valueAtStart + dp), -9, 9); render(); },
        () => { tSession.valueAtStart = state.t; });

      if (Math.round(t) === 0) {
        explain.innerHTML = "供給曲線 S を上下にドラッグして、従量税（上）または補助金（下）を課してみましょう。";
      } else if (t > 0) {
        const consumerShare = round0((p1 - eqP0) * q1);
        const producerShare = round0((eqP0 - producerReceives) * q1);
        const revenue = consumerShare + producerShare;
        explain.innerHTML = `1単位あたり <strong>${round0(t)}</strong> の従量税が課されました。均衡価格は ${eqP0} → <strong>${round0(p1)}</strong>（消費者が支払う価格）に上昇し、生産者の手取り価格は <strong>${round0(producerReceives)}</strong> に下落、数量は ${eqQ0} → <strong>${round0(q1)}</strong> に減少しました。税収は約 <strong>${revenue}</strong>（消費者負担 ${consumerShare} ＋ 生産者負担 ${producerShare}）で、生産量の減少分だけ死荷重（Deadweight Loss）が発生しています。`;
      } else {
        const spending = round0(Math.abs(t) * q1);
        explain.innerHTML = `1単位あたり <strong>${round0(Math.abs(t))}</strong> の補助金が支給されました。消費者が支払う価格は ${eqP0} → <strong>${round0(p1)}</strong> に下落し、生産者の手取りは <strong>${round0(producerReceives)}</strong> に上昇、数量は ${eqQ0} → <strong>${round0(q1)}</strong> に増加しました。政府支出は約 <strong>${spending}</strong> です。`;
      }
    }

    row.appendChild(resetButton("リセット", () => { state.t = 0; tSession.valueAtStart = 0; render(); }));
    render();
    return card;
  }

  /* ============================== Graph 4: Externalities ============================== */

  function buildGraph4() {
    const card = graphCard(
      "④ 外部性（負の生産の外部性／正の消費の外部性）",
      "上のボタンでモードを切り替え、緑の線（MSC または MSB）を上下にドラッグして外部性の大きさを変えてみましょう。"
    );
    const svg = makeGraphSvg();
    const wrap = document.createElement("div");
    wrap.className = "econ-graph-svg-wrap";
    wrap.appendChild(svg);
    const row = controlsRow(card);
    card.appendChild(wrap);
    const explain = explanationBox(card);

    const state = { mode: "negative", ext: 20 };
    const extSession = { active: false, valueAtStart: 20 };

    const negBtn = document.createElement("button");
    negBtn.type = "button";
    const posBtn = document.createElement("button");
    posBtn.type = "button";
    function refreshModeButtons() {
      negBtn.className = "btn btn-sm " + (state.mode === "negative" ? "btn-primary" : "btn-outline");
      posBtn.className = "btn btn-sm " + (state.mode === "positive" ? "btn-primary" : "btn-outline");
    }
    negBtn.textContent = "負の生産の外部性";
    posBtn.textContent = "正の消費の外部性";
    negBtn.addEventListener("click", () => { state.mode = "negative"; state.ext = 20; extSession.valueAtStart = 20; refreshModeButtons(); render(); });
    posBtn.addEventListener("click", () => { state.mode = "positive"; state.ext = 20; extSession.valueAtStart = 20; refreshModeButtons(); render(); });
    row.appendChild(negBtn);
    row.appendChild(posBtn);
    refreshModeButtons();

    // Baseline private lines (shared): private demand p = 90 - 0.8q, private supply p = 10 + 0.8q
    const PD = { q1: 0, p1: 90, q2: 100, p2: 10 };
    const PS = { q1: 0, p1: 10, q2: 100, p2: 90 };
    const marketP = 50, marketQ = 50;

    function render() {
      svg.innerHTML = "";
      ensureArrowMarker(svg);
      buildAxes(svg, "数量 Q", "価格 P");

      svg.appendChild(svgEl("line", { x1: toX(PD.q1), y1: toY(PD.p1), x2: toX(PD.q2), y2: toY(PD.p2), stroke: "#3f5744", "stroke-width": 2.5 }));
      svg.appendChild(svgEl("line", { x1: toX(PS.q1), y1: toY(PS.p1), x2: toX(PS.q2), y2: toY(PS.p2), stroke: "#b5602f", "stroke-width": 2.5 }));

      const ext = state.ext;
      let qOpt, pOpt, socialLine, socialHit, triangle;

      if (state.mode === "negative") {
        // MSC = PS + ext (vertical shift up). Social optimum = D ∩ MSC.
        const dLabel = svgEl("text", { x: toX(PD.q1) - 14, y: toY(PD.p1) + 4, "font-size": 13, fill: "#3f5744", "font-weight": 700 }); dLabel.textContent = "D = MSB = MPB";
        const sLabel = svgEl("text", { x: toX(PS.q2) - 4, y: toY(PS.p2) - 8, "font-size": 12, fill: "#b5602f", "font-weight": 700, "text-anchor": "end" }); sLabel.textContent = "S = MPC";
        svg.appendChild(dLabel); svg.appendChild(sLabel);

        const msc1p = PS.p1 + ext, msc2p = PS.p2 + ext;
        socialLine = svgEl("line", { x1: toX(PS.q1), y1: toY(msc1p), x2: toX(PS.q2), y2: toY(msc2p), stroke: "#2f6f76", "stroke-width": 2.5 });
        socialHit = svgEl("line", { x1: toX(PS.q1), y1: toY(msc1p), x2: toX(PS.q2), y2: toY(msc2p), stroke: "transparent", "stroke-width": 18 });

        qOpt = clamp((80 - ext) / 1.6, 0, 100);
        pOpt = 90 - 0.8 * qOpt;
        const mscAtMarket = 10 + ext + 0.8 * marketQ;
        triangle = [{ q: qOpt, p: pOpt }, { q: marketQ, p: marketP }, { q: marketQ, p: mscAtMarket }];

        const mscLabelQ = 62, mscLabelP = 10 + ext + 0.8 * mscLabelQ;
        const mscLabel = svgEl("text", { x: toX(mscLabelQ), y: toY(mscLabelP) - 8, "font-size": 12, fill: "#2f6f76", "font-weight": 700 });
        mscLabel.textContent = "MSC";
        svg.appendChild(socialLine); svg.appendChild(mscLabel); svg.appendChild(socialHit);
      } else {
        // MSB = PD + ext (vertical shift up). Social optimum = MSB ∩ S.
        const dLabel = svgEl("text", { x: toX(PD.q1) - 14, y: toY(PD.p1) + 4, "font-size": 13, fill: "#3f5744", "font-weight": 700 }); dLabel.textContent = "D = MPB";
        const sLabel = svgEl("text", { x: toX(PS.q2) - 4, y: toY(PS.p2) - 8, "font-size": 12, fill: "#b5602f", "font-weight": 700, "text-anchor": "end" }); sLabel.textContent = "S = MSC = MPC";
        svg.appendChild(dLabel); svg.appendChild(sLabel);

        const msb1p = PD.p1 + ext, msb2p = PD.p2 + ext;
        socialLine = svgEl("line", { x1: toX(PD.q1), y1: toY(msb1p), x2: toX(PD.q2), y2: toY(msb2p), stroke: "#2f6f76", "stroke-width": 2.5 });
        socialHit = svgEl("line", { x1: toX(PD.q1), y1: toY(msb1p), x2: toX(PD.q2), y2: toY(msb2p), stroke: "transparent", "stroke-width": 18 });

        qOpt = clamp((80 + ext) / 1.6, 0, 100);
        pOpt = 10 + 0.8 * qOpt;
        const msbAtMarket = 90 + ext - 0.8 * marketQ;
        triangle = [{ q: marketQ, p: marketP }, { q: marketQ, p: msbAtMarket }, { q: qOpt, p: pOpt }];

        const msbLabelQ = 20, msbLabelP = 90 + ext - 0.8 * msbLabelQ;
        const msbLabel = svgEl("text", { x: toX(msbLabelQ) - 6, y: toY(msbLabelP) - 8, "font-size": 12, fill: "#2f6f76", "font-weight": 700, "text-anchor": "end" });
        msbLabel.textContent = "MSB";
        svg.appendChild(socialLine); svg.appendChild(msbLabel); svg.appendChild(socialHit);
      }

      const pointsAttr = triangle.map((pt) => `${toX(pt.q)},${toY(pt.p)}`).join(" ");
      svg.appendChild(svgEl("polygon", { points: pointsAttr, fill: "#a1402b", opacity: 0.3 }));

      eqDot(svg, toX(marketQ), toY(marketP), `市場均衡 (${marketQ}, ${marketP})`);
      svg.appendChild(svgEl("circle", { cx: toX(qOpt), cy: toY(pOpt), r: 4.5, fill: "#2f6f76" }));
      const optLabel = svgEl("text", { x: toX(qOpt) + 6, y: toY(pOpt) - 8, "font-size": 11, fill: "#2f6f76" });
      optLabel.textContent = `社会的最適 (${round0(qOpt)}, ${round0(pOpt)})`;
      svg.appendChild(optLabel);

      makeDraggable(svg, socialHit, "vertical", extSession,
        (dp) => { state.ext = clamp(round0(extSession.valueAtStart + dp), 0, 45); render(); },
        () => { extSession.valueAtStart = state.ext; });

      if (state.mode === "negative") {
        const overProd = round0(marketQ - qOpt);
        explain.innerHTML = `外部費用（1単位あたり <strong>${round0(ext)}</strong>）により、社会的限界費用 MSC が私的限界費用 MPC を上回っています。市場は Q=${marketQ} まで生産しますが、社会的に望ましい水準は Q=<strong>${round0(qOpt)}</strong> であり、<strong>${overProd}の過剰生産</strong>と赤色の死荷重（厚生損失）が発生しています。`;
      } else {
        const underCons = round0(qOpt - marketQ);
        explain.innerHTML = `外部便益（1単位あたり <strong>${round0(ext)}</strong>）により、社会的限界便益 MSB が私的限界便益 MPB を上回っています。市場は Q=${marketQ} までしか消費されませんが、社会的に望ましい水準は Q=<strong>${round0(qOpt)}</strong> であり、<strong>${underCons}の過少消費</strong>と赤色の死荷重（厚生損失）が発生しています。`;
      }
    }

    row.appendChild(resetButton("リセット", () => { state.ext = 20; extSession.valueAtStart = 20; render(); }));
    render();
    return card;
  }

  /* ============================== Unit assembly ============================== */

  function renderUnit2() {
    contentEl.innerHTML = "";

    const head = document.createElement("div");
    head.className = "econ-section";
    head.innerHTML = `<h2>Unit 2: Microeconomics（ミクロ経済学）</h2><p class="panel-sub">IBDP Economics SL の Unit 2 で扱う基本用語と、代表的なグラフをまとめています。グラフは実際にドラッグして動かせます。</p>`;
    contentEl.appendChild(head);

    const termSection = document.createElement("div");
    termSection.className = "econ-section";
    const dl = document.createElement("dl");
    dl.className = "econ-glossary";
    UNIT2_TERMS.forEach(([term, def]) => {
      const item = document.createElement("div");
      item.className = "econ-term";
      const dt = document.createElement("dt"); dt.textContent = term;
      const dd = document.createElement("dd"); dd.textContent = def;
      item.appendChild(dt); item.appendChild(dd);
      dl.appendChild(item);
    });
    termSection.innerHTML = "<h2>用語集 (Terminology)</h2>";
    termSection.appendChild(dl);
    contentEl.appendChild(termSection);

    const graphSection = document.createElement("div");
    graphSection.className = "econ-section";
    graphSection.innerHTML = "<h2>インタラクティブ・グラフ (Graphs)</h2>";
    graphSection.appendChild(buildGraph1());
    graphSection.appendChild(buildGraph2());
    graphSection.appendChild(buildGraph3());
    graphSection.appendChild(buildGraph4());
    contentEl.appendChild(graphSection);
  }

  /* ============================== Sidebar / navigation ============================== */

  const SUBJECTS = [
    {
      id: "economics",
      name: "経済学",
      units: [
        { id: "unit2", name: "Unit 2: マイクロ経済", ready: true },
        { id: "unit3", name: "Unit 3: マクロ経済", ready: false },
        { id: "unit4", name: "Unit 4: グローバル経済", ready: false },
      ],
    },
  ];

  let expandedSubject = "economics";
  let activeUnit = null;

  function renderSidebar() {
    sidebarEl.innerHTML = "";
    SUBJECTS.forEach((subject) => {
      const isExpanded = expandedSubject === subject.id;
      const subjBtn = document.createElement("button");
      subjBtn.type = "button";
      subjBtn.className = "econ-subject-btn";
      subjBtn.innerHTML = `<span>📘 ${subject.name}</span><span>${isExpanded ? "▾" : "▸"}</span>`;
      subjBtn.addEventListener("click", () => {
        expandedSubject = isExpanded ? null : subject.id;
        renderSidebar();
      });
      sidebarEl.appendChild(subjBtn);

      if (isExpanded) {
        const unitsWrap = document.createElement("div");
        unitsWrap.className = "econ-units";
        subject.units.forEach((unit) => {
          const unitBtn = document.createElement("button");
          unitBtn.type = "button";
          unitBtn.className = "econ-unit-btn" + (activeUnit === unit.id ? " is-active" : "") + (!unit.ready ? " is-disabled" : "");
          unitBtn.textContent = unit.name + (unit.ready ? "" : "（準備中）");
          unitBtn.addEventListener("click", () => {
            activeUnit = unit.id;
            renderSidebar();
            renderContent();
          });
          unitsWrap.appendChild(unitBtn);
        });
        sidebarEl.appendChild(unitsWrap);
      }
    });
  }

  function renderContent() {
    if (activeUnit === "unit2") {
      renderUnit2();
    } else if (activeUnit) {
      contentEl.innerHTML = '<div class="econ-placeholder">このユニットは準備中です。</div>';
    } else {
      contentEl.innerHTML = '<div class="econ-placeholder">左のメニューから「経済学」→ ユニットを選んでください。</div>';
    }
  }

  renderSidebar();
  renderContent();
})();
