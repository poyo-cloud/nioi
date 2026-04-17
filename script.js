const STEP_OFFSETS = [0, 30, 60, 90];
const STEP_DURATION = 30;
const END_OFFSET = 120;
const CONTROL_DURATION = 180;
const STRESS_DURATION = 180;
const MIN_INTERVAL = 10;

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
  draft: "nioi-study-draft-v2",
  history: "nioi-study-history-v1",
};

const refs = {
  setupPanel: document.getElementById("setupPanel"),
  sessionLabel: document.getElementById("sessionLabel"),
  patternButtons: document.getElementById("patternButtons"),
  patternSummary: document.getElementById("patternSummary"),
  orderStrip: document.getElementById("orderStrip"),
  progressBadge: document.getElementById("progressBadge"),
  runningLogCount: document.getElementById("runningLogCount"),
  recordsList: document.getElementById("recordsList"),
  currentRoundPanel: document.getElementById("currentRoundPanel"),
  roundTitle: document.getElementById("roundTitle"),
  stepChips: document.getElementById("stepChips"),
  scheduleForm: document.getElementById("scheduleForm"),
  primaryTimeLabel: document.getElementById("primaryTimeLabel"),
  primaryMinutesInput: document.getElementById("primaryMinutesInput"),
  primarySecondsInput: document.getElementById("primarySecondsInput"),
  breathingTimeGroup: document.getElementById("breathingTimeGroup"),
  breathingMinutesInput: document.getElementById("breathingMinutesInput"),
  breathingSecondsInput: document.getElementById("breathingSecondsInput"),
  helperText: document.getElementById("helperText"),
  scheduleCards: document.getElementById("scheduleCards"),
  roundNote: document.getElementById("roundNote"),
  saveRoundButton: document.getElementById("saveRoundButton"),
  undoButton: document.getElementById("undoButton"),
  resetButton: document.getElementById("resetButton"),
  activeRoundControls: document.getElementById("activeRoundControls"),
  finalPanel: document.getElementById("finalPanel"),
  finalBadge: document.getElementById("finalBadge"),
  exportCsvButton: document.getElementById("exportCsvButton"),
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

  refs.saveRoundButton.addEventListener("click", saveCurrentRound);
  refs.undoButton.addEventListener("click", undoLastRound);
  refs.resetButton.addEventListener("click", resetSessionWithConfirm);
  refs.exportCsvButton.addEventListener("click", exportCsv);
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

    if (target.dataset.action === "export") {
      const entry = historyEntries.find((item) => item.id === entryId);
      if (entry) {
        exportCsvForSession(entry, "履歴のCSVを書き出しました。");
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
    currentPrimaryMinutes: "",
    currentPrimarySeconds: "",
    currentBreathingMinutes: "",
    currentBreathingSeconds: "",
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

    return {
      ...createInitialState(),
      ...JSON.parse(raw),
    };
  } catch (_error) {
    return createInitialState();
  }
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
  next.records = next.records.map((record, index) => normalizeRecord(record, index));
  next.currentSchedule = normalizeCurrentSchedule(next.currentSchedule);

  if (typeof next.historyEntryId !== "string") {
    next.historyEntryId = "";
  }

  next.historySyncSuppressed = Boolean(next.historySyncSuppressed);
  next.currentIndex = next.records.length;
  return next;
}

function normalizeHistoryEntry(entry) {
  const records = Array.isArray(entry.records)
    ? entry.records.map((record, index) => normalizeRecord(record, index))
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

function normalizeRecord(record, index) {
  if (record.stageType === "control" || Number.isFinite(record.controlStartTotalSeconds)) {
    const controlStartTotalSeconds = Number.isFinite(record.controlStartTotalSeconds)
      ? record.controlStartTotalSeconds
      : 0;
    const cards = normalizeCards(record.cards || record.schedule, "control", record.conditionId);
    const segments = Array.isArray(record.segments)
      ? record.segments.map(normalizeSegment)
      : buildControlSegments(controlStartTotalSeconds);

    return {
      stageType: "control",
      roundNumber: 0,
      label: "対照実験",
      summary: "3分間の安静時呼吸測定",
      controlStartTotalSeconds,
      controlStartDisplay: formatTime(controlStartTotalSeconds),
      cards,
      segments,
      roundNote: record.roundNote || "",
    };
  }

  const conditionId = Number(record.conditionId) || 1;
  const breathingStartTotalSeconds = Number.isFinite(record.breathingStartTotalSeconds)
    ? record.breathingStartTotalSeconds
    : 0;
  const stressStartTotalSeconds = Number.isFinite(record.stressStartTotalSeconds)
    ? record.stressStartTotalSeconds
    : Math.max(0, breathingStartTotalSeconds - STRESS_DURATION - MIN_INTERVAL);
  const stressEndTotalSeconds = Number.isFinite(record.stressEndTotalSeconds)
    ? record.stressEndTotalSeconds
    : stressStartTotalSeconds + STRESS_DURATION;
  const intervalSeconds = Number.isFinite(record.intervalSeconds)
    ? record.intervalSeconds
    : Math.max(MIN_INTERVAL, breathingStartTotalSeconds - stressEndTotalSeconds);
  const cards = normalizeCards(record.cards || record.schedule, "condition", conditionId, {
    stressStartTotalSeconds,
    breathingStartTotalSeconds,
    intervalSeconds,
  });
  const segments = Array.isArray(record.segments)
    ? record.segments.map(normalizeSegment)
    : buildConditionSegments(conditionId, stressStartTotalSeconds, breathingStartTotalSeconds);

  return {
    stageType: "condition",
    roundNumber: Number(record.roundNumber) || index + 1,
    conditionId,
    summary: CONDITIONS[conditionId]?.summary || record.summary || "",
    stressStartTotalSeconds,
    stressStartDisplay: formatTime(stressStartTotalSeconds),
    stressEndTotalSeconds,
    breathingStartTotalSeconds,
    breathingStartDisplay: formatTime(breathingStartTotalSeconds),
    intervalSeconds,
    cards,
    segments,
    roundNote: record.roundNote || "",
  };
}

function normalizeCards(cards, stageType, conditionId, fallback = {}) {
  if (Array.isArray(cards) && cards.length > 0) {
    return cards.map((card) => ({
      stepLabel: card.stepLabel || "",
      timeSeconds: Number.isFinite(card.timeSeconds) ? card.timeSeconds : 0,
      action: card.action || "",
      meta: card.meta || "",
      isEnd: Boolean(card.isEnd),
    }));
  }

  if (stageType === "control") {
    const controlStart = Number.isFinite(fallback.controlStartTotalSeconds)
      ? fallback.controlStartTotalSeconds
      : 0;
    return buildControlCards(controlStart);
  }

  const stressStart = Number.isFinite(fallback.stressStartTotalSeconds)
    ? fallback.stressStartTotalSeconds
    : 0;
  const breathingStart = Number.isFinite(fallback.breathingStartTotalSeconds)
    ? fallback.breathingStartTotalSeconds
    : stressStart + STRESS_DURATION + MIN_INTERVAL;
  return buildConditionCards(conditionId, stressStart, breathingStart);
}

function normalizeSegment(segment) {
  return {
    segmentKind: segment.segmentKind || "",
    segmentLabel: segment.segmentLabel || "",
    action: segment.action || "",
    windowStartSeconds: Number.isFinite(segment.windowStartSeconds)
      ? segment.windowStartSeconds
      : 0,
    windowEndSeconds: Number.isFinite(segment.windowEndSeconds)
      ? segment.windowEndSeconds
      : 0,
    durationSeconds: Number.isFinite(segment.durationSeconds)
      ? segment.durationSeconds
      : 0,
  };
}

function normalizeCurrentSchedule(schedule) {
  if (!schedule || typeof schedule !== "object") {
    return null;
  }

  if (schedule.stageType === "control" || Number.isFinite(schedule.controlStartTotalSeconds)) {
    const controlStartTotalSeconds = Number.isFinite(schedule.controlStartTotalSeconds)
      ? schedule.controlStartTotalSeconds
      : 0;
    return buildControlPlan(controlStartTotalSeconds);
  }

  const conditionId = Number(schedule.conditionId);
  if (Number.isFinite(conditionId)) {
    const stressStartTotalSeconds = Number.isFinite(schedule.stressStartTotalSeconds)
      ? schedule.stressStartTotalSeconds
      : 0;
    const breathingStartTotalSeconds = Number.isFinite(schedule.breathingStartTotalSeconds)
      ? schedule.breathingStartTotalSeconds
      : stressStartTotalSeconds + STRESS_DURATION + MIN_INTERVAL;
    return buildConditionPlan(
      conditionId,
      stressStartTotalSeconds,
      breathingStartTotalSeconds,
    );
  }

  return null;
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
  refs.primaryMinutesInput.value = state.currentPrimaryMinutes;
  refs.primarySecondsInput.value = state.currentPrimarySeconds;
  refs.breathingMinutesInput.value = state.currentBreathingMinutes;
  refs.breathingSecondsInput.value = state.currentBreathingSeconds;
  refs.roundNote.value = state.currentRoundNote;
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
  refs.patternSummary.textContent =
    `選択中: パターン${state.pattern}（対照安静 → 条件 ${order.join(" → ")}）`;

  refs.orderStrip.innerHTML = buildStageOrderItems()
    .map((item, index) => {
      const classes = ["order-pill"];
      if (index < state.currentIndex) {
        classes.push("done");
      } else if (index === state.currentIndex && !isComplete()) {
        classes.push("current");
      }
      return `<span class="${classes.join(" ")}">${item}</span>`;
    })
    .join("");
}

function renderProgress() {
  refs.progressBadge.textContent = `${state.records.length} / ${getTotalStageCount()} 完了`;
  refs.runningLogCount.textContent = `${state.records.length} 件`;
}

function renderCurrentRound() {
  if (!hasSelectedPattern()) {
    refs.roundTitle.textContent = "パターンを選んでください";
    refs.stepChips.innerHTML = `<span class="action-chip complete">上でパターンを選択</span>`;
    return;
  }

  if (isComplete()) {
    refs.roundTitle.textContent = "対照 + 7条件が完了しました";
    refs.stepChips.innerHTML = `
      <span class="action-chip complete">対照安静 3分 完了</span>
      <span class="action-chip complete">7条件 完了</span>
    `;
    return;
  }

  const stage = getCurrentStageInfo();
  if (!stage) {
    return;
  }

  if (stage.stageType === "control") {
    refs.roundTitle.textContent = "対照実験 / 安静3分";
    refs.stepChips.innerHTML = `
      <span class="action-chip rest">3分間 安静</span>
      <span class="action-chip complete">+180秒 終了</span>
    `;
    return;
  }

  const condition = CONDITIONS[stage.conditionId];
  refs.roundTitle.textContent = `${stage.roundNumber}回目 / ${condition.label}`;
  refs.stepChips.innerHTML = [
    `<span class="action-chip complete">3分 ストレス課題</span>`,
    `<span class="action-chip complete">10秒以上 インターバル</span>`,
    ...condition.steps.map((action, index) => {
      const actionClass = getActionClassName(action);
      return `<span class="action-chip ${actionClass}">+${STEP_OFFSETS[index]}秒 ${action}</span>`;
    }),
    `<span class="action-chip complete">+${END_OFFSET}秒 終了</span>`,
  ].join("");
}

function renderSchedule() {
  const stage = getCurrentStageInfo();
  const patternSelected = hasSelectedPattern();
  const hasSchedule = Boolean(state.currentSchedule);

  refs.saveRoundButton.disabled = !hasSchedule || !patternSelected;
  refs.undoButton.disabled = state.records.length === 0;
  refs.finalBadge.textContent = "対照 + 7条件完了";

  if (refs.activeRoundControls) {
    refs.activeRoundControls.hidden = isComplete() || !patternSelected;
  }

  if (!patternSelected) {
    refs.primaryTimeLabel.textContent = "対照安静開始時刻";
    refs.breathingTimeGroup.hidden = true;
    refs.scheduleCards.innerHTML = `
      <div class="empty-state">
        まず上でパターンを選んでください。選択後は、対照安静3分から始まります。
      </div>
    `;
    refs.helperText.textContent = "空欄は 0 として扱います。";
    return;
  }

  if (isComplete()) {
    refs.scheduleCards.innerHTML = `
      <div class="empty-state">
        対照安静と7条件が完了しました。下の完了メモとCSV書き出しを使えます。
      </div>
    `;
    refs.helperText.textContent = "必要なら完了メモに全体メモを追記できます。";
    return;
  }

  if (stage?.stageType === "control") {
    refs.primaryTimeLabel.textContent = "対照安静開始時刻";
    refs.breathingTimeGroup.hidden = true;
  } else {
    refs.primaryTimeLabel.textContent = "ストレス課題開始時刻";
    refs.breathingTimeGroup.hidden = false;
  }

  if (!hasSchedule) {
    refs.scheduleCards.innerHTML = `
      <div class="empty-state">
        ${
          stage?.stageType === "control"
            ? "対照安静の開始時刻を入れると、3分間の安静測定の開始と終了を表示します。"
            : "ストレス課題開始時刻を入れると、3分のストレス課題とその後の呼吸測定時刻を表示します。"
        }
      </div>
    `;

    refs.helperText.textContent =
      stage?.stageType === "control"
        ? "空欄は 0 として扱います。対照実験は 3分間の安静測定です。"
        : "空欄は 0 として扱います。呼吸測定開始時刻が空欄なら、ストレス課題開始 + 3分10秒 を使います。";
    return;
  }

  refs.scheduleCards.innerHTML = state.currentSchedule.cards
    .map(
      (item) => `
        <article class="schedule-card">
          <div class="schedule-step">${item.stepLabel}</div>
          <div>
            <div class="schedule-time">${formatTimeShort(item.timeSeconds)}</div>
            <div class="schedule-meta">${item.meta}</div>
          </div>
        </article>
      `,
    )
    .join("");

  if (state.currentSchedule.stageType === "control") {
    refs.helperText.textContent =
      `対照安静を ${formatTimeShort(state.currentSchedule.controlStartTotalSeconds)} から 3分間行います。`;
    return;
  }

  refs.helperText.textContent =
    `ストレス課題は ${formatTimeShort(state.currentSchedule.stressStartTotalSeconds)} から 3分間、` +
    `インターバルは ${formatDuration(state.currentSchedule.intervalSeconds)}、` +
    `呼吸測定は ${formatTimeShort(state.currentSchedule.breathingStartTotalSeconds)} から開始します。`;
}

function renderRecords() {
  if (state.records.length === 0) {
    refs.recordsList.innerHTML = `
      <div class="empty-state">
        まだ記録はありません。対照安静から始めて、各段階の記録を積み上げてください。
      </div>
    `;
    return;
  }

  refs.recordsList.innerHTML = state.records
    .map((record) => {
      const timeline = record.cards
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
              <h3 class="record-title">${getRecordTitle(record)}</h3>
              <p class="record-subtitle">${getRecordSubtitle(record)}</p>
            </div>
            <span class="badge-soft">${getRecordBadge(record)}</span>
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
      : "最後の記録完了時に履歴へ自動保存されます。";
}

function renderHistory() {
  if (historyEntries.length === 0) {
    refs.historyList.innerHTML = `
      <div class="empty-state">
        まだ保存済み履歴はありません。完了後に自動保存された内容が、ここに残ります。
      </div>
    `;
    return;
  }

  refs.historyList.innerHTML = historyEntries
    .map((entry) => {
      const title = entry.sessionLabel
        ? escapeHtml(entry.sessionLabel)
        : `パターン${entry.pattern} / ${formatDate(entry.savedAt)}`;
      const patternOrder = PATTERNS[entry.pattern]?.join(" → ") || "";
      const subtitle = patternOrder
        ? `パターン${entry.pattern}（${patternOrder}）`
        : `パターン${entry.pattern}`;
      return `
        <article class="history-card">
          <div class="history-header">
            <div>
              <h3 class="history-title">${title}</h3>
              <p class="history-subtitle">${subtitle}</p>
              <p class="history-subtitle">保存日時: ${formatDate(entry.savedAt)}</p>
            </div>
            <span class="badge-soft">${entry.records.length} 記録</span>
          </div>

          <div class="history-actions">
            <button type="button" data-action="copy" data-entry-id="${entry.id}">
              メモをコピー
            </button>
            <button type="button" data-action="export" data-entry-id="${entry.id}">
              CSVを書き出す
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
  if (!hasSelectedPattern() || isComplete()) {
    return;
  }

  const stage = getCurrentStageInfo();
  if (!stage) {
    return;
  }

  const primaryResult = parseTimeInput(
    refs.primaryMinutesInput.value.trim(),
    refs.primarySecondsInput.value.trim(),
  );

  if (!primaryResult.valid) {
    refs.helperText.textContent = primaryResult.message;
    state.currentSchedule = null;
    persistDraft();
    renderSchedule();
    return;
  }

  if (stage.stageType === "control") {
    state.currentPrimaryMinutes = refs.primaryMinutesInput.value.trim();
    state.currentPrimarySeconds = refs.primarySecondsInput.value.trim();
    state.currentBreathingMinutes = "";
    state.currentBreathingSeconds = "";
    state.currentSchedule = buildControlPlan(primaryResult.totalSeconds);
    state.historySaved = false;
    state.historySyncSuppressed = false;
    persistDraft();
    render();
    return;
  }

  const breathingMinutes = refs.breathingMinutesInput.value.trim();
  const breathingSeconds = refs.breathingSecondsInput.value.trim();
  const defaultBreathingStart =
    primaryResult.totalSeconds + STRESS_DURATION + MIN_INTERVAL;
  const useSuggestedBreathingStart =
    breathingMinutes === "" && breathingSeconds === "";

  const breathingResult = useSuggestedBreathingStart
    ? { valid: true, totalSeconds: defaultBreathingStart }
    : parseTimeInput(breathingMinutes, breathingSeconds);

  if (!breathingResult.valid) {
    refs.helperText.textContent = breathingResult.message;
    state.currentSchedule = null;
    persistDraft();
    renderSchedule();
    return;
  }

  if (breathingResult.totalSeconds < primaryResult.totalSeconds + STRESS_DURATION) {
    refs.helperText.textContent =
      "呼吸測定開始時刻は、ストレス課題終了以降の時刻にしてください。";
    state.currentSchedule = null;
    persistDraft();
    renderSchedule();
    return;
  }

  state.currentPrimaryMinutes = refs.primaryMinutesInput.value.trim();
  state.currentPrimarySeconds = refs.primarySecondsInput.value.trim();
  state.currentBreathingMinutes = useSuggestedBreathingStart ? "" : breathingMinutes;
  state.currentBreathingSeconds = useSuggestedBreathingStart ? "" : breathingSeconds;
  state.currentSchedule = buildConditionPlan(
    stage.conditionId,
    primaryResult.totalSeconds,
    breathingResult.totalSeconds,
  );
  state.historySaved = false;
  state.historySyncSuppressed = false;
  persistDraft();
  render();
}

function buildControlPlan(controlStartTotalSeconds) {
  return {
    stageType: "control",
    controlStartTotalSeconds,
    cards: buildControlCards(controlStartTotalSeconds),
    segments: buildControlSegments(controlStartTotalSeconds),
  };
}

function buildConditionPlan(conditionId, stressStartTotalSeconds, breathingStartTotalSeconds) {
  return {
    stageType: "condition",
    conditionId,
    stressStartTotalSeconds,
    stressEndTotalSeconds: stressStartTotalSeconds + STRESS_DURATION,
    breathingStartTotalSeconds,
    intervalSeconds:
      breathingStartTotalSeconds - (stressStartTotalSeconds + STRESS_DURATION),
    cards: buildConditionCards(conditionId, stressStartTotalSeconds, breathingStartTotalSeconds),
    segments: buildConditionSegments(
      conditionId,
      stressStartTotalSeconds,
      breathingStartTotalSeconds,
    ),
  };
}

function buildControlCards(controlStartTotalSeconds) {
  return [
    {
      stepLabel: "今すぐ",
      timeSeconds: controlStartTotalSeconds,
      action: "安静開始",
      meta: "対照安静 3分 を開始",
    },
    {
      stepLabel: "+180秒",
      timeSeconds: controlStartTotalSeconds + CONTROL_DURATION,
      action: "終了",
      meta: "対照安静を終了",
      isEnd: true,
    },
  ];
}

function buildControlSegments(controlStartTotalSeconds) {
  return [
    {
      segmentKind: "control_rest",
      segmentLabel: "対照安静 3分",
      action: "安静",
      windowStartSeconds: controlStartTotalSeconds,
      windowEndSeconds: controlStartTotalSeconds + CONTROL_DURATION,
      durationSeconds: CONTROL_DURATION,
    },
  ];
}

function buildConditionCards(conditionId, stressStartTotalSeconds, breathingStartTotalSeconds) {
  const condition = CONDITIONS[conditionId];
  const intervalSeconds =
    breathingStartTotalSeconds - (stressStartTotalSeconds + STRESS_DURATION);

  return [
    {
      stepLabel: "",
      timeSeconds: stressStartTotalSeconds,
      action: "ストレス課題開始",
      meta: "ストレス課題開始",
    },
    {
      stepLabel: "",
      timeSeconds: stressStartTotalSeconds + STRESS_DURATION,
      action: "ストレス課題終了",
      meta: "ストレス課題終了",
    },
    ...condition.steps.map((action, index) => ({
      stepLabel: ["1", "2", "3", "Rest"][index],
      timeSeconds: breathingStartTotalSeconds + STEP_OFFSETS[index],
      action,
      meta: `${action} を行う`,
    })),
    {
      stepLabel: "End",
      timeSeconds: breathingStartTotalSeconds + END_OFFSET,
      action: "終了",
      meta: "この条件を終了",
      isEnd: true,
    },
  ];
}

function buildConditionSegments(conditionId, stressStartTotalSeconds, breathingStartTotalSeconds) {
  const condition = CONDITIONS[conditionId];
  return [
    {
      segmentKind: "stress_task",
      segmentLabel: "ストレス課題 3分",
      action: "ストレス課題",
      windowStartSeconds: stressStartTotalSeconds,
      windowEndSeconds: stressStartTotalSeconds + STRESS_DURATION,
      durationSeconds: STRESS_DURATION,
    },
    ...condition.steps.map((action, index) => ({
      segmentKind: "measurement",
      segmentLabel: `${STEP_OFFSETS[index]}-${STEP_OFFSETS[index] + STEP_DURATION}秒`,
      action,
      windowStartSeconds: breathingStartTotalSeconds + STEP_OFFSETS[index],
      windowEndSeconds:
        breathingStartTotalSeconds + STEP_OFFSETS[index] + STEP_DURATION,
      durationSeconds: STEP_DURATION,
    })),
  ];
}

function saveCurrentRound() {
  if (!state.currentSchedule || isComplete()) {
    return;
  }

  const stage = getCurrentStageInfo();
  if (!stage) {
    return;
  }

  const roundNote = state.currentRoundNote.trim();
  const record =
    state.currentSchedule.stageType === "control"
      ? {
          stageType: "control",
          roundNumber: 0,
          label: "対照実験",
          summary: "3分間の安静時呼吸測定",
          controlStartTotalSeconds: state.currentSchedule.controlStartTotalSeconds,
          controlStartDisplay: formatTime(state.currentSchedule.controlStartTotalSeconds),
          cards: clone(state.currentSchedule.cards),
          segments: clone(state.currentSchedule.segments),
          roundNote,
        }
      : {
          stageType: "condition",
          roundNumber: stage.roundNumber,
          conditionId: state.currentSchedule.conditionId,
          summary: CONDITIONS[state.currentSchedule.conditionId].summary,
          stressStartTotalSeconds: state.currentSchedule.stressStartTotalSeconds,
          stressStartDisplay: formatTime(state.currentSchedule.stressStartTotalSeconds),
          stressEndTotalSeconds: state.currentSchedule.stressEndTotalSeconds,
          breathingStartTotalSeconds: state.currentSchedule.breathingStartTotalSeconds,
          breathingStartDisplay: formatTime(state.currentSchedule.breathingStartTotalSeconds),
          intervalSeconds: state.currentSchedule.intervalSeconds,
          cards: clone(state.currentSchedule.cards),
          segments: clone(state.currentSchedule.segments),
          roundNote,
        };

  state.records = [...state.records, record];
  state.currentIndex = state.records.length;
  state.currentPrimaryMinutes = "";
  state.currentPrimarySeconds = "";
  state.currentBreathingMinutes = "";
  state.currentBreathingSeconds = "";
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

  const shouldUndo = window.confirm("直前の記録を取り消しますか？");
  if (!shouldUndo) {
    return;
  }

  const previous = state.records[state.records.length - 1];
  removeLinkedHistoryEntry();
  state.records = state.records.slice(0, -1);
  state.currentIndex = state.records.length;
  state.currentRoundNote = previous.roundNote || "";
  state.historySaved = false;
  state.historyEntryId = "";
  state.historySyncSuppressed = false;

  if (previous.stageType === "control") {
    state.currentPrimaryMinutes = Math.floor(previous.controlStartTotalSeconds / 60).toString();
    state.currentPrimarySeconds = (previous.controlStartTotalSeconds % 60)
      .toString()
      .padStart(2, "0");
    state.currentBreathingMinutes = "";
    state.currentBreathingSeconds = "";
    state.currentSchedule = buildControlPlan(previous.controlStartTotalSeconds);
  } else {
    state.currentPrimaryMinutes = Math.floor(previous.stressStartTotalSeconds / 60).toString();
    state.currentPrimarySeconds = (previous.stressStartTotalSeconds % 60)
      .toString()
      .padStart(2, "0");
    state.currentBreathingMinutes = Math.floor(
      previous.breathingStartTotalSeconds / 60,
    ).toString();
    state.currentBreathingSeconds = (previous.breathingStartTotalSeconds % 60)
      .toString()
      .padStart(2, "0");
    state.currentSchedule = buildConditionPlan(
      previous.conditionId,
      previous.stressStartTotalSeconds,
      previous.breathingStartTotalSeconds,
    );
  }

  persistDraft();
  render();
  scrollToNextFocus();
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
      state.currentPrimaryMinutes ||
      state.currentPrimarySeconds ||
      state.currentBreathingMinutes ||
      state.currentBreathingSeconds ||
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
        state.currentPrimaryMinutes ||
        state.currentPrimarySeconds ||
        state.currentBreathingMinutes ||
        state.currentBreathingSeconds ||
        state.currentRoundNote.trim()),
  );
}

function getTotalStageCount() {
  return 1 + Object.keys(CONDITIONS).length;
}

function buildStageOrderItems() {
  if (!hasSelectedPattern()) {
    return [];
  }

  return ["対照安静", ...PATTERNS[state.pattern].map((conditionId, index) => `${index + 1}回目 条件${conditionId}`)];
}

function getCurrentStageInfo() {
  if (!hasSelectedPattern()) {
    return null;
  }

  if (state.currentIndex === 0) {
    return {
      stageType: "control",
    };
  }

  const conditionIndex = state.currentIndex - 1;
  const conditionId = PATTERNS[state.pattern][conditionIndex];
  if (!conditionId) {
    return null;
  }

  return {
    stageType: "condition",
    roundNumber: state.currentIndex,
    conditionId,
  };
}

function hasSelectedPattern() {
  return Boolean(state.pattern && PATTERNS[state.pattern]);
}

function isComplete() {
  return state.records.length >= getTotalStageCount();
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

function buildHistoryEntry(savedAt, entryId) {
  const records = state.records.map((record, index) => normalizeRecord(record, index));
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
    records: clone(records),
    sessionNote: state.sessionNote.trim(),
    savedAt,
    memoText,
  };
}

function buildMemoText(session) {
  const lines = [];

  if (session.sessionLabel.trim()) {
    lines.push(`セッション名: ${session.sessionLabel.trim()}`);
  }
  const patternOrder = PATTERNS[session.pattern]?.join(" → ") || "";
  lines.push(
    patternOrder
      ? `パターン${session.pattern}: ${patternOrder}`
      : `パターン${session.pattern}`,
  );
  lines.push(`作成日時: ${formatDate(session.savedAt)}`);
  lines.push("");

  session.records.forEach((record) => {
    lines.push(getRecordTitle(record));

    if (record.stageType === "control") {
      lines.push(`対照安静開始: ${record.controlStartDisplay}`);
    } else {
      lines.push(`ストレス開始: ${record.stressStartDisplay}`);
      lines.push(`呼吸開始: ${record.breathingStartDisplay}`);
    }

    record.cards.forEach((item) => {
      lines.push(`${formatTime(item.timeSeconds)} ${item.action}`);
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

function getRecordTitle(record) {
  if (record.stageType === "control") {
    return "対照実験 / 安静3分";
  }

  return `${record.roundNumber}回目 / 条件${record.conditionId}`;
}

function getRecordSubtitle(record) {
  if (record.stageType === "control") {
    return `対照安静開始: ${formatTimeShort(record.controlStartTotalSeconds)}`;
  }

  return (
    `ストレス開始: ${formatTimeShort(record.stressStartTotalSeconds)} / ` +
    `呼吸開始: ${formatTimeShort(record.breathingStartTotalSeconds)}`
  );
}

function getRecordBadge(record) {
  if (record.stageType === "control") {
    return "安静 3分";
  }

  return record.summary || "";
}

function exportCsv() {
  if (!isComplete()) {
    refs.saveStatus.textContent = "完了後にCSVを書き出せます。";
    return;
  }

  exportCsvForSession(
    {
      sessionLabel: state.sessionLabel,
      pattern: state.pattern,
      records: state.records,
    },
    "区間時刻つきのCSVを書き出しました。",
  );
}

function exportCsvForSession(session, successMessage) {
  const rows = buildExportRows(session);
  const csvText = toCsv(rows);
  const filename = createExportFilename(session);
  downloadTextFile(filename, csvText, "text/csv;charset=utf-8");
  refs.saveStatus.textContent = successMessage;
}

function buildExportRows(session) {
  return session.records.flatMap((record) =>
    record.segments.map((segment) => ({
      session_label: session.sessionLabel.trim(),
      pattern: session.pattern,
      stage_label: getRecordTitle(record),
      round_number: record.stageType === "control" ? 0 : record.roundNumber,
      condition_id: record.conditionId || "",
      segment_kind: segment.segmentKind,
      segment_label: segment.segmentLabel,
      action: segment.action,
      window_start_real_seconds: segment.windowStartSeconds,
      window_end_real_seconds: segment.windowEndSeconds,
      window_start_display: formatTimeShort(segment.windowStartSeconds),
      window_end_display: formatTimeShort(segment.windowEndSeconds),
      duration_seconds: segment.durationSeconds,
      stress_start_real_seconds:
        record.stageType === "condition" ? record.stressStartTotalSeconds : "",
      stress_end_real_seconds:
        record.stageType === "condition" ? record.stressEndTotalSeconds : "",
      breathing_start_real_seconds:
        record.stageType === "condition"
          ? record.breathingStartTotalSeconds
          : record.controlStartTotalSeconds,
      interval_seconds: record.stageType === "condition" ? record.intervalSeconds : "",
      note: record.roundNote || "",
    })),
  );
}

function toCsv(rows) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => escapeCsvCell(row[header]))
        .join(","),
    ),
  ];

  return `\uFEFF${csvRows.join("\r\n")}`;
}

function escapeCsvCell(value) {
  const text = value == null ? "" : String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n") || text.includes("\r")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function createExportFilename(session) {
  const label = session.sessionLabel.trim()
    ? session.sessionLabel.trim().replace(/[\\/:*?"<>|]/g, "_")
    : `pattern-${session.pattern}`;
  const stamp = new Date().toISOString().replaceAll(":", "-").slice(0, 19);
  return `${label}-respiration-summary-${stamp}.csv`;
}

function downloadTextFile(filename, text, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
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

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  if (minutes === 0) {
    return `${seconds}秒`;
  }
  if (seconds === 0) {
    return `${minutes}分`;
  }
  return `${minutes}分${String(seconds).padStart(2, "0")}秒`;
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
  if (action === "安静" || action === "香りなし") {
    return "rest";
  }
  if (action === "香り") {
    return "fragrance";
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
