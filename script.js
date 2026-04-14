const STEP_OFFSETS = [0, 30, 60, 90];
const END_OFFSET = 120;

const CONDITIONS = {
  1: {
    label: "条件1",
    summary: "安静のみ",
    steps: ["安静", "安静", "安静", "安静"],
  },
  2: {
    label: "条件2",
    summary: "香りを継続し、最後に安静",
    steps: ["香り", "香り", "香り", "安静"],
  },
  3: {
    label: "条件3",
    summary: "香りのあと香りなしへ切り替え、最後に安静",
    steps: ["香り", "香りなし", "香りなし", "安静"],
  },
  4: {
    label: "条件4",
    summary: "香りと香りなしを切り替え、最後に安静",
    steps: ["香り", "香りなし", "香り", "安静"],
  },
  5: {
    label: "条件5",
    summary: "随意呼吸を継続し、最後に安静",
    steps: ["随意呼吸", "随意呼吸", "随意呼吸", "安静"],
  },
  6: {
    label: "条件6",
    summary: "随意呼吸のあと安静へ移行",
    steps: ["随意呼吸", "安静", "安静", "安静"],
  },
  7: {
    label: "条件7",
    summary: "随意呼吸と安静を交互に行う",
    steps: ["随意呼吸", "安静", "随意呼吸", "安静"],
  },
};

const PATTERNS = {
  A: [2, 6, 4, 5, 3, 7, 1],
  B: [5, 3, 2, 7, 1, 6, 4],
  C: [4, 6, 2, 1, 5, 3, 7],
  D: [7, 2, 6, 4, 5, 1, 3],
  E: [3, 5, 1, 7, 2, 6, 4],
  F: [6, 4, 5, 3, 7, 2, 1],
  G: [1, 5, 4, 6, 2, 7, 3],
  H: [4, 1, 6, 2, 7, 3, 5],
};

const STORAGE_KEYS = {
  draft: "nioi-study-draft-v1",
  history: "nioi-study-history-v1",
};

const refs = {
  setupPanel: document.getElementById("setupPanel"),
  sessionLabel: document.getElementById("sessionLabel"),
  patternButtons: document.getElementById("patternButtons"),
  patternSummary: document.getElementById("patternSummary"),
  orderStrip: document.getElementById("orderStrip"),
  progressBadge: document.getElementById("progressBadge"),
  roundTitle: document.getElementById("roundTitle"),
  currentRoundPanel: document.getElementById("currentRoundPanel"),
  stepChips: document.getElementById("stepChips"),
  scheduleForm: document.getElementById("scheduleForm"),
  minutesInput: document.getElementById("minutesInput"),
  secondsInput: document.getElementById("secondsInput"),
  helperText: document.getElementById("helperText"),
  scheduleCards: document.getElementById("scheduleCards"),
  roundNote: document.getElementById("roundNote"),
  saveRoundButton: document.getElementById("saveRoundButton"),
  undoButton: document.getElementById("undoButton"),
  resetButton: document.getElementById("resetButton"),
  recordsList: document.getElementById("recordsList"),
  runningLogCount: document.getElementById("runningLogCount"),
  finalPanel: document.getElementById("finalPanel"),
  activeRoundControls: document.getElementById("activeRoundControls"),
  sessionNote: document.getElementById("sessionNote"),
  finalMemo: document.getElementById("finalMemo"),
  copyButton: document.getElementById("copyButton"),
  newSessionButton: document.getElementById("newSessionButton"),
  saveStatus: document.getElementById("saveStatus"),
  historyList: document.getElementById("historyList"),
  clearHistoryButton: document.getElementById("clearHistoryButton"),
};

let state = normalizeState(loadDraft());
let historyEntries = loadHistory();

bindEvents();
render();

function bindEvents() {
  refs.sessionLabel.addEventListener("input", (event) => {
    state.sessionLabel = event.target.value;
    state.historySaved = false;
    persistDraft();
    render();
  });

  refs.scheduleForm.addEventListener("submit", (event) => {
    event.preventDefault();
    createSchedule();
  });

  refs.roundNote.addEventListener("input", (event) => {
    state.currentRoundNote = event.target.value;
    persistDraft();
  });

  refs.sessionNote.addEventListener("input", (event) => {
    state.sessionNote = event.target.value;
    state.historySaved = false;
    persistDraft();
    render();
  });

  refs.saveRoundButton.addEventListener("click", saveCurrentRound);
  refs.undoButton.addEventListener("click", undoLastRound);
  refs.resetButton.addEventListener("click", resetSessionWithConfirm);
  refs.copyButton.addEventListener("click", copyFinalMemo);
  refs.newSessionButton.addEventListener("click", resetSessionWithConfirm);
  refs.clearHistoryButton.addEventListener("click", clearHistoryWithConfirm);

  refs.historyList.addEventListener("click", (event) => {
    const target = event.target.closest("button[data-action]");
    const preview = event.target.closest("[data-action='close-preview']");
    if (preview) {
      const details = preview.closest("details");
      if (details) {
        details.open = false;
      }
      return;
    }

    if (!target) {
      return;
    }

    const entryId = target.dataset.entryId;
    if (!entryId) {
      return;
    }

    if (target.dataset.action === "copy") {
      const entry = historyEntries.find((item) => item.id === entryId);
      if (entry) {
        copyText(entry.memoText, "保存済みメモをコピーしました。");
      }
      return;
    }

    if (target.dataset.action === "delete") {
      deleteHistoryEntry(entryId);
    }
  });
}

function createInitialState() {
  return {
    sessionLabel: "",
    pattern: "",
    currentIndex: 0,
    currentMinutes: "",
    currentSeconds: "",
    currentSchedule: null,
    currentRoundNote: "",
    sessionNote: "",
    records: [],
    historySaved: false,
    historyEntryId: "",
    historySyncSuppressed: false,
  };
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.draft);
    if (!raw) {
      return createInitialState();
    }

    const parsed = JSON.parse(raw);
    return {
      ...createInitialState(),
      ...parsed,
    };
  } catch (_error) {
    return createInitialState();
  }
}

function normalizeState(candidate) {
  const next = {
    ...createInitialState(),
    ...candidate,
  };

  if (next.pattern && !PATTERNS[next.pattern]) {
    next.pattern = "";
  }

  if (!Array.isArray(next.records)) {
    next.records = [];
  }
  next.records = next.records.map(normalizeRecord);

  if (typeof next.historyEntryId !== "string") {
    next.historyEntryId = "";
  }

  next.historySyncSuppressed = Boolean(next.historySyncSuppressed);

  next.currentIndex = next.records.length;
  return next;
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.history);
    if (!raw) {
      return [];
    }

    return JSON.parse(raw).map(normalizeHistoryEntry);
  } catch (_error) {
    return [];
  }
}

function persistDraft() {
  localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(state));
}

function persistHistory() {
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(historyEntries));
}

function render() {
  renderPatternButtons();
  renderPatternSummary();
  renderProgress();
  renderCurrentRound();
  renderSchedule();
  renderRecords();
  syncCompletedSessionToHistory();
  renderFinalPanel();
  renderHistory();
  syncInputs();
}

function syncInputs() {
  refs.sessionLabel.value = state.sessionLabel;
  refs.minutesInput.value = state.currentMinutes;
  refs.secondsInput.value = state.currentSeconds;
  refs.roundNote.value = state.currentRoundNote;
  refs.sessionNote.value = state.sessionNote;
}

function renderPatternButtons() {
  refs.patternButtons.innerHTML = Object.entries(PATTERNS)
    .map(([patternKey, order]) => {
      const isSelected = patternKey === state.pattern;
      return `
        <button
          type="button"
          class="pattern-button ${isSelected ? "selected" : ""}"
          data-pattern="${patternKey}"
          aria-pressed="${String(isSelected)}"
        >
          <strong>パターン${patternKey}</strong>
          <span>${order.join(" → ")}</span>
        </button>
      `;
    })
    .join("");

  refs.patternButtons.querySelectorAll("[data-pattern]").forEach((button) => {
    button.addEventListener("click", () => {
      const patternKey = button.dataset.pattern;
      if (!patternKey || patternKey === state.pattern) {
        return;
      }

      if (shouldConfirmPatternChange()) {
        const shouldReset = window.confirm(
          "パターンを変更すると現在の進行中セッションを最初からやり直します。変更しますか？",
        );
        if (!shouldReset) {
          return;
        }
      }

      state = {
        ...createInitialState(),
        pattern: patternKey,
        sessionLabel: state.sessionLabel,
      };
      persistDraft();
      render();
    });
  });
}

function renderPatternSummary() {
  if (!hasSelectedPattern()) {
    refs.patternSummary.textContent = "未選択: 上でパターンを選んでください。";
    refs.orderStrip.innerHTML = "";
    return;
  }

  const order = PATTERNS[state.pattern];
  refs.patternSummary.textContent = `選択中: パターン${state.pattern}（条件 ${order.join(" → ")}）`;

  refs.orderStrip.innerHTML = order
    .map((conditionId, index) => {
      const classes = ["order-pill"];
      if (index < state.currentIndex) {
        classes.push("done");
      } else if (index === state.currentIndex && !isComplete()) {
        classes.push("current");
      }

      return `<span class="${classes.join(" ")}">${index + 1}回目 条件${conditionId}</span>`;
    })
    .join("");
}

function renderProgress() {
  refs.progressBadge.textContent = `${state.records.length} / 7 完了`;
  refs.runningLogCount.textContent = `${state.records.length} 件`;
}

function renderCurrentRound() {
  if (!hasSelectedPattern()) {
    refs.roundTitle.textContent = "パターンを選んでください";
    refs.stepChips.innerHTML = `<span class="action-chip complete">上でパターンを選択</span>`;
    return;
  }

  if (isComplete()) {
    refs.roundTitle.textContent = "全条件が完了しました";
    refs.stepChips.innerHTML = `<span class="action-chip complete">+120秒 終了</span>`;
    return;
  }

  const conditionId = getCurrentConditionId();
  const condition = CONDITIONS[conditionId];

  refs.roundTitle.textContent = `${state.currentIndex + 1}回目 / ${condition.label}`;
  refs.stepChips.innerHTML = condition.steps
    .map((action, index) => {
      const actionClass = getActionClassName(action);
      return `<span class="action-chip ${actionClass}">+${STEP_OFFSETS[index]}秒 ${action}</span>`;
    })
    .concat(`<span class="action-chip complete">+${END_OFFSET}秒 終了</span>`)
    .join("");
}

function renderSchedule() {
  const patternSelected = hasSelectedPattern();
  const hasSchedule = Boolean(state.currentSchedule);
  refs.saveRoundButton.disabled = !hasSchedule || !patternSelected;
  refs.undoButton.disabled = state.records.length === 0;

  if (refs.activeRoundControls) {
    refs.activeRoundControls.hidden = isComplete() || !patternSelected;
  }

  if (isComplete()) {
    refs.scheduleCards.innerHTML = `
      <div class="empty-state">
        7条件が完了しました。下の完了メモで内容を確認し、コピーまたは履歴保存を行ってください。
      </div>
    `;
    refs.helperText.textContent = "必要なら完了メモに全体メモを追記できます。";
    return;
  }

  if (!hasSchedule) {
    refs.scheduleCards.innerHTML = `
      <div class="empty-state">
        呼吸開始時刻を入れて「指示を作成」を押すと、ここに実施時刻が並びます。
      </div>
    `;
    refs.helperText.textContent =
      "空欄は 0 として扱います。例: 5分12秒 の場合は「5」「12」と入力します。";
    return;
  }

  refs.helperText.textContent = `基準時刻 ${formatTimeShort(
    state.currentSchedule[0].timeSeconds,
  )} から、30秒ごとの指示を表示しています。`;
  refs.scheduleCards.innerHTML = state.currentSchedule
    .map((item, index) => {
      const stepLabel = index === 0 ? "今すぐ" : `+${item.offsetSeconds}秒`;
      const metaText = item.isEnd ? "この条件を終了" : `${item.action} を行う`;
      return `
        <article class="schedule-card">
          <div class="schedule-step">${stepLabel}</div>
          <div>
            <div class="schedule-time">${formatTimeShort(item.timeSeconds)}</div>
            <div class="schedule-meta">${metaText}</div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderRecords() {
  if (state.records.length === 0) {
    refs.recordsList.innerHTML = `
      <div class="empty-state">
        まだ記録はありません。条件ごとに指示を作成し、「この条件を記録して次へ」を押してください。
      </div>
    `;
    return;
  }

  refs.recordsList.innerHTML = state.records
    .map((record) => {
      const timeline = record.schedule
        .map(
          (item) => `
            <div class="timeline-row">
              <strong>${formatTimeShort(item.timeSeconds)}</strong>
              <span>${item.action}</span>
            </div>
          `,
        )
        .join("");

      const noteHtml = record.roundNote
        ? `<div class="record-note">${escapeHtml(record.roundNote)}</div>`
        : "";

      return `
        <article class="record-card">
          <div class="record-header">
            <div>
              <h3 class="record-title">${record.roundNumber}回目 / 条件${record.conditionId}</h3>
              <p class="record-subtitle">
                呼吸開始: ${formatTimeShort(record.breathingStartTotalSeconds)}
              </p>
            </div>
            <span class="badge-soft">${CONDITIONS[record.conditionId].summary}</span>
          </div>

          <div class="record-timeline">${timeline}</div>
          ${noteHtml}
        </article>
      `;
    })
    .join("");
}

function renderFinalPanel() {
  const complete = isComplete();
  refs.finalPanel.hidden = !complete;
  refs.saveStatus.textContent = state.historySyncSuppressed
    ? "このセッションの履歴は削除されています。"
    : state.historySaved
      ? "このセッションは履歴へ自動保存済みです。"
      : "7回目完了時に履歴へ自動保存されます。";
  renderFinalMemo();
}

function renderFinalMemo() {
  const recordsForMemo = state.records;
  if (recordsForMemo.length === 0) {
    refs.finalMemo.value = "";
    return;
  }

  refs.finalMemo.value = buildMemoText({
    sessionLabel: state.sessionLabel,
    pattern: state.pattern,
    records: recordsForMemo,
    sessionNote: state.sessionNote,
    savedAt: Date.now(),
  });
}

function renderHistory() {
  if (historyEntries.length === 0) {
    refs.historyList.innerHTML = `
      <div class="empty-state">
        まだ保存済み履歴はありません。7条件完了後に自動保存された内容が、ここに残ります。
      </div>
    `;
    return;
  }

  refs.historyList.innerHTML = historyEntries
    .map((entry) => {
      const title = entry.sessionLabel
        ? escapeHtml(entry.sessionLabel)
        : `パターン${entry.pattern} / ${formatDate(entry.savedAt)}`;
      const subtitle = `パターン${entry.pattern}（${PATTERNS[entry.pattern].join(" → ")}）`;
      return `
        <article class="history-card">
          <div class="history-header">
            <div>
              <h3 class="history-title">${title}</h3>
              <p class="history-subtitle">${subtitle}</p>
              <p class="history-subtitle">保存日時: ${formatDate(entry.savedAt)}</p>
            </div>
            <span class="badge-soft">${entry.records.length} 条件</span>
          </div>

          <div class="history-actions">
            <button type="button" data-action="copy" data-entry-id="${entry.id}">
              メモをコピー
            </button>
            <button type="button" class="danger" data-action="delete" data-entry-id="${entry.id}">
              この履歴を削除
            </button>
          </div>

          <details>
            <summary>内容を見る</summary>
            <div class="history-preview" data-action="close-preview">
              <pre class="memo-output">${escapeHtml(entry.memoText)}</pre>
              <p class="history-preview-hint">このメモをタップすると閉じます</p>
            </div>
          </details>
        </article>
      `;
    })
    .join("");
}

function createSchedule() {
  if (isComplete()) {
    return;
  }

  const minutes = refs.minutesInput.value.trim();
  const seconds = refs.secondsInput.value.trim();
  const parsedTime = parseTimeInput(minutes, seconds);

  if (!parsedTime.valid) {
    refs.helperText.textContent = parsedTime.message;
    state.currentSchedule = null;
    persistDraft();
    renderSchedule();
    return;
  }

  const conditionId = getCurrentConditionId();
  state.currentMinutes = minutes;
  state.currentSeconds = seconds;
  state.currentSchedule = buildSchedule(parsedTime.totalSeconds, conditionId);
  state.historySaved = false;
  state.historySyncSuppressed = false;
  persistDraft();
  renderSchedule();
}

function saveCurrentRound() {
  if (!state.currentSchedule || isComplete()) {
    return;
  }

  const conditionId = getCurrentConditionId();
  const record = {
    roundNumber: state.currentIndex + 1,
    conditionId,
    breathingStartDisplay: state.currentSchedule[0].displayTime,
    breathingStartTotalSeconds: state.currentSchedule[0].timeSeconds,
    schedule: state.currentSchedule,
    roundNote: state.currentRoundNote.trim(),
  };

  state.records = [...state.records, record];
  state.currentIndex = state.records.length;
  state.currentMinutes = "";
  state.currentSeconds = "";
  state.currentSchedule = null;
  state.currentRoundNote = "";
  state.historySaved = false;
  state.historySyncSuppressed = false;
  persistDraft();
  render();
  scrollToNextFocus();
}

function undoLastRound() {
  if (state.records.length === 0) {
    return;
  }

  const shouldUndo = window.confirm("直前の条件記録を取り消しますか？");
  if (!shouldUndo) {
    return;
  }

  const previous = state.records[state.records.length - 1];
  removeLinkedHistoryEntry();
  state.records = state.records.slice(0, -1);
  state.currentIndex = state.records.length;
  state.currentMinutes = Math.floor(previous.breathingStartTotalSeconds / 60).toString();
  state.currentSeconds = (previous.breathingStartTotalSeconds % 60).toString().padStart(2, "0");
  state.currentSchedule = previous.schedule;
  state.currentRoundNote = previous.roundNote;
  state.historySaved = false;
  state.historyEntryId = "";
  state.historySyncSuppressed = false;
  persistDraft();
  render();
  scrollToNextFocus();
}

function copyFinalMemo() {
  if (!refs.finalMemo.value.trim()) {
    return;
  }

  copyText(refs.finalMemo.value, "メモをコピーしました。");
}

function scrollToNextFocus() {
  const target = isComplete() ? refs.finalPanel : refs.currentRoundPanel;
  if (!target) {
    return;
  }

  window.requestAnimationFrame(() => {
    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

function scrollToSetupFocus() {
  if (!refs.setupPanel) {
    return;
  }

  window.requestAnimationFrame(() => {
    refs.setupPanel.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

function syncCompletedSessionToHistory() {
  if (!isComplete() || state.historySyncSuppressed) {
    return;
  }

  const existingIndex = historyEntries.findIndex(
    (entry) => entry.id === state.historyEntryId,
  );
  const existingEntry = existingIndex >= 0 ? historyEntries[existingIndex] : null;
  const savedAt = existingEntry?.savedAt ?? Date.now();
  const entryId = existingEntry?.id || state.historyEntryId || createId();
  const entry = buildHistoryEntry(savedAt, entryId);

  if (existingIndex >= 0) {
    historyEntries[existingIndex] = entry;
  } else {
    historyEntries = [entry, ...historyEntries];
  }

  state.historyEntryId = entry.id;
  state.historySaved = true;
  persistHistory();
  persistDraft();
}

function removeLinkedHistoryEntry() {
  if (!state.historyEntryId) {
    return;
  }

  historyEntries = historyEntries.filter((entry) => entry.id !== state.historyEntryId);
  state.historySaved = false;
  state.historyEntryId = "";
  persistHistory();
}

function resetSessionWithConfirm() {
  if (hasDraftContent()) {
    const shouldReset = window.confirm(
      "現在の進行中セッションを消して、最初からやり直しますか？",
    );
    if (!shouldReset) {
      return;
    }
  }

  state = {
    ...createInitialState(),
  };
  persistDraft();
  render();
  scrollToSetupFocus();
}

function clearHistoryWithConfirm() {
  if (historyEntries.length === 0) {
    return;
  }

  const shouldClear = window.confirm("保存済み履歴をすべて削除しますか？");
  if (!shouldClear) {
    return;
  }

  historyEntries = [];
  state.historySaved = false;
  state.historyEntryId = "";
  state.historySyncSuppressed = isComplete();
  persistHistory();
  persistDraft();
  render();
}

function deleteHistoryEntry(entryId) {
  const shouldDelete = window.confirm("この履歴を削除しますか？");
  if (!shouldDelete) {
    return;
  }

  historyEntries = historyEntries.filter((entry) => entry.id !== entryId);
  if (state.historyEntryId === entryId) {
    state.historySaved = false;
    state.historyEntryId = "";
    state.historySyncSuppressed = isComplete();
    persistDraft();
  }
  persistHistory();
  render();
}

function hasDraftContent() {
  return Boolean(
    state.records.length > 0 ||
      state.currentSchedule ||
      state.currentMinutes ||
      state.currentSeconds ||
      state.currentRoundNote.trim() ||
      state.sessionLabel.trim() ||
      state.sessionNote.trim(),
  );
}

function shouldConfirmPatternChange() {
  return Boolean(
    hasSelectedPattern() &&
      (state.records.length > 0 ||
        state.currentSchedule ||
        state.currentMinutes ||
        state.currentSeconds ||
        state.currentRoundNote.trim()),
  );
}

function getCurrentConditionId() {
  return PATTERNS[state.pattern][state.currentIndex];
}

function hasSelectedPattern() {
  return Boolean(state.pattern && PATTERNS[state.pattern]);
}

function isComplete() {
  return state.records.length >= 7;
}

function buildSchedule(breathingStartSeconds, conditionId) {
  const actionItems = CONDITIONS[conditionId].steps.map((action, index) => ({
    stepNumber: index + 1,
    action,
    offsetSeconds: STEP_OFFSETS[index],
    timeSeconds: breathingStartSeconds + STEP_OFFSETS[index],
    displayTime: formatTime(breathingStartSeconds + STEP_OFFSETS[index]),
  }));

  return [
    ...actionItems,
    {
      stepNumber: actionItems.length + 1,
      action: "終了",
      offsetSeconds: END_OFFSET,
      timeSeconds: breathingStartSeconds + END_OFFSET,
      displayTime: formatTime(breathingStartSeconds + END_OFFSET),
      isEnd: true,
    },
  ];
}

function parseTimeInput(minutes, seconds) {
  const normalizedMinutes = minutes === "" ? "0" : minutes;
  const normalizedSeconds = seconds === "" ? "0" : seconds;
  const minuteValue = Number.parseInt(normalizedMinutes, 10);
  const secondValue = Number.parseInt(normalizedSeconds, 10);

  if (
    Number.isNaN(minuteValue) ||
    Number.isNaN(secondValue) ||
    minuteValue < 0 ||
    secondValue < 0 ||
    secondValue > 59
  ) {
    return {
      valid: false,
      message: "秒は 0〜59 の範囲で入力してください。",
    };
  }

  return {
    valid: true,
    totalSeconds: minuteValue * 60 + secondValue,
  };
}

function buildMemoText(session) {
  const lines = [];

  if (session.sessionLabel.trim()) {
    lines.push(`セッション名: ${session.sessionLabel.trim()}`);
  }
  lines.push(`パターン${session.pattern}: ${PATTERNS[session.pattern].join(" → ")}`);
  lines.push(`作成日時: ${formatDate(session.savedAt)}`);
  lines.push("");

  session.records.forEach((record) => {
    lines.push(`${record.roundNumber}回目 / 条件${record.conditionId}`);
    lines.push(`呼吸開始: ${record.breathingStartDisplay}`);
    record.schedule.forEach((item) => {
      lines.push(`${item.displayTime} ${item.action}`);
    });
    if (record.roundNote) {
      lines.push(`メモ: ${record.roundNote}`);
    }
    lines.push("");
  });

  if (session.sessionNote.trim()) {
    lines.push("全体メモ:");
    lines.push(session.sessionNote.trim());
  }

  return lines.join("\n").trim();
}

function buildHistoryEntry(savedAt, entryId) {
  const records = state.records.map(normalizeRecord);
  const memoText = buildMemoText({
    sessionLabel: state.sessionLabel,
    pattern: state.pattern,
    records,
    sessionNote: state.sessionNote,
    savedAt,
  });

  return {
    id: entryId,
    sessionLabel: state.sessionLabel.trim(),
    pattern: state.pattern,
    records: JSON.parse(JSON.stringify(records)),
    sessionNote: state.sessionNote.trim(),
    savedAt,
    memoText,
  };
}

function normalizeRecord(record) {
  const breathingStartTotalSeconds = Number.isFinite(record.breathingStartTotalSeconds)
    ? record.breathingStartTotalSeconds
    : 0;
  const schedule = Array.isArray(record.schedule)
    ? record.schedule.map((item) => normalizeScheduleItem(item))
    : [];

  return {
    ...record,
    breathingStartTotalSeconds,
    breathingStartDisplay: formatTime(breathingStartTotalSeconds),
    schedule,
  };
}

function normalizeScheduleItem(item) {
  const timeSeconds = Number.isFinite(item.timeSeconds) ? item.timeSeconds : 0;
  return {
    ...item,
    timeSeconds,
    displayTime: formatTime(timeSeconds),
  };
}

function normalizeHistoryEntry(entry) {
  const records = Array.isArray(entry.records)
    ? entry.records.map((record) => normalizeRecord(record))
    : [];

  return {
    ...entry,
    records,
    memoText: buildMemoText({
      sessionLabel: entry.sessionLabel || "",
      pattern: entry.pattern,
      records,
      sessionNote: entry.sessionNote || "",
      savedAt: entry.savedAt,
    }),
  };
}

function formatTimeShort(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}：${String(seconds).padStart(2, "0")}`;
}

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  return `${formatTimeShort(safeSeconds)}（${safeSeconds}）`;
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getActionClassName(action) {
  if (action === "安静") {
    return "rest";
  }
  if (action === "香り") {
    return "fragrance";
  }
  if (action === "香りなし") {
    return "no-fragrance";
  }
  return "breathing";
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    refs.saveStatus.textContent = successMessage;
  } catch (_error) {
    const fallback = document.createElement("textarea");
    fallback.value = text;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "absolute";
    fallback.style.left = "-9999px";
    document.body.appendChild(fallback);
    fallback.select();
    document.execCommand("copy");
    document.body.removeChild(fallback);
    refs.saveStatus.textContent = successMessage;
  }
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
