(() => {
  "use strict";

  /* ============================== Storage ============================== */

  const STORAGE_KEYS = { subjects: "sn_subjects", todos: "sn_todos", videos: "sn_videos" };
  const SUBJECT_COLORS = ["#3f5744", "#b5602f", "#a9821c", "#3f6b4a", "#6b5b95", "#2f6f76"];

  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2));

  const Store = {
    load(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    save(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },
  };

  let subjects = Store.load(STORAGE_KEYS.subjects, []);
  let todos = Store.load(STORAGE_KEYS.todos, []);
  let videos = Store.load(STORAGE_KEYS.videos, null);

  const saveSubjects = () => Store.save(STORAGE_KEYS.subjects, subjects);
  const saveTodos = () => Store.save(STORAGE_KEYS.todos, todos);
  const saveVideos = () => Store.save(STORAGE_KEYS.videos, videos);

  /* ============================== Tabs ============================== */

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => { b.classList.remove("is-active"); b.setAttribute("aria-selected", "false"); });
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("is-active"));
      btn.classList.add("is-active");
      btn.setAttribute("aria-selected", "true");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("is-active");
      if (btn.dataset.tab === "quiz") renderQuizSetup();
      if (btn.dataset.tab === "calendar" && openDayKey === null) renderCalendarGrid();
      if (btn.dataset.tab === "videos" && !videoGridRendered) renderVideoGrid();
    });
  });

  /* ============================== Materials ============================== */

  const subjectListEl = document.getElementById("subject-list");
  const subjectDetailEl = document.getElementById("subject-detail");
  let activeSubjectId = null;

  function subjectProgress(subject) {
    if (!subject.sections.length) return 0;
    const mastered = subject.sections.filter((s) => s.mastered).length;
    return Math.round((mastered / subject.sections.length) * 100);
  }

  function renderSubjectList() {
    subjectListEl.innerHTML = "";
    if (!subjects.length) {
      subjectListEl.innerHTML = '<p class="panel-sub">まだ教科がありません。「教科を追加」または「解説ファイルを取り込む」から始めましょう。</p>';
      return;
    }
    subjects.forEach((subject) => {
      const card = document.createElement("div");
      card.className = "subject-card";
      card.style.setProperty("--card-color", subject.color);
      const pct = subjectProgress(subject);
      card.innerHTML = `
        <h3>${escapeHtml(subject.name)}</h3>
        <div class="meta">${subject.sections.length} セクション</div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%; background:${subject.color}"></div></div>
        <div class="progress-text">習得度 ${pct}%</div>
      `;
      card.addEventListener("click", () => openSubject(subject.id));
      subjectListEl.appendChild(card);
    });
  }

  function openSubject(id) {
    activeSubjectId = id;
    subjectListEl.classList.add("hidden");
    document.querySelector("#tab-materials .panel-head").classList.add("hidden");
    subjectDetailEl.classList.remove("hidden");
    renderSubjectDetail();
  }

  document.getElementById("btn-back-subjects").addEventListener("click", () => {
    activeSubjectId = null;
    subjectDetailEl.classList.add("hidden");
    document.querySelector("#tab-materials .panel-head").classList.remove("hidden");
    subjectListEl.classList.remove("hidden");
    renderSubjectList();
  });

  function renderSubjectDetail() {
    const subject = subjects.find((s) => s.id === activeSubjectId);
    if (!subject) return;
    document.getElementById("detail-subject-name").textContent = subject.name;
    const pct = subjectProgress(subject);
    document.getElementById("detail-progress-bar").style.width = pct + "%";
    document.getElementById("detail-progress-bar").style.background = subject.color;
    document.getElementById("detail-progress-text").textContent = `習得度 ${pct}%（${subject.sections.filter(s=>s.mastered).length}/${subject.sections.length}）`;

    const listEl = document.getElementById("section-list");
    listEl.innerHTML = "";
    if (!subject.sections.length) {
      listEl.innerHTML = '<p class="panel-sub">このセクションにはまだ内容がありません。解説ファイルを取り込んでください。</p>';
      return;
    }
    subject.sections.forEach((section) => {
      const card = document.createElement("div");
      card.className = "section-card";
      card.innerHTML = `
        <div class="section-card-head">
          <h4>${escapeHtml(section.title)}</h4>
          <span>▾</span>
        </div>
        <div class="section-card-tags">${section.tags.map((t) => `<span class="tag-chip">${escapeHtml(t)}</span>`).join("")}</div>
        <div class="section-card-body">${escapeHtml(section.content)}</div>
        <div class="section-card-actions">
          <label class="section-master-toggle">
            <input type="checkbox" ${section.mastered ? "checked" : ""} data-role="mastered"> 習得済み
          </label>
          <button class="btn-danger-ghost" data-role="delete">削除</button>
        </div>
      `;
      card.querySelector(".section-card-head").addEventListener("click", () => card.classList.toggle("is-open"));
      card.querySelector('[data-role="mastered"]').addEventListener("click", (e) => {
        e.stopPropagation();
        section.mastered = e.target.checked;
        saveSubjects();
        renderSubjectDetail();
      });
      card.querySelector('[data-role="delete"]').addEventListener("click", (e) => {
        e.stopPropagation();
        if (!confirm(`「${section.title}」を削除しますか？`)) return;
        subject.sections = subject.sections.filter((s) => s.id !== section.id);
        saveSubjects();
        renderSubjectDetail();
      });
      listEl.appendChild(card);
    });
  }

  document.getElementById("btn-new-subject").addEventListener("click", () => {
    const name = prompt("新しい教科名を入力してください");
    if (!name || !name.trim()) return;
    subjects.push({ id: uid(), name: name.trim(), color: SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length], sections: [] });
    saveSubjects();
    renderSubjectList();
  });

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ============================== Import / Allocate ============================== */

  const importModal = document.getElementById("import-modal");
  const importTextarea = document.getElementById("import-textarea");
  const importFile = document.getElementById("import-file");
  const importPreview = document.getElementById("import-preview");
  const importPreviewList = document.getElementById("import-preview-list");
  let parsedSections = [];

  document.getElementById("btn-import").addEventListener("click", () => {
    importModal.classList.remove("hidden");
    importPreview.classList.add("hidden");
    importTextarea.value = "";
    importFile.value = "";
  });
  document.getElementById("btn-close-import").addEventListener("click", () => importModal.classList.add("hidden"));
  importModal.addEventListener("click", (e) => { if (e.target === importModal) importModal.classList.add("hidden"); });

  const PDFJS_VERSION = "6.3.289";
  const PDFJS_BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/`;
  let pdfjsLibPromise = null;

  function loadPdfJs() {
    if (!pdfjsLibPromise) {
      pdfjsLibPromise = import(/* webpackIgnore: true */ PDFJS_BASE + "pdf.min.mjs").then((lib) => {
        lib.GlobalWorkerOptions.workerSrc = PDFJS_BASE + "pdf.worker.min.mjs";
        return lib;
      });
    }
    return pdfjsLibPromise;
  }

  async function extractTextFromPdf(file) {
    const pdfjsLib = await loadPdfJs();
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const sectionTexts = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      let raw = "";
      textContent.items.forEach((item) => { raw += item.str + (item.hasEOL ? "\n" : " "); });
      const lines = raw.split("\n").map((l) => l.replace(/[ \t]+/g, " ").trim()).filter(Boolean);
      if (!lines.length) continue;
      const firstLine = lines[0];
      const looksLikeHeading = firstLine.length <= 40 && !/[。.!?]$/.test(firstLine);
      const title = looksLikeHeading ? firstLine : `ページ${i}`;
      const bodyLines = looksLikeHeading ? lines.slice(1) : lines;
      sectionTexts.push(`# ${title}\n${bodyLines.join("\n")}`);
    }
    return sectionTexts.join("\n\n");
  }

  importFile.addEventListener("change", () => {
    const file = importFile.files[0];
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      importTextarea.disabled = true;
      importTextarea.value = "PDFを解析中です…";
      extractTextFromPdf(file)
        .then((text) => { importTextarea.value = text.trim() || "(このPDFからはテキストを抽出できませんでした)"; })
        .catch((err) => {
          console.error(err);
          importTextarea.value = "";
          alert("PDFの読み込みに失敗しました。文字を選択できないスキャン画像のみのPDFには対応していません。また、この機能はpdf.jsライブラリをCDNから読み込むためインターネット接続が必要です。");
        })
        .finally(() => { importTextarea.disabled = false; });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { importTextarea.value = reader.result; };
    reader.readAsText(file);
  });

  const TERM_LINE_RE = /^\s*[-*・]?\s*([^\s:：][^:：\n]{0,38})[:：]\s*(.+)$/;

  function parseExplanationText(raw) {
    const text = raw.replace(/\r\n/g, "\n").trim();
    if (!text) return [];
    const lines = text.split("\n");
    const chunks = [];
    let current = { title: null, lines: [] };
    lines.forEach((line) => {
      const headerMatch = line.match(/^#{1,6}\s+(.+)$/);
      if (headerMatch) {
        if (current.title !== null || current.lines.some((l) => l.trim())) chunks.push(current);
        current = { title: headerMatch[1].trim(), lines: [] };
      } else {
        current.lines.push(line);
      }
    });
    if (current.title !== null || current.lines.some((l) => l.trim())) chunks.push(current);

    return chunks.map((chunk, idx) => {
      const content = chunk.lines.join("\n").trim();
      const terms = [];
      chunk.lines.forEach((line) => {
        const m = line.match(TERM_LINE_RE);
        if (m) terms.push({ term: m[1].trim(), definition: m[2].trim() });
      });
      return {
        title: chunk.title || `セクション${idx + 1}`,
        content: content || "(本文なし)",
        terms,
      };
    });
  }

  document.getElementById("btn-parse-import").addEventListener("click", () => {
    parsedSections = parseExplanationText(importTextarea.value);
    if (!parsedSections.length) {
      alert("テキストが空、または解析できませんでした。");
      return;
    }
    renderImportPreview();
  });

  function renderImportPreview() {
    importPreview.classList.remove("hidden");
    importPreviewList.innerHTML = "";
    const hasSubjects = subjects.length > 0;
    parsedSections.forEach((sec, idx) => {
      const row = document.createElement("div");
      row.className = "import-preview-item";
      const subjectOptions = subjects.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
      row.innerHTML = `
        <div class="import-preview-item-row">
          <input type="checkbox" data-role="include" checked>
          <input type="text" data-role="title" value="${escapeHtml(sec.title)}">
          <select data-role="subject">
            ${subjectOptions}
            <option value="__new__" ${hasSubjects ? "" : "selected"}>＋ 新規教科を作成</option>
          </select>
        </div>
        <div class="import-preview-item-row">
          <input type="text" data-role="new-subject-name" placeholder="新しい教科名" class="${hasSubjects ? "hidden" : ""}">
          <input type="text" data-role="tags" placeholder="タグ（カンマ区切り）">
        </div>
        <div class="import-preview-item-preview">${escapeHtml(sec.content.slice(0, 200))}${sec.content.length > 200 ? "…" : ""}${sec.terms.length ? `\n\n（クイズ用語 ${sec.terms.length} 件を検出）` : ""}</div>
      `;
      row.dataset.index = idx;
      const subjectSelect = row.querySelector('[data-role="subject"]');
      const newNameInput = row.querySelector('[data-role="new-subject-name"]');
      subjectSelect.addEventListener("change", () => {
        newNameInput.classList.toggle("hidden", subjectSelect.value !== "__new__");
      });
      importPreviewList.appendChild(row);
    });
  }

  document.getElementById("btn-confirm-import").addEventListener("click", () => {
    const rows = importPreviewList.querySelectorAll(".import-preview-item");
    let addedCount = 0;
    const newSubjectsByName = new Map();
    let skippedNoName = 0;
    rows.forEach((row) => {
      const idx = Number(row.dataset.index);
      const sec = parsedSections[idx];
      const include = row.querySelector('[data-role="include"]').checked;
      if (!include) return;
      const title = row.querySelector('[data-role="title"]').value.trim() || sec.title;
      const tagsRaw = row.querySelector('[data-role="tags"]').value.trim();
      const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];
      let subjectId = row.querySelector('[data-role="subject"]').value;

      if (subjectId === "__new__") {
        const rawName = row.querySelector('[data-role="new-subject-name"]').value.trim();
        if (!rawName) { skippedNoName++; return; }
        if (newSubjectsByName.has(rawName)) {
          subjectId = newSubjectsByName.get(rawName).id;
        } else {
          const newSubject = { id: uid(), name: rawName, color: SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length], sections: [] };
          subjects.push(newSubject);
          newSubjectsByName.set(rawName, newSubject);
          subjectId = newSubject.id;
        }
      }
      const targetSubject = subjects.find((s) => s.id === subjectId);
      if (!targetSubject) return;
      targetSubject.sections.push({
        id: uid(),
        title,
        content: sec.content,
        tags,
        terms: sec.terms,
        mastered: false,
      });
      addedCount++;
    });
    saveSubjects();
    renderSubjectList();
    importModal.classList.add("hidden");
    if (skippedNoName) alert(`新規教科名が未入力のため ${skippedNoName} 件をスキップしました。\n${addedCount} 件のセクションを取り込みました。`);
    else if (addedCount) alert(`${addedCount} 件のセクションを取り込みました。`);
  });

  /* ============================== Todo ============================== */

  const todoForm = document.getElementById("todo-form");
  const todoListEl = document.getElementById("todo-list");
  const todoTagFilter = document.getElementById("todo-tag-filter");

  todoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("todo-title").value.trim();
    if (!title) return;
    const tagsRaw = document.getElementById("todo-tags").value.trim();
    const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const minutes = Number(document.getElementById("todo-minutes").value) || 0;
    const date = document.getElementById("todo-date").value || "";
    const startTime = document.getElementById("todo-start-time").value || "";
    todos.push({ id: uid(), title, tags, minutes, date, startTime, done: false, createdAt: Date.now() });
    saveTodos();
    todoForm.reset();
    refreshAfterTodoChange();
  });

  todoTagFilter.addEventListener("change", renderTodos);

  function renderTodos() {
    const allTags = Array.from(new Set(todos.flatMap((t) => t.tags))).sort();
    const currentFilter = todoTagFilter.value;
    todoTagFilter.innerHTML = '<option value="">すべて</option>' + allTags.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
    todoTagFilter.value = allTags.includes(currentFilter) ? currentFilter : "";

    const filtered = todoTagFilter.value ? todos.filter((t) => t.tags.includes(todoTagFilter.value)) : todos;

    todoListEl.innerHTML = "";
    if (!filtered.length) {
      todoListEl.innerHTML = '<p class="panel-sub">Todoはまだありません。</p>';
    } else {
      filtered.slice().sort((a, b) => a.done - b.done || b.createdAt - a.createdAt).forEach((todo) => {
        const li = document.createElement("li");
        li.className = "todo-item" + (todo.done ? " is-done" : "");
        li.innerHTML = `
          <input type="checkbox" ${todo.done ? "checked" : ""} data-role="toggle">
          <div class="todo-main">
            <div class="todo-title">${escapeHtml(todo.title)}</div>
            <div class="todo-meta">
              ${scheduleLabel(todo) ? `<span class="todo-schedule">📅 ${scheduleLabel(todo)}</span>` : ""}
              ${todo.minutes ? `<span>⏱ ${todo.minutes}分</span>` : ""}
              ${todo.tags.map((t) => `<span class="tag-chip">${escapeHtml(t)}</span>`).join("")}
            </div>
          </div>
          <button class="btn-danger-ghost" data-role="delete">削除</button>
        `;
        li.querySelector('[data-role="toggle"]').addEventListener("change", (e) => {
          todo.done = e.target.checked;
          saveTodos();
          refreshAfterTodoChange();
        });
        li.querySelector('[data-role="delete"]').addEventListener("click", () => {
          todos = todos.filter((t) => t.id !== todo.id);
          saveTodos();
          refreshAfterTodoChange();
        });
        li.querySelector(".todo-main").addEventListener("click", () => openEditTodoModal(todo.id));
        todoListEl.appendChild(li);
      });
    }

    document.getElementById("todo-stat-total").textContent = `合計 ${todos.length} 件`;
    document.getElementById("todo-stat-done").textContent = `完了 ${todos.filter((t) => t.done).length} 件`;
    document.getElementById("todo-stat-minutes").textContent = `見積もり合計 ${todos.reduce((sum, t) => sum + (t.minutes || 0), 0)} 分`;
  }

  /* ============================== Calendar ============================== */

  const pad2 = (n) => String(n).padStart(2, "0");
  const dateKeyOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayKey = dateKeyOf(new Date());

  function timeToMinutes(hhmm) {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }
  function minutesToTime(total) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${pad2(h)}:${pad2(m)}`;
  }
  function scheduleLabel(todo) {
    if (!todo.date) return "";
    const md = todo.date.slice(5).replace("-", "/");
    if (!todo.startTime) return md;
    const startMin = timeToMinutes(todo.startTime);
    const endLabel = todo.minutes ? minutesToTime(startMin + todo.minutes) : null;
    return endLabel ? `${md} ${todo.startTime}-${endLabel}` : `${md} ${todo.startTime}〜`;
  }

  let calendarViewDate = new Date();
  calendarViewDate.setDate(1);
  let openDayKey = null;

  const calendarViewEl = document.getElementById("calendar-view");
  const calendarGridEl = document.getElementById("calendar-grid");
  const calendarLabelEl = document.getElementById("calendar-label");
  const dayScheduleEl = document.getElementById("day-schedule");

  function renderCalendarGrid() {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    calendarLabelEl.textContent = `${year}年 ${month + 1}月`;

    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const todosByDate = {};
    todos.forEach((t) => {
      if (!t.date) return;
      (todosByDate[t.date] = todosByDate[t.date] || []).push(t);
    });

    calendarGridEl.innerHTML = "";
    for (let i = 0; i < firstWeekday; i++) {
      const filler = document.createElement("div");
      filler.className = "calendar-day is-empty";
      calendarGridEl.appendChild(filler);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${pad2(month + 1)}-${pad2(day)}`;
      const dayTodos = todosByDate[dateKey] || [];
      const totalMin = dayTodos.reduce((sum, t) => sum + (t.minutes || 0), 0);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "calendar-day" + (dateKey === todayKey ? " is-today" : "") + (dayTodos.length ? " has-tasks" : "");
      cell.innerHTML = `
        <span class="cal-day-num">${day}</span>
        ${dayTodos.length ? `<span class="cal-day-badge">${dayTodos.length}件 / ${totalMin}分</span>` : ""}
      `;
      cell.addEventListener("click", () => openDaySchedule(dateKey));
      calendarGridEl.appendChild(cell);
    }
  }

  document.getElementById("btn-cal-prev").addEventListener("click", () => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
    renderCalendarGrid();
  });
  document.getElementById("btn-cal-next").addEventListener("click", () => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
    renderCalendarGrid();
  });
  document.getElementById("btn-cal-today").addEventListener("click", () => {
    calendarViewDate = new Date();
    calendarViewDate.setDate(1);
    renderCalendarGrid();
  });
  document.getElementById("btn-back-calendar").addEventListener("click", () => {
    openDayKey = null;
    dayScheduleEl.classList.add("hidden");
    calendarViewEl.classList.remove("hidden");
  });

  function openDaySchedule(dateKey) {
    openDayKey = dateKey;
    calendarViewEl.classList.add("hidden");
    dayScheduleEl.classList.remove("hidden");
    renderDaySchedule(dateKey);
  }

  function formatDateHeading(dateKey) {
    const [y, m, d] = dateKey.split("-").map(Number);
    const weekday = ["日", "月", "火", "水", "木", "金", "土"][new Date(y, m - 1, d).getDay()];
    return `${y}年${m}月${d}日（${weekday}）`;
  }

  const HOUR_PX = 48;

  function renderDaySchedule(dateKey) {
    document.getElementById("day-schedule-title").textContent = formatDateHeading(dateKey);
    const dayTodos = todos.filter((t) => t.date === dateKey);
    const scheduled = dayTodos.filter((t) => t.startTime).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    const unscheduled = dayTodos.filter((t) => !t.startTime);
    const totalMin = dayTodos.reduce((sum, t) => sum + (t.minutes || 0), 0);

    document.getElementById("day-total-minutes").textContent = `合計作業時間 ${totalMin}分（${Math.floor(totalMin / 60)}時間${totalMin % 60}分）`;
    document.getElementById("day-task-count").textContent = `タスク ${dayTodos.length}件`;

    const timelineWrap = document.getElementById("timeline-wrap");
    if (!scheduled.length) {
      timelineWrap.innerHTML = '<p class="timeline-empty">時間が設定されたタスクはありません。</p>';
    } else {
      let rangeStartHour = Math.min(6, Math.floor(timeToMinutes(scheduled[0].startTime) / 60));
      let rangeEndHour = 22;
      scheduled.forEach((t) => {
        const endMin = timeToMinutes(t.startTime) + (t.minutes || 30);
        rangeEndHour = Math.max(rangeEndHour, Math.ceil(endMin / 60));
      });
      rangeStartHour = Math.max(0, rangeStartHour);
      rangeEndHour = Math.min(30, rangeEndHour);
      const rangeStartMin = rangeStartHour * 60;
      const totalHeight = (rangeEndHour - rangeStartHour) * HOUR_PX;

      const hoursHtml = [];
      for (let h = rangeStartHour; h <= rangeEndHour; h++) {
        hoursHtml.push(`<span style="top:${(h - rangeStartHour) * HOUR_PX}px">${h % 24}:00</span>`);
      }

      const lanesEnd = [];
      const placed = scheduled.map((t) => {
        const start = timeToMinutes(t.startTime);
        const dur = Math.max(t.minutes || 30, 15);
        let lane = lanesEnd.findIndex((end) => end <= start);
        if (lane === -1) { lane = lanesEnd.length; lanesEnd.push(start + dur); }
        else lanesEnd[lane] = start + dur;
        return { todo: t, start, dur, lane };
      });
      const laneCount = lanesEnd.length || 1;

      const eventsHtml = placed.map(({ todo, start, dur, lane }) => {
        const top = (start - rangeStartMin) / 60 * HOUR_PX;
        const height = Math.max(dur / 60 * HOUR_PX, 20);
        const width = 100 / laneCount;
        const left = lane * width;
        const color = SUBJECT_COLORS[Math.abs(hashCode(todo.id)) % SUBJECT_COLORS.length];
        const endLabel = minutesToTime(start + dur);
        return `
          <div class="timeline-event${todo.done ? " is-done" : ""}" data-id="${todo.id}" style="top:${top}px; height:${height}px; left:calc(${left}% + 2px); width:calc(${width}% - 4px); background:${color};" title="クリックして編集: ${escapeHtml(todo.title)}">
            <span class="te-title">${escapeHtml(todo.title)}</span>
            <span class="te-time">${todo.startTime}-${endLabel}</span>
          </div>
        `;
      }).join("");

      timelineWrap.innerHTML = `
        <div class="timeline-hours" style="height:${totalHeight}px">${hoursHtml.join("")}</div>
        <div class="timeline-track" style="height:${totalHeight}px; --hour-px:${HOUR_PX}px;">${eventsHtml}</div>
      `;
      timelineWrap.querySelectorAll(".timeline-event").forEach((el) => {
        el.addEventListener("click", () => openEditTodoModal(el.dataset.id));
      });
    }

    const unscheduledEl = document.getElementById("unscheduled-list");
    if (!unscheduled.length) {
      unscheduledEl.innerHTML = "";
    } else {
      unscheduledEl.innerHTML = `<h3>時間未設定のタスク</h3>` + unscheduled.map((t) => `
        <div class="unscheduled-item${t.done ? " is-done" : ""}">
          <input type="checkbox" ${t.done ? "checked" : ""} data-id="${t.id}" data-role="toggle">
          <div class="todo-main" data-id="${t.id}" data-role="edit">
            <div class="todo-title">${escapeHtml(t.title)}</div>
            <div class="todo-meta">${t.minutes ? `<span>⏱ ${t.minutes}分</span>` : ""} ${t.tags.map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join("")}</div>
          </div>
        </div>
      `).join("");
      unscheduledEl.querySelectorAll('[data-role="toggle"]').forEach((cb) => {
        cb.addEventListener("change", (e) => {
          const todo = todos.find((t) => t.id === e.target.dataset.id);
          if (!todo) return;
          todo.done = e.target.checked;
          saveTodos();
          refreshAfterTodoChange();
        });
      });
      unscheduledEl.querySelectorAll('[data-role="edit"]').forEach((el) => {
        el.addEventListener("click", () => openEditTodoModal(el.dataset.id));
      });
    }
  }

  function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return h;
  }

  function refreshAfterTodoChange() {
    renderTodos();
    renderCalendarGrid();
    if (openDayKey && dayScheduleEl && !dayScheduleEl.classList.contains("hidden")) renderDaySchedule(openDayKey);
  }

  /* ---- Todo edit modal ---- */

  const editTodoModal = document.getElementById("edit-todo-modal");
  const editTodoForm = document.getElementById("edit-todo-form");
  let editingTodoId = null;

  function openEditTodoModal(id) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    editingTodoId = id;
    document.getElementById("edit-todo-title").value = todo.title;
    document.getElementById("edit-todo-tags").value = todo.tags.join(", ");
    document.getElementById("edit-todo-minutes").value = todo.minutes || "";
    document.getElementById("edit-todo-date").value = todo.date || "";
    document.getElementById("edit-todo-start-time").value = todo.startTime || "";
    editTodoModal.classList.remove("hidden");
  }

  function closeEditTodoModal() {
    editingTodoId = null;
    editTodoModal.classList.add("hidden");
  }

  document.getElementById("btn-close-edit-todo").addEventListener("click", closeEditTodoModal);
  editTodoModal.addEventListener("click", (e) => { if (e.target === editTodoModal) closeEditTodoModal(); });

  editTodoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const todo = todos.find((t) => t.id === editingTodoId);
    if (!todo) return;
    const title = document.getElementById("edit-todo-title").value.trim();
    if (!title) return;
    const tagsRaw = document.getElementById("edit-todo-tags").value.trim();
    todo.title = title;
    todo.tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];
    todo.minutes = Number(document.getElementById("edit-todo-minutes").value) || 0;
    todo.date = document.getElementById("edit-todo-date").value || "";
    todo.startTime = document.getElementById("edit-todo-start-time").value || "";
    saveTodos();
    closeEditTodoModal();
    refreshAfterTodoChange();
  });

  document.getElementById("btn-delete-edit-todo").addEventListener("click", () => {
    if (!editingTodoId) return;
    if (!confirm("このTodoを削除しますか？")) return;
    todos = todos.filter((t) => t.id !== editingTodoId);
    saveTodos();
    closeEditTodoModal();
    refreshAfterTodoChange();
  });

  /* ============================== Quiz ============================== */

  const quizSubjectSelect = document.getElementById("quiz-subject-select");
  const quizSectionChecks = document.getElementById("quiz-section-checks");
  const quizSetupMsg = document.getElementById("quiz-setup-msg");
  const quizSetupEl = document.getElementById("quiz-setup");
  const quizPlayEl = document.getElementById("quiz-play");
  const quizResultEl = document.getElementById("quiz-result");

  let quizQuestions = [];
  let quizIndex = 0;
  let quizScore = 0;
  let quizWrongLog = [];

  function renderQuizSetup() {
    quizSetupEl.classList.remove("hidden");
    quizPlayEl.classList.add("hidden");
    quizResultEl.classList.add("hidden");
    quizSetupMsg.textContent = "";

    quizSubjectSelect.innerHTML = subjects.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
    if (!subjects.length) {
      quizSectionChecks.innerHTML = "";
      quizSetupMsg.textContent = "先に教材タブで教科・セクションを作成してください。";
      return;
    }
    renderQuizSectionChecks();
  }
  quizSubjectSelect.addEventListener("change", renderQuizSectionChecks);

  function renderQuizSectionChecks() {
    const subject = subjects.find((s) => s.id === quizSubjectSelect.value) || subjects[0];
    if (!subject) return;
    quizSectionChecks.innerHTML = subject.sections.map((sec) => `
      <label><input type="checkbox" value="${sec.id}" checked> ${escapeHtml(sec.title)}</label>
    `).join("") || '<p class="panel-sub">この教科にはまだセクションがありません。</p>';
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function splitSentences(text) {
    return text
      .split(/(?<=[。！？\n])/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 12 && s.length <= 90);
  }

  function buildQuestionPool(sections) {
    const pool = [];
    const allTerms = sections.flatMap((s) => s.terms.map((t) => ({ ...t, sectionTitle: s.title })));

    allTerms.forEach((t) => {
      const distractorDefs = shuffle(allTerms.filter((o) => o.definition !== t.definition)).slice(0, 3).map((o) => o.definition);
      const distractorTerms = shuffle(allTerms.filter((o) => o.term !== t.term)).slice(0, 3).map((o) => o.term);
      if (Math.random() < 0.5 && distractorDefs.length >= 1) {
        pool.push({ kind: "用語 → 説明", question: t.term, options: shuffle([t.definition, ...distractorDefs]), answer: t.definition });
      } else if (distractorTerms.length >= 1) {
        pool.push({ kind: "説明 → 用語", question: t.definition, options: shuffle([t.term, ...distractorTerms]), answer: t.term });
      }
    });

    if (sections.length >= 2) {
      const titles = sections.map((s) => s.title);
      sections.forEach((sec) => {
        const proseLines = sec.content.split("\n").filter((line) => !TERM_LINE_RE.test(line));
        splitSentences(proseLines.join("\n")).slice(0, 3).forEach((sentence) => {
          const distractors = shuffle(titles.filter((t) => t !== sec.title)).slice(0, 3);
          if (distractors.length >= 1) {
            pool.push({ kind: "この説明はどのセクション？", question: sentence, options: shuffle([sec.title, ...distractors]), answer: sec.title });
          }
        });
      });
    }
    return shuffle(pool);
  }

  document.getElementById("btn-start-quiz").addEventListener("click", () => {
    const subject = subjects.find((s) => s.id === quizSubjectSelect.value);
    if (!subject) return;
    const checkedIds = Array.from(quizSectionChecks.querySelectorAll("input:checked")).map((c) => c.value);
    const chosenSections = subject.sections.filter((s) => checkedIds.includes(s.id));
    if (!chosenSections.length) {
      quizSetupMsg.textContent = "少なくとも1つのセクションを選択してください。";
      return;
    }
    const pool = buildQuestionPool(chosenSections);
    if (!pool.length) {
      quizSetupMsg.textContent = "問題を作成できませんでした。「用語：説明」形式の行があるとクイズが作りやすくなります。";
      return;
    }
    const count = Math.min(Number(document.getElementById("quiz-count").value), pool.length);
    quizQuestions = pool.slice(0, count);
    quizIndex = 0;
    quizScore = 0;
    quizWrongLog = [];
    quizSetupEl.classList.add("hidden");
    quizPlayEl.classList.remove("hidden");
    quizResultEl.classList.add("hidden");
    renderQuizQuestion();
  });

  function renderQuizQuestion() {
    const q = quizQuestions[quizIndex];
    document.getElementById("quiz-progress-text").textContent = `第 ${quizIndex + 1} / ${quizQuestions.length} 問`;
    document.getElementById("quiz-score-text").textContent = `正解 ${quizScore}`;
    document.getElementById("quiz-question-kind").textContent = q.kind;
    document.getElementById("quiz-question-text").textContent = q.question;
    document.getElementById("btn-next-question").classList.add("hidden");

    const optionsEl = document.getElementById("quiz-options");
    optionsEl.innerHTML = "";
    q.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option";
      btn.textContent = opt;
      btn.addEventListener("click", () => selectAnswer(opt, btn));
      optionsEl.appendChild(btn);
    });
  }

  function selectAnswer(selected, btnEl) {
    const q = quizQuestions[quizIndex];
    const correct = selected === q.answer;
    if (correct) quizScore++;
    else quizWrongLog.push({ question: q.question, answer: q.answer, selected });

    document.querySelectorAll(".quiz-option").forEach((el) => {
      el.disabled = true;
      if (el.textContent === q.answer) el.classList.add("is-correct");
      else if (el === btnEl) el.classList.add("is-wrong");
    });
    document.getElementById("quiz-score-text").textContent = `正解 ${quizScore}`;
    document.getElementById("btn-next-question").classList.remove("hidden");
  }

  document.getElementById("btn-next-question").addEventListener("click", () => {
    quizIndex++;
    if (quizIndex >= quizQuestions.length) {
      showQuizResult();
    } else {
      renderQuizQuestion();
    }
  });

  function showQuizResult() {
    quizPlayEl.classList.add("hidden");
    quizResultEl.classList.remove("hidden");
    document.getElementById("quiz-result-score").textContent = `結果: ${quizScore} / ${quizQuestions.length} 問正解`;
    const reviewEl = document.getElementById("quiz-result-review");
    reviewEl.innerHTML = quizWrongLog.length
      ? quizWrongLog.map((w) => `<div class="review-item"><div class="review-q">Q. ${escapeHtml(w.question)}</div>あなたの回答: ${escapeHtml(w.selected)}<br>正解: ${escapeHtml(w.answer)}</div>`).join("")
      : '<p class="panel-sub">全問正解です！🎉</p>';
  }

  document.getElementById("btn-retry-quiz").addEventListener("click", renderQuizSetup);

  /* ============================== YouTube Player ============================== */

  const YT_LAST_URL_KEY = "sn_yt_last_url";
  const ytWidget = document.getElementById("yt-widget");
  const ytUrlInput = document.getElementById("yt-url-input");
  const ytIframe = document.getElementById("yt-iframe");
  const ytVideoEmpty = document.getElementById("yt-video-empty");

  function extractYouTubeId(raw) {
    const s = raw.trim();
    if (!s) return null;
    if (/^[\w-]{11}$/.test(s)) return s;
    try {
      const url = new URL(s);
      if (/(^|\.)youtu\.be$/.test(url.hostname)) return url.pathname.slice(1).split("/")[0] || null;
      if (/(^|\.)youtube(-nocookie)?\.com$/.test(url.hostname)) {
        if (url.pathname === "/watch") return url.searchParams.get("v");
        const m = url.pathname.match(/\/(embed|shorts|live)\/([\w-]{11})/);
        if (m) return m[2];
      }
    } catch (e) { /* not a URL, and not a bare ID either */ }
    return null;
  }

  function openYtWidget() { ytWidget.classList.remove("is-closed"); }
  function closeYtWidget() { ytWidget.classList.add("is-closed"); }

  document.getElementById("btn-toggle-yt").addEventListener("click", () => {
    ytWidget.classList.toggle("is-closed");
  });
  document.getElementById("btn-close-yt").addEventListener("click", closeYtWidget);

  document.getElementById("yt-url-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = ytUrlInput.value;
    const videoId = extractYouTubeId(raw);
    if (!videoId) {
      ytIframe.classList.add("hidden");
      ytIframe.src = "";
      ytVideoEmpty.textContent = raw.trim() ? "YouTubeのURLとして認識できませんでした" : "URLを入力して再生してください";
      ytVideoEmpty.classList.remove("hidden");
      return;
    }
    ytIframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
    ytIframe.classList.remove("hidden");
    ytVideoEmpty.classList.add("hidden");
    localStorage.setItem(YT_LAST_URL_KEY, raw.trim());
    openYtWidget();
  });

  const lastYtUrl = localStorage.getItem(YT_LAST_URL_KEY);
  if (lastYtUrl) ytUrlInput.value = lastYtUrl;

  /* ---- Resize ---- */

  const YT_SIZE_KEY = "sn_yt_size";
  const YT_DEFAULT_SIZE = { w: 420, h: 340 };
  const YT_MIN_SIZE = { w: 220, h: 160 };
  const ytResizeHandle = document.getElementById("yt-resize-handle");
  let resizeState = null;

  function applyYtSize(w, h) {
    const maxW = window.innerWidth - 36;
    const maxH = window.innerHeight - 36;
    ytWidget.style.width = Math.round(Math.min(Math.max(w, YT_MIN_SIZE.w), maxW)) + "px";
    ytWidget.style.height = Math.round(Math.min(Math.max(h, YT_MIN_SIZE.h), maxH)) + "px";
  }

  ytResizeHandle.addEventListener("pointerdown", (e) => {
    resizeState = { startX: e.clientX, startY: e.clientY, startW: ytWidget.offsetWidth, startH: ytWidget.offsetHeight };
    ytResizeHandle.setPointerCapture(e.pointerId);
    ytWidget.classList.add("is-resizing");
    e.preventDefault();
  });
  ytResizeHandle.addEventListener("pointermove", (e) => {
    if (!resizeState) return;
    const w = resizeState.startW + (resizeState.startX - e.clientX);
    const h = resizeState.startH + (resizeState.startY - e.clientY);
    applyYtSize(w, h);
  });
  function endYtResize() {
    if (!resizeState) return;
    resizeState = null;
    ytWidget.classList.remove("is-resizing");
    localStorage.setItem(YT_SIZE_KEY, JSON.stringify({ w: ytWidget.offsetWidth, h: ytWidget.offsetHeight }));
  }
  ytResizeHandle.addEventListener("pointerup", endYtResize);
  ytResizeHandle.addEventListener("pointercancel", endYtResize);
  ytResizeHandle.addEventListener("dblclick", () => {
    applyYtSize(YT_DEFAULT_SIZE.w, YT_DEFAULT_SIZE.h);
    localStorage.removeItem(YT_SIZE_KEY);
  });

  try {
    const savedSize = JSON.parse(localStorage.getItem(YT_SIZE_KEY));
    if (savedSize && savedSize.w && savedSize.h) applyYtSize(savedSize.w, savedSize.h);
  } catch (e) { /* ignore malformed saved size */ }

  /* ============================== Playlist ============================== */

  const DEFAULT_VIDEO_URLS = [
    "https://www.youtube.com/watch?v=u7kCTaCX_J4",
    "https://www.youtube.com/watch?v=dfVK7ld38Ys",
    "https://www.youtube.com/watch?v=DjdUEyjx8GM",
    "https://www.youtube.com/watch?v=hlbh4P0Mz8M",
    "https://www.youtube.com/watch?v=ErHJBXTmm2Q",
    "https://www.youtube.com/watch?v=DjdUEyjx8GM",
    "https://www.youtube.com/watch?v=lA6TaaMGgDo",
    "https://www.youtube.com/watch?v=6dp-bvQ7RWo",
    "https://www.youtube.com/watch?v=cptolqWrjcw",
    "https://www.youtube.com/watch?v=8H3nRCFVR6Y",
    "https://www.youtube.com/watch?v=Zhmmh7l6KEw",
    "https://www.youtube.com/watch?v=V1rDmWK4Dd8",
  ];

  if (videos === null) {
    videos = DEFAULT_VIDEO_URLS
      .map((url) => ({ id: uid(), videoId: extractYouTubeId(url), url, addedAt: Date.now() }))
      .filter((v) => v.videoId);
    saveVideos();
  }

  const videoGridEl = document.getElementById("video-grid");
  let videoGridRendered = false;

  function renderVideoGrid() {
    videoGridRendered = true;
    videoGridEl.innerHTML = "";
    if (!videos.length) {
      videoGridEl.innerHTML = '<p class="panel-sub">動画がまだありません。URLを追加してください。</p>';
      return;
    }
    videos.forEach((v) => {
      const cell = document.createElement("div");
      cell.className = "video-cell";
      cell.innerHTML = `
        <iframe src="https://www.youtube-nocookie.com/embed/${v.videoId}?autoplay=1&mute=1&rel=0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen title="${escapeHtml(v.url)}"></iframe>
        <button class="video-cell-delete" aria-label="削除">✕</button>
      `;
      cell.querySelector(".video-cell-delete").addEventListener("click", () => {
        videos = videos.filter((x) => x.id !== v.id);
        saveVideos();
        renderVideoGrid();
      });
      videoGridEl.appendChild(cell);
    });
  }

  document.getElementById("video-add-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("video-url-input");
    const videoId = extractYouTubeId(input.value);
    if (!videoId) {
      alert("YouTubeのURLとして認識できませんでした");
      return;
    }
    videos.push({ id: uid(), videoId, url: input.value.trim(), addedAt: Date.now() });
    saveVideos();
    input.value = "";
    renderVideoGrid();
  });

  /* ============================== Init ============================== */

  renderSubjectList();
  renderTodos();
  renderCalendarGrid();
  renderQuizSetup();
})();
