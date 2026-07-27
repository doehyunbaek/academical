const TODAY = createReferenceToday();
const STORAGE_EVENTS = "academical.events.v1";
const STORAGE_CUSTOM_CALENDARS = "academical.customCalendars.v1";
const STORAGE_CALENDAR_ORDER = "academical.calendarOrder.v1";
const STORAGE_CALENDAR_RENAMES = "academical.calendarRenames.v1";
const STORAGE_CALENDAR_COLORS = "academical.calendarColors.v1";
const STORAGE_VISIBLE_CALENDARS = "academical.visibleCalendars.v1";
const STORAGE_ARCHIVED_CALENDARS = "academical.archivedCalendars.v1";
const STORAGE_DELETED_CALENDARS = "academical.deletedCalendars.v1";
const STORAGE_PAPER_TASKS = "academical.paperTasks.v1";
const STORAGE_SYNC_UPDATED_AT = "academical.sync.updatedAt.v1";
const STORAGE_SIDEBAR_LOCATION = "academical.sidebarLocation.v1";
const STORAGE_BOTTOM_SIDEBAR_HEIGHT = "academical.bottomSidebarHeight.v1";
const STORAGE_DEADLINE_FILTER_TAGS = "academical.deadlineFilterTags.v1";
const STORAGE_SELECTED_DEADLINES = "academical.selectedDeadlines.v1";
const STORAGE_DEADLINE_UPDATE_PREFIX = "academical.deadlineUpdate.v1";
const STORAGE_DBLP_SEARCH_ENDPOINT = "academical.dblpSearchEndpoint.v1";
const DEADLINE_UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DBLP_SEARCH_ENDPOINTS = [
  "https://dblp.uni-trier.de/search/publ/api",
  "https://dblp.org/search/publ/api",
];
const DBLP_REQUEST_TIMEOUT_MS = 15_000;

const VIEW_LABELS = {
  week: "Week",
  month: "Month",
  "four-week": "4 weeks",
  heatmap: "Heatmap",
};
const WEEK_START_DAY = 1; // Monday
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const WEEK_HOUR_HEIGHT = 72;
const WEEK_SLOT_GRANULARITY_MINUTES = 15;
const DEFAULT_EVENT_DURATION_MINUTES = 60;
const REPEAT_LABELS = {
  none: "Does not repeat",
  daily: "Daily",
  weekly: "Weekly",
  weekdays: "Every weekday",
};
const ACTIVITY_CATEGORIES = [
  { key: "read", label: "Read", color: "#8884d8" },
  { key: "code", label: "Code", color: "#82ca9d" },
  { key: "write", label: "Write", color: "#ffc658" },
  { key: "meet", label: "Meet", color: "#d84e4e" },
];
const DEADLINE_TYPES = [
  { name: "ICSE", tag: "ICSE", type: "venue" },
  { name: "FSE", tag: "FSE", type: "venue" },
  { name: "ASE", tag: "ASE", type: "venue" },
  { name: "ISSTA", tag: "ISSTA", type: "venue" },
  { name: "OOPSLA", tag: "OOPSLA", type: "venue" },
];
let deadlineConferences = [];

const defaultCalendars = [
  { id: "teaching", name: "Teaching", color: "#1a73e8", builtIn: true },
  { id: "research", name: "Research", color: "#188038", builtIn: true },
  { id: "deadlines", name: "Deadlines", color: "#d93025", builtIn: true },
  { id: "personal", name: "Personal", color: "#9334e6", builtIn: true },
  { id: "tasks", name: "Tasks", color: "#f9ab00", builtIn: true },
];
const importedCalendarColors = ["#1a73e8", "#188038", "#d93025", "#9334e6", "#f9ab00", "#0891b2", "#c026d3", "#ea580c"];
const paperTagColors = ["blue", "green", "rebeccapurple", "darkorange", "teal", "crimson", "deeppink", "olive", "navy", "maroon"];
const basicColorKeywords = [
  "black",
  "silver",
  "gray",
  "white",
  "maroon",
  "red",
  "purple",
  "fuchsia",
  "green",
  "lime",
  "olive",
  "yellow",
  "navy",
  "blue",
  "teal",
  "aqua",
  "transparent",
  "rebeccapurple",
];
let customCalendars = loadCustomCalendars();
let calendarNameOverrides = loadCalendarNameOverrides();
let calendarColorOverrides = loadCalendarColorOverrides();
let calendarOrderIds = loadCalendarOrderIds();
let calendars = getCalendars();

const seedEvents = [
  {
    id: "seed-1",
    title: "CS seminar prep",
    date: "2026-07-01",
    time: "09:00",
    calendar: "teaching",
    notes: "Finalize slides and reading prompts.",
  },
  {
    id: "seed-2",
    title: "Reading group",
    date: "2026-07-02",
    time: "14:00",
    calendar: "research",
    notes: "Discuss papers on calendar UX and temporal interfaces.",
  },
  {
    id: "seed-3",
    title: "Grant draft due",
    date: "2026-07-06",
    time: "17:00",
    calendar: "deadlines",
    notes: "Send the narrative draft to collaborators.",
  },
  {
    id: "seed-4",
    title: "Office hours",
    date: "2026-07-08",
    time: "11:00",
    calendar: "teaching",
    notes: "Room 420 and Zoom.",
  },
  {
    id: "seed-5",
    title: "Lab meeting",
    date: "2026-07-09",
    time: "10:30",
    calendar: "research",
    notes: "Prototype demo and feedback.",
  },
  {
    id: "seed-6",
    title: "Conference registration",
    date: "2026-07-15",
    time: "12:00",
    calendar: "deadlines",
    notes: "Early-bird registration closes at noon.",
  },
  {
    id: "seed-7",
    title: "Data analysis sprint",
    date: "2026-07-20",
    time: "09:30",
    calendar: "research",
    notes: "Block the morning for focused analysis.",
  },
  {
    id: "seed-8",
    title: "Advisor sync",
    date: "2026-07-24",
    time: "15:00",
    calendar: "personal",
    notes: "Bring milestone checklist.",
  },
  {
    id: "seed-9",
    title: "Paper submission",
    date: "2026-07-31",
    time: "23:59",
    calendar: "deadlines",
    notes: "Upload camera-ready files.",
  },
];

const els = {
  accountButton: document.querySelector("#accountButton"),
  accountPopover: document.querySelector("#accountPopover"),
  archivedCalendarList: document.querySelector("#archivedCalendarList"),
  archivedCalendarsCaret: document.querySelector("#archivedCalendarsCaret"),
  archivedCalendarsSection: document.querySelector("#archivedCalendarsSection"),
  archivedCalendarsToggle: document.querySelector("#archivedCalendarsToggle"),
  brandDay: document.querySelector("#brandDay"),
  addCalendarButton: document.querySelector("#addCalendarButton"),
  calendarColorInput: document.querySelector("#calendarColorInput"),
  calendarColorPalette: document.querySelector("#calendarColorPalette"),
  calendarFileInput: document.querySelector("#calendarFileInput"),
  calendarModal: document.querySelector("#calendarModal"),
  calendarModalForm: document.querySelector("#calendarModalForm"),
  calendarNameInput: document.querySelector("#calendarNameInput"),
  calendarToggles: document.querySelector("#calendarToggles"),
  cancelCalendarModal: document.querySelector("#cancelCalendarModal"),
  cancelEvent: document.querySelector("#cancelEvent"),
  closeCalendarModal: document.querySelector("#closeCalendarModal"),
  closeModal: document.querySelector("#closeModal"),
  deleteEvent: document.querySelector("#deleteEvent"),
  deletePaper: document.querySelector("#deletePaper"),
  deleteSeriesEvent: document.querySelector("#deleteSeriesEvent"),
  dblpSearchCount: document.querySelector("#dblpSearchCount"),
  dblpSearchInput: document.querySelector("#dblpSearchInput"),
  dblpLoadMore: document.querySelector("#dblpLoadMore"),
  dblpSearchModal: document.querySelector("#dblpSearchModal"),
  dblpPreferredVenuesInput: document.querySelector("#dblpPreferredVenuesInput"),
  dblpSearchResults: document.querySelector("#dblpSearchResults"),
  closeDblpSearchModal: document.querySelector("#closeDblpSearchModal"),
  deadlineDaysLeft: document.querySelector("#deadlineDaysLeft"),
  deadlinePanel: document.querySelector("#deadlinePanel"),
  editCalendarColorInput: document.querySelector("#editCalendarColorInput"),
  editCalendarColorPalette: document.querySelector("#editCalendarColorPalette"),
  editCalendarForm: document.querySelector("#editCalendarForm"),
  editCalendarId: document.querySelector("#editCalendarId"),
  editCalendarModal: document.querySelector("#editCalendarModal"),
  editCalendarNameInput: document.querySelector("#editCalendarNameInput"),
  calendarTransferSummary: document.querySelector("#calendarTransferSummary"),
  calendarTransferTarget: document.querySelector("#calendarTransferTarget"),
  transferCalendarEvents: document.querySelector("#transferCalendarEvents"),
  exportCalendarJson: document.querySelector("#exportCalendarJson"),
  cancelEditCalendarModal: document.querySelector("#cancelEditCalendarModal"),
  closeEditCalendarModal: document.querySelector("#closeEditCalendarModal"),
  eventCalendar: document.querySelector("#eventCalendar"),
  eventDate: document.querySelector("#eventDate"),
  eventDurationMinutes: document.querySelector("#eventDurationMinutes"),
  eventEndTime: document.querySelector("#eventEndTime"),
  eventForm: document.querySelector("#eventForm"),
  eventId: document.querySelector("#eventId"),
  eventModal: document.querySelector("#eventModal"),
  eventNotes: document.querySelector("#eventNotes"),
  eventOccurrenceDate: document.querySelector("#eventOccurrenceDate"),
  eventPaperAssignment: document.querySelector("#eventPaperAssignment"),
  eventPaperAssignmentCount: document.querySelector("#eventPaperAssignmentCount"),
  eventPaperAssignmentList: document.querySelector("#eventPaperAssignmentList"),
  eventRepeat: document.querySelector("#eventRepeat"),
  eventRepeatUntil: document.querySelector("#eventRepeatUntil"),
  eventRepeatUntilField: document.querySelector("#eventRepeatUntilField"),
  recurrenceScopeModal: document.querySelector("#recurrenceScopeModal"),
  closeRecurrenceScope: document.querySelector("#closeRecurrenceScope"),
  cancelRecurrenceScope: document.querySelector("#cancelRecurrenceScope"),
  recurrenceScopeOptions: document.querySelectorAll("[data-recurrence-scope]"),
  eventTime: document.querySelector("#eventTime"),
  eventTitle: document.querySelector("#eventTitle"),
  monthGrid: document.querySelector("#monthGrid"),
  monthTitle: document.querySelector("#monthTitle"),
  nextMonth: document.querySelector("#nextMonth"),
  paperEditFields: document.querySelector("#paperEditFields"),
  paperEditIdentity: document.querySelector("#paperEditIdentity"),
  paperEditSource: document.querySelector("#paperEditSource"),
  paperEditTitle: document.querySelector("#paperEditTitle"),
  paperFilterInput: document.querySelector("#paperFilterInput"),
  paperModal: document.querySelector("#paperModal"),
  paperModalFieldLabel: document.querySelector("#paperModalFieldLabel"),
  paperModalForm: document.querySelector("#paperModalForm"),
  paperModalInput: document.querySelector("#paperModalInput"),
  paperModalInputField: document.querySelector("#paperModalInputField"),
  paperModalSubmit: document.querySelector("#paperModalSubmit"),
  paperNoteInput: document.querySelector("#paperNoteInput"),
  paperTagsInput: document.querySelector("#paperTagsInput"),
  paperTagSuggestionList: document.querySelector("#paperTagSuggestionList"),
  paperTagSuggestions: document.querySelector("#paperTagSuggestions"),
  paperTaskCount: document.querySelector("#paperTaskCount"),
  paperTaskList: document.querySelector("#paperTaskList"),
  readPaperCount: document.querySelector("#readPaperCount"),
  readPaperList: document.querySelector("#readPaperList"),
  previousMonth: document.querySelector("#previousMonth"),
  searchInput: document.querySelector("#searchInput"),
  searchResults: document.querySelector("#searchResults"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsForm: document.querySelector("#settingsForm"),
  settingsModal: document.querySelector("#settingsModal"),
  closeSettingsModal: document.querySelector("#closeSettingsModal"),
  cancelSettingsModal: document.querySelector("#cancelSettingsModal"),
  closePaperModal: document.querySelector("#closePaperModal"),
  cancelPaperModal: document.querySelector("#cancelPaperModal"),
  sidebarTabs: document.querySelector("#sidebarTabs"),
  sidebarResizer: document.querySelector("#sidebarResizer"),
  sidebarTimeAnalysisContent: document.querySelector("#sidebarTimeAnalysisContent"),
  sidebarTimeAnalysisEmpty: document.querySelector("#sidebarTimeAnalysisEmpty"),
  sidebarTimeAnalysisList: document.querySelector("#sidebarTimeAnalysisList"),
  sidebarTimeAnalysisRange: document.querySelector("#sidebarTimeAnalysisRange"),
  sidebarTimeAnalysisSummary: document.querySelector("#sidebarTimeAnalysisSummary"),
  weeklyActivityChart: document.querySelector("#weeklyActivityChart"),
  weeklyActivityChartBody: document.querySelector("#weeklyActivityChartBody"),
  sidebarToggle: document.querySelector("#sidebarToggle"),
  todayButton: document.querySelector("#todayButton"),
  toast: document.querySelector("#toast"),
  syncAuthButton: document.querySelector("#syncAuthButton"),
  syncStatus: document.querySelector("#syncStatus"),
  userAvatar: document.querySelector("#userAvatar"),
  viewSelect: document.querySelector("#viewSelect"),
  weekdayRow: document.querySelector(".weekday-row"),
};

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});
const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const compactDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const searchResultDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const searchResultTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});
const shortMonthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
});
const shortWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});
const rangeMonthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const rangeFullMonthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
});

let currentView = "month";
let visibleMonth = startOfMonth(TODAY);
let selectedDate = new Date(TODAY);
let viewAnchorDate = new Date(TODAY);
let events = loadEvents();
let visibleCalendars = loadVisibleCalendars();
let archivedCalendarIds = loadArchivedCalendarIds();
let deletedCalendarIds = loadDeletedCalendarIds();
let archivedCalendarsExpanded = false;
let sidebarLocation = loadSidebarLocation();
let bottomSidebarHeight = loadBottomSidebarHeight();
let activeSidebarPanel = "calendar";
let paperTasks = loadPaperTasks();
let paperFilterQuery = "";
let searchQuery = "";
let heatmapDetailsAnchor = null;
let heatmapRangeMode = "events";
let deadlineFilterTags = loadDeadlineFilterTags();
let selectedDeadlineIds = loadSelectedDeadlineIds();
let activeWeekRangeDrag = null;
let activeWeekEventDrag = null;
let activeMonthEventDrag = null;
let suppressNextWeekSlotClick = false;
let suppressNextWeekEventClick = false;
let suppressNextMonthEventClick = false;
let firebaseSync = createFirebaseSyncState();
let activeEventPaperSnapshots = [];
let pendingRecurringEdit = null;
let editingPaperTaskId = "";
let draggedCalendarId = "";
let activeSidebarResize = null;
let activeDblpSearchController = null;
let dblpSearchRequestId = 0;
let dblpSearchState = null;

init();

function init() {
  els.brandDay.textContent = TODAY.getDate();
  applySidebarLocation();
  applyBottomSidebarHeight();
  setSidebarPanel(activeSidebarPanel);
  renderColorPalette(els.calendarColorPalette, els.calendarColorInput, "blue");
  renderColorPalette(els.editCalendarColorPalette, els.editCalendarColorInput, "blue");
  populateCalendarSelect();
  renderCalendarToggles();
  renderArchivedCalendars();
  bindEvents();
  renderPaperTasks();
  renderDeadlinePanel();
  void loadDeadlineConferences();
  render();
  initFirebaseSync();
  setInterval(updateNowIndicator, 60_000);
  setInterval(updateDeadlineTimers, 1_000);
}

function bindEvents() {
  els.accountButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleAccountPopover();
  });

  document.addEventListener("click", (event) => {
    if (!els.accountPopover.hidden && !event.target.closest(".account-menu")) {
      closeAccountPopover();
    }
    if (!event.target.closest(".search-shell")) hideSearchResults();
  });

  document.addEventListener("click", (event) => {
    if (currentView !== "heatmap" || !heatmapDetailsAnchor) return;
    if (event.target.closest(".heatmap-details, .heatmap-day")) return;
    heatmapDetailsAnchor = null;
    renderMonthGrid();
  });

  els.sidebarToggle.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");
  });
  els.sidebarResizer.addEventListener("pointerdown", startSidebarResize);
  els.sidebarResizer.addEventListener("keydown", handleSidebarResizeKeydown);
  els.sidebarTabs.addEventListener("click", (event) => {
    const button = event.target.closest(".sidebar-tab");
    if (!button) return;
    setSidebarPanel(button.dataset.panel);
  });
  els.settingsButton.addEventListener("click", openSettingsModal);
  els.settingsForm.addEventListener("submit", saveSettingsFromDialog);
  els.closeSettingsModal.addEventListener("click", closeSettingsModal);
  els.cancelSettingsModal.addEventListener("click", closeSettingsModal);
  els.settingsModal.addEventListener("click", (event) => {
    if (event.target === els.settingsModal) closeSettingsModal();
  });
  els.closeDblpSearchModal.addEventListener("click", closeDblpSearchModal);
  els.dblpLoadMore.addEventListener("click", () => void loadMoreDblpResults());
  els.dblpSearchModal.addEventListener("click", (event) => {
    if (event.target === els.dblpSearchModal) closeDblpSearchModal();
  });
  els.dblpSearchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.isComposing) return;
    event.preventDefault();
    void searchDblp(els.dblpSearchInput.value);
  });

  els.todayButton.addEventListener("click", () => {
    const now = getNow();
    heatmapDetailsAnchor = null;
    selectedDate = new Date(now);
    viewAnchorDate = new Date(now);
    visibleMonth = startOfMonth(now);
    render();
    if (currentView === "week") requestAnimationFrame(centerWeekScrollerOnNow);
    showToast("Jumped to today");
  });

  els.previousMonth.addEventListener("click", () => navigatePeriod(-1));
  els.nextMonth.addEventListener("click", () => navigatePeriod(1));

  els.searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value.trim().toLowerCase();
    renderSearchResults();
    renderMonthGrid();
    renderSidebarTimeAnalysisIfActive();
  });
  els.searchInput.addEventListener("focus", renderSearchResults);
  els.searchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    els.searchInput.value = "";
    searchQuery = "";
    hideSearchResults();
    renderMonthGrid();
    renderSidebarTimeAnalysisIfActive();
  });

  els.paperFilterInput.addEventListener("input", (event) => {
    paperFilterQuery = event.target.value.trim().toLowerCase();
    renderPaperTasks();
  });

  els.eventTitle.addEventListener("input", () => {
    renderEventPaperAssignment(getSelectedEventPaperIds());
  });
  els.eventTime.addEventListener("input", updateEventEndTimeFromDuration);
  els.eventEndTime.addEventListener("input", updateEventDurationFromEndTime);

  els.viewSelect.addEventListener("change", (event) => {
    setView(event.target.value);
  });

  els.addCalendarButton.addEventListener("click", openCalendarModal);
  els.calendarModalForm.addEventListener("submit", createCalendarFromDialog);
  els.closeCalendarModal.addEventListener("click", closeCalendarModal);
  els.cancelCalendarModal.addEventListener("click", closeCalendarModal);
  els.calendarModal.addEventListener("click", (event) => {
    if (event.target === els.calendarModal) closeCalendarModal();
  });
  els.editCalendarForm.addEventListener("submit", saveEditedCalendar);
  els.transferCalendarEvents.addEventListener("click", transferCalendarEvents);
  els.exportCalendarJson.addEventListener("click", exportCalendarJson);
  els.closeEditCalendarModal.addEventListener("click", closeEditCalendarModal);
  els.cancelEditCalendarModal.addEventListener("click", closeEditCalendarModal);
  els.editCalendarModal.addEventListener("click", (event) => {
    if (event.target === els.editCalendarModal) closeEditCalendarModal();
  });
  els.archivedCalendarsToggle.addEventListener("click", toggleArchivedCalendars);
  els.syncAuthButton.addEventListener("click", toggleFirebaseAuth);
  els.paperModalForm.addEventListener("submit", addPaperTasksFromInput);
  els.paperModalInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      els.paperModalForm.requestSubmit();
    }
  });
  els.closePaperModal.addEventListener("click", closePaperModal);
  els.cancelPaperModal.addEventListener("click", closePaperModal);
  els.deletePaper.addEventListener("click", deleteEditingPaperTask);
  els.paperModal.addEventListener("click", (event) => {
    if (event.target === els.paperModal) closePaperModal();
  });

  els.closeModal.addEventListener("click", closeEventDialog);
  els.cancelEvent.addEventListener("click", closeEventDialog);
  els.eventModal.addEventListener("click", (event) => {
    if (event.target === els.eventModal) closeEventDialog();
  });
  els.closeRecurrenceScope.addEventListener("click", closeRecurrenceScopeModal);
  els.cancelRecurrenceScope.addEventListener("click", closeRecurrenceScopeModal);
  els.recurrenceScopeModal.addEventListener("click", (event) => {
    if (event.target === els.recurrenceScopeModal) closeRecurrenceScopeModal();
  });
  els.recurrenceScopeOptions.forEach((button) => {
    button.addEventListener("click", () => applyRecurringEdit(button.dataset.recurrenceScope));
  });

  document.addEventListener("keydown", (event) => {
    const isModalOpen = els.eventModal.classList.contains("is-open");
    const isPaperModalOpen = els.paperModal.classList.contains("is-open");
    const isCalendarModalOpen = els.calendarModal.classList.contains("is-open");
    const isEditCalendarModalOpen = els.editCalendarModal.classList.contains("is-open");
    const isSettingsModalOpen = els.settingsModal.classList.contains("is-open");
    const isDblpSearchModalOpen = els.dblpSearchModal.classList.contains("is-open");
    const isRecurrenceScopeModalOpen = els.recurrenceScopeModal.classList.contains("is-open");

    if (event.key === "Escape" && isRecurrenceScopeModalOpen) {
      closeRecurrenceScopeModal();
      return;
    }

    if (event.key === "Escape" && !els.accountPopover.hidden) {
      closeAccountPopover();
      return;
    }

    if (event.key === "Escape" && heatmapDetailsAnchor) {
      heatmapDetailsAnchor = null;
      renderMonthGrid();
      return;
    }

    if (event.key === "Escape" && isDblpSearchModalOpen) {
      closeDblpSearchModal();
      return;
    }

    if (event.key === "Escape" && isPaperModalOpen) {
      closePaperModal();
      return;
    }

    if (event.key === "Escape" && isCalendarModalOpen) {
      closeCalendarModal();
      return;
    }

    if (event.key === "Escape" && isEditCalendarModalOpen) {
      closeEditCalendarModal();
      return;
    }

    if (event.key === "Escape" && isSettingsModalOpen) {
      closeSettingsModal();
      return;
    }

    if (event.key === "Escape" && isModalOpen) {
      closeEventDialog();
      return;
    }

    if (isRecurrenceScopeModalOpen || isDblpSearchModalOpen || isPaperModalOpen || isCalendarModalOpen || isEditCalendarModalOpen || isSettingsModalOpen) return;

    if (isModalOpen) {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        els.eventForm.requestSubmit();
      } else if (event.key === "Backspace" && els.eventId.value && !isTypingTarget(event.target)) {
        event.preventDefault();
        deleteActiveEvent();
      } else if (event.key === "0" && !isTypingTarget(event.target)) {
        event.preventDefault();
        setEventDurationHoursShortcut(0);
      } else if (["-", "="].includes(event.key) && !isTypingTarget(event.target)) {
        event.preventDefault();
        adjustEventEndTimeShortcut(event.key === "=" ? WEEK_SLOT_GRANULARITY_MINUTES : -WEEK_SLOT_GRANULARITY_MINUTES);
      } else if (/^[1-9]$/.test(event.key) && !isTypingTarget(event.target)) {
        event.preventDefault();
        setEventDurationHoursShortcut(Number(event.key));
      }
      return;
    }

    if (isTypingTarget(event.target)) return;

    const key = event.key.toLowerCase();
    if (event.ctrlKey && !event.metaKey && !event.altKey && ["1", "2", "3", "4"].includes(key)) {
      event.preventDefault();
      selectSidebarPanelByPosition(Number(key) - 1);
      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (key === "/") {
      event.preventDefault();
      els.searchInput.focus();
    } else if (key === "j") {
      event.preventDefault();
      navigatePeriod(1);
    } else if (key === "k") {
      event.preventDefault();
      navigatePeriod(-1);
    } else if (key === "t") {
      event.preventDefault();
      jumpToCurrentTime();
    } else if (key === "p") {
      event.preventDefault();
      openPaperModal();
    } else if (key === "o") {
      event.preventDefault();
      openDblpSearchModal();
    } else if (key === "a") {
      event.preventDefault();
      selectAllCalendars();
    } else if (["q", "w", "e", "r"].includes(key)) {
      event.preventDefault();
      soloCalendar(["q", "w", "e", "r"].indexOf(key));
    } else if (key === "1") {
      event.preventDefault();
      if (currentView === "heatmap") {
        toggleHeatmapRangeMode();
      } else {
        heatmapRangeMode = "year";
        setView("heatmap");
      }
    } else if (key === "2") {
      event.preventDefault();
      setView("week");
    } else if (key === "3") {
      event.preventDefault();
      setView("month");
    } else if (key === "4") {
      event.preventDefault();
      setView("four-week");
    }
  });

  els.eventForm.addEventListener("submit", saveEventFromDialog);
  els.eventRepeat.addEventListener("change", updateEventRepeatUntilField);
  els.eventDate.addEventListener("change", updateEventRepeatUntilField);
  els.eventRepeatUntil.addEventListener("input", updateEventRepeatUntilField);
  els.deleteEvent.addEventListener("click", deleteActiveEvent);
  els.deleteSeriesEvent.addEventListener("click", deleteRecurringSeries);
}

function render() {
  applyViewClass();
  renderHeader();
  renderMonthGrid();
  updateSidebarResizerValue();
  if (activeSidebarPanel === "analysis") renderSidebarTimeAnalysis();
}

function applyViewClass() {
  document.body.classList.remove("view-deadlines", "view-week", "view-month", "view-four-week", "view-heatmap");
  document.body.classList.add(`view-${currentView}`);
}

function renderHeader() {
  const { start, end } = getVisibleDateRange();
  els.monthTitle.textContent = getHeaderTitle(start, end);
  els.viewSelect.value = currentView;
  els.todayButton.setAttribute("aria-label", `Today, ${longDateFormatter.format(TODAY)}`);
  els.previousMonth.setAttribute("aria-label", `Previous ${VIEW_LABELS[currentView].toLowerCase()}`);
  els.nextMonth.setAttribute("aria-label", `Next ${VIEW_LABELS[currentView].toLowerCase()}`);
  renderDeadlineDaysLeft();
}

function renderDeadlineDaysLeft() {
  if (!els.deadlineDaysLeft) return;
  const today = startOfDay(getNow());
  const futureDeadlines = getSelectedDeadlineEvents()
    .map((event) => fromDateKey(event.date))
    .filter((date) => date >= today);
  if (!futureDeadlines.length) {
    els.deadlineDaysLeft.hidden = true;
    els.deadlineDaysLeft.textContent = "";
    return;
  }

  const nearestDeadline = futureDeadlines.reduce((nearest, date) => date < nearest ? date : nearest);
  const days = Math.ceil((nearestDeadline - today) / 86_400_000);
  els.deadlineDaysLeft.textContent = `${days} day${days === 1 ? "" : "s"} until deadline`;
  els.deadlineDaysLeft.hidden = false;
}

function toggleAccountPopover() {
  const isOpen = !els.accountPopover.hidden;
  if (isOpen) {
    closeAccountPopover();
  } else {
    openAccountPopover();
  }
}

function openAccountPopover() {
  els.accountPopover.hidden = false;
  els.accountButton.setAttribute("aria-expanded", "true");
}

function closeAccountPopover() {
  els.accountPopover.hidden = true;
  els.accountButton.setAttribute("aria-expanded", "false");
}

function openSettingsModal() {
  const selected = els.settingsForm.elements.sidebarLocation;
  const inputs = selected instanceof RadioNodeList ? [...selected] : [selected].filter(Boolean);
  inputs.forEach((input) => {
    input.checked = input.value === "bottom";
  });
  els.settingsModal.classList.add("is-open");
  els.settingsModal.setAttribute("aria-hidden", "false");
}

function closeSettingsModal() {
  els.settingsModal.classList.remove("is-open");
  els.settingsModal.setAttribute("aria-hidden", "true");
}

function saveSettingsFromDialog(event) {
  event.preventDefault();
  sidebarLocation = "bottom";
  saveSidebarLocation();
  applySidebarLocation();
  closeSettingsModal();
  showToast("Settings saved");
}

function applySidebarLocation() {
  sidebarLocation = "bottom";
  document.body.classList.remove("sidebar-location-left", "sidebar-location-right");
  document.body.classList.add("sidebar-location-bottom");
}

function applyBottomSidebarHeight() {
  if (bottomSidebarHeight) {
    document.documentElement.style.setProperty("--bottom-sidebar-height", `${bottomSidebarHeight}px`);
  }
  updateSidebarResizerValue();
}

function updateSidebarResizerValue() {
  if (!els.sidebarResizer) return;
  const currentHeight = bottomSidebarHeight || Math.round(document.querySelector("#sidebar")?.getBoundingClientRect().height || 0);
  els.sidebarResizer.setAttribute("aria-valuemin", String(getBottomSidebarHeightBounds().min));
  els.sidebarResizer.setAttribute("aria-valuemax", String(getBottomSidebarHeightBounds().max));
  els.sidebarResizer.setAttribute("aria-valuenow", String(currentHeight));
}

function setBottomSidebarHeight(height, { persist = true, updateAria = true, bounds = getBottomSidebarHeightBounds() } = {}) {
  const { min, max } = bounds;
  bottomSidebarHeight = Math.round(Math.min(max, Math.max(min, height)));
  document.documentElement.style.setProperty("--bottom-sidebar-height", `${bottomSidebarHeight}px`);
  if (updateAria) updateSidebarResizerValue();
  if (persist) saveBottomSidebarHeight();
}

function getBottomSidebarHeightBounds() {
  const workspace = document.querySelector(".workspace");
  const workspaceHeight = workspace?.getBoundingClientRect().height || window.innerHeight;
  const min = 120;
  const minCalendarHeight = currentView === "four-week" ? 280 : 240;
  const max = Math.max(min, Math.round(workspaceHeight - minCalendarHeight - 8));
  return { min, max };
}

function startSidebarResize(event) {
  if (event.button !== 0) return;
  event.preventDefault();
  document.body.classList.remove("sidebar-collapsed");
  const sidebarRect = document.querySelector("#sidebar")?.getBoundingClientRect();
  activeSidebarResize = {
    pointerId: event.pointerId,
    startY: event.clientY,
    startHeight: sidebarRect?.height || bottomSidebarHeight || 220,
    bounds: getBottomSidebarHeightBounds(),
  };
  document.body.classList.add("sidebar-resizing");
  els.sidebarResizer.setPointerCapture(event.pointerId);
  window.addEventListener("pointermove", handleSidebarResizeMove);
  window.addEventListener("pointerup", stopSidebarResize);
  window.addEventListener("pointercancel", stopSidebarResize);
}

function handleSidebarResizeMove(event) {
  if (!activeSidebarResize) return;
  const nextHeight = activeSidebarResize.startHeight - (event.clientY - activeSidebarResize.startY);
  setBottomSidebarHeight(nextHeight, { persist: false, updateAria: false, bounds: activeSidebarResize.bounds });
}

function stopSidebarResize() {
  if (!activeSidebarResize) return;
  updateSidebarResizerValue();
  saveBottomSidebarHeight();
  if (els.sidebarResizer.hasPointerCapture?.(activeSidebarResize.pointerId)) {
    els.sidebarResizer.releasePointerCapture(activeSidebarResize.pointerId);
  }
  activeSidebarResize = null;
  document.body.classList.remove("sidebar-resizing");
  window.removeEventListener("pointermove", handleSidebarResizeMove);
  window.removeEventListener("pointerup", stopSidebarResize);
  window.removeEventListener("pointercancel", stopSidebarResize);
}

function handleSidebarResizeKeydown(event) {
  if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const { min, max } = getBottomSidebarHeightBounds();
  const currentHeight = document.querySelector("#sidebar")?.getBoundingClientRect().height || bottomSidebarHeight || min;
  if (event.key === "Home") {
    setBottomSidebarHeight(min);
  } else if (event.key === "End") {
    setBottomSidebarHeight(max);
  } else {
    setBottomSidebarHeight(currentHeight + (event.key === "ArrowUp" ? 24 : -24));
  }
}

function setSidebarPanel(panel) {
  if (!["calendar", "papers", "analysis", "deadlines"].includes(panel)) return;
  activeSidebarPanel = panel;
  document.querySelectorAll(".sidebar-panel").forEach((item) => {
    item.hidden = item.dataset.panel !== activeSidebarPanel;
  });
  els.sidebarTabs.querySelectorAll(".sidebar-tab").forEach((button) => {
    const selected = button.dataset.panel === activeSidebarPanel;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  if (panel === "analysis") renderSidebarTimeAnalysis();
  if (panel === "deadlines") renderDeadlinePanel();
}

function selectSidebarPanelByPosition(position) {
  const tab = els.sidebarTabs.querySelectorAll(".sidebar-tab")[position];
  const panel = tab?.dataset.panel;
  if (!panel) return;

  const isCollapsed = document.body.classList.contains("sidebar-collapsed");
  if (panel === activeSidebarPanel && !isCollapsed) {
    document.body.classList.add("sidebar-collapsed");
    return;
  }

  document.body.classList.remove("sidebar-collapsed");
  setSidebarPanel(panel);
}

function renderSidebarTimeAnalysisIfActive() {
  if (activeSidebarPanel === "analysis") renderSidebarTimeAnalysis();
}

function renderSidebarTimeAnalysis() {
  const analysis = getCurrentViewTimeAnalysis();
  if (!analysis.occurrences.length) {
    els.sidebarTimeAnalysisEmpty.hidden = false;
    els.sidebarTimeAnalysisContent.hidden = true;
    els.sidebarTimeAnalysisList.replaceChildren();
    els.weeklyActivityChart.hidden = true;
    els.weeklyActivityChartBody.replaceChildren();
    return;
  }

  els.sidebarTimeAnalysisEmpty.hidden = true;
  els.sidebarTimeAnalysisContent.hidden = false;
  els.sidebarTimeAnalysisRange.textContent = analysis.rangeLabel;
  els.sidebarTimeAnalysisSummary.textContent = `${analysis.occurrences.length} occurrence${analysis.occurrences.length === 1 ? "" : "s"} · ${formatHours(analysis.totalHours)}`;
  renderWeeklyActivityChart(analysis.weeklyActivity, analysis.weeklyHours);
  els.sidebarTimeAnalysisList.replaceChildren(
    ...analysis.occurrences.map((occurrence) => {
      const item = document.createElement("div");
      item.className = "time-analysis-item";
      item.innerHTML = `<span>${escapeHtml(occurrence.label)}</span>`;
      return item;
    })
  );
}

function createFirebaseSyncState() {
  return {
    configured: false,
    busy: false,
    user: null,
    app: null,
    auth: null,
    firestore: null,
    provider: null,
    unsubscribe: null,
    applyingRemote: false,
    syncTimer: null,
  };
}

function initFirebaseSync() {
  const config = window.ACADEMICAL_GOOGLE_CONFIG || {};

  if (!config.firebaseConfig?.apiKey || !window.firebase?.initializeApp) {
    firebaseSync.configured = false;
    updateFirebaseSyncUi("Cloud sync unavailable");
    return;
  }

  try {
    firebaseSync.app = window.firebase.apps?.length
      ? window.firebase.app()
      : window.firebase.initializeApp(config.firebaseConfig);
    firebaseSync.auth = window.firebase.auth(firebaseSync.app);
    firebaseSync.firestore = window.firebase.firestore(firebaseSync.app);
    firebaseSync.provider = new window.firebase.auth.GoogleAuthProvider();
    (config.scopes || ["profile", "email"]).forEach((scope) => firebaseSync.provider.addScope(scope));
    firebaseSync.auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);
    firebaseSync.configured = true;

    firebaseSync.auth.onAuthStateChanged((user) => {
      firebaseSync.user = user ? getFirebaseUserProfile(user) : null;
      if (firebaseSync.user) {
        startCloudSync().catch(handleFirebaseSyncError);
      } else {
        stopCloudListener();
      }
      updateFirebaseSyncUi();
    });
  } catch (error) {
    firebaseSync.configured = false;
    handleFirebaseSyncError(error);
  }

  updateFirebaseSyncUi();
}

function getFirebaseUserProfile(user) {
  return {
    id: user.uid,
    email: user.email || "",
    name: user.displayName || user.email || "Google user",
    picture: user.photoURL || "",
  };
}

async function toggleFirebaseAuth() {
  if (!firebaseSync.configured || !firebaseSync.auth) return;

  firebaseSync.busy = true;
  updateFirebaseSyncUi(firebaseSync.user ? "Signing out..." : "Opening Google sign-in...");

  try {
    if (firebaseSync.user) {
      await firebaseSync.auth.signOut();
      showToast("Signed out of cloud sync");
    } else {
      await firebaseSync.auth.signInWithPopup(firebaseSync.provider);
      showToast("Signed in with Firebase sync");
    }
  } catch (error) {
    handleFirebaseSyncError(error);
  } finally {
    firebaseSync.busy = false;
    updateFirebaseSyncUi();
  }
}

function updateFirebaseSyncUi(message = "") {
  if (!els.syncAuthButton || !els.syncStatus) return;

  if (!firebaseSync.configured) {
    els.syncAuthButton.textContent = "Sync off";
    els.syncAuthButton.disabled = true;
    els.syncAuthButton.classList.remove("connected");
    els.accountButton.classList.remove("connected");
    els.accountButton.setAttribute("aria-label", "Account and sync unavailable");
    els.syncStatus.textContent = message || "Cloud sync unavailable";
    return;
  }

  els.syncAuthButton.disabled = firebaseSync.busy;
  els.syncAuthButton.textContent = firebaseSync.user ? "Sign out" : "Sign in";
  els.syncAuthButton.classList.toggle("connected", Boolean(firebaseSync.user));
  els.accountButton.classList.toggle("connected", Boolean(firebaseSync.user));
  els.accountButton.setAttribute(
    "aria-label",
    firebaseSync.user ? `Account and sync, signed in as ${firebaseSync.user.name || firebaseSync.user.email}` : "Account and sync, not signed in"
  );
  els.syncStatus.textContent = message || (firebaseSync.user ? `Synced as ${firebaseSync.user.email || firebaseSync.user.name}` : "Local only");
}

function userStateDocRef() {
  if (!firebaseSync.user || !firebaseSync.firestore) throw new Error("Sign in to sync.");
  return firebaseSync.firestore.collection("users").doc(firebaseSync.user.id).collection("academical").doc("state");
}

function getCloudStatePayload() {
  const updatedAt = getLocalSyncUpdatedAt() || touchLocalSyncUpdatedAt();
  return {
    updatedAt,
    events,
    paperTasks,
    customCalendars,
    calendarNameOverrides,
    calendarColorOverrides,
    calendarOrderIds,
    visibleCalendars,
    archivedCalendarIds,
    deletedCalendarIds,
  };
}

async function startCloudSync() {
  if (!firebaseSync.user) return;
  updateFirebaseSyncUi("Checking Firestore...");

  const docRef = userStateDocRef();
  const snapshot = await docRef.get();
  const remote = snapshot.exists ? snapshot.data() : null;
  const localUpdatedAt = getLocalSyncUpdatedAt();

  if (remote?.updatedAt && isRemoteNewer(remote.updatedAt, localUpdatedAt)) {
    applyRemoteState(remote);
    updateFirebaseSyncUi("Downloaded from Firestore");
  } else {
    await docRef.set(getCloudStatePayload(), { merge: true });
    updateFirebaseSyncUi("Uploaded local data to Firestore");
  }

  stopCloudListener();
  firebaseSync.unsubscribe = docRef.onSnapshot((nextSnapshot) => {
    if (!nextSnapshot.exists || firebaseSync.applyingRemote) return;
    const remoteState = nextSnapshot.data();
    if (remoteState?.updatedAt && isRemoteNewer(remoteState.updatedAt, getLocalSyncUpdatedAt())) {
      applyRemoteState(remoteState);
      renderCalendarToggles();
      renderArchivedCalendars();
      renderPaperTasks();
      populateCalendarSelect();
      render();
      updateFirebaseSyncUi("Synced from Firestore");
    }
  }, handleFirebaseSyncError);
}

function stopCloudListener() {
  if (firebaseSync.unsubscribe) {
    firebaseSync.unsubscribe();
    firebaseSync.unsubscribe = null;
  }
}

function applyRemoteState(remoteState) {
  firebaseSync.applyingRemote = true;
  events = Array.isArray(remoteState.events) ? remoteState.events : events;
  paperTasks = Array.isArray(remoteState.paperTasks) ? remoteState.paperTasks : paperTasks;
  customCalendars = normalizeCustomCalendars(remoteState.customCalendars);
  calendarNameOverrides = normalizeCalendarNameOverrides(remoteState.calendarNameOverrides);
  calendarColorOverrides = normalizeCalendarColorOverrides(remoteState.calendarColorOverrides);
  calendarOrderIds = normalizeCalendarOrderIds(remoteState.calendarOrderIds);
  calendars = getCalendars();
  visibleCalendars = { ...loadVisibleCalendars(), ...(remoteState.visibleCalendars || {}) };
  archivedCalendarIds = normalizeCalendarIdList(remoteState.archivedCalendarIds);
  deletedCalendarIds = normalizeCalendarIdList(remoteState.deletedCalendarIds);
  setLocalSyncUpdatedAt(remoteState.updatedAt || new Date().toISOString());
  saveEvents({ sync: false, touch: false });
  savePaperTasks({ sync: false, touch: false });
  saveCustomCalendars({ sync: false, touch: false });
  saveCalendarNameOverrides({ sync: false, touch: false });
  saveCalendarColorOverrides({ sync: false, touch: false });
  saveCalendarOrderIds({ sync: false, touch: false });
  saveVisibleCalendars({ sync: false, touch: false });
  saveArchivedCalendarIds({ sync: false, touch: false });
  saveDeletedCalendarIds({ sync: false, touch: false });
  firebaseSync.applyingRemote = false;
}

function queueCloudSync() {
  if (!firebaseSync.user || !firebaseSync.firestore || firebaseSync.applyingRemote) return;
  clearTimeout(firebaseSync.syncTimer);
  firebaseSync.syncTimer = setTimeout(syncCloudStateNow, 600);
}

async function syncCloudStateNow() {
  if (!firebaseSync.user || !firebaseSync.firestore || firebaseSync.applyingRemote) return;
  try {
    await userStateDocRef().set(getCloudStatePayload(), { merge: true });
    updateFirebaseSyncUi("Synced to Firestore");
  } catch (error) {
    handleFirebaseSyncError(error);
  }
}

function handleFirebaseSyncError(error) {
  console.error(error);
  updateFirebaseSyncUi(getFirebaseErrorMessage(error));
}

function getFirebaseErrorMessage(error) {
  const code = String(error?.code || error?.message || "").toLowerCase();
  if (code.includes("popup-closed-by-user")) return "Sign-in popup closed";
  if (code.includes("popup-blocked")) return "Popup blocked";
  if (code.includes("unauthorized-domain")) return "Firebase unauthorized domain";
  if (code.includes("permission-denied")) return "Firestore permission denied";
  return error?.message || "Firebase sync failed";
}

function isRemoteNewer(remoteUpdatedAt, localUpdatedAt) {
  const remoteTime = Date.parse(remoteUpdatedAt || "");
  const localTime = Date.parse(localUpdatedAt || "");
  if (!Number.isFinite(remoteTime)) return false;
  if (!Number.isFinite(localTime)) return true;
  return remoteTime > localTime;
}

function touchLocalSyncUpdatedAt() {
  const updatedAt = new Date().toISOString();
  setLocalSyncUpdatedAt(updatedAt);
  return updatedAt;
}

function getLocalSyncUpdatedAt() {
  return localStorage.getItem(STORAGE_SYNC_UPDATED_AT) || "";
}

function setLocalSyncUpdatedAt(updatedAt) {
  localStorage.setItem(STORAGE_SYNC_UPDATED_AT, updatedAt);
}

function renderColorPalette(container, input, selectedColor = "blue") {
  container.replaceChildren(
    ...basicColorKeywords.map((color) => {
      const button = document.createElement("button");
      button.className = "color-swatch";
      button.type = "button";
      button.setAttribute("role", "option");
      button.dataset.color = color;
      button.title = color;
      button.setAttribute("aria-label", color);
      button.style.setProperty("--swatch-color", color);
      button.addEventListener("click", () => setColorPaletteValue(container, input, color));
      return button;
    })
  );
  setColorPaletteValue(container, input, selectedColor, { silent: true });
}

function setColorPaletteValue(container, input, color, { silent = false } = {}) {
  input.value = color;
  container.querySelectorAll(".color-swatch").forEach((button) => {
    const selected = button.dataset.color === color;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  if (!silent) input.dispatchEvent(new Event("change", { bubbles: true }));
}

function renderCalendarToggles() {
  const activeCalendars = getActiveCalendars();

  if (!activeCalendars.length) {
    const empty = document.createElement("p");
    empty.className = "calendar-empty";
    empty.textContent = "No active calendars.";
    els.calendarToggles.replaceChildren(empty);
    return;
  }

  els.calendarToggles.replaceChildren(
    ...activeCalendars.map((calendar) => createCalendarToggleRow(calendar))
  );
}

function createCalendarToggleRow(calendar) {
  const row = document.createElement("div");
  row.className = "calendar-toggle-row";
  row.draggable = true;
  row.dataset.calendar = calendar.id;
  row.setAttribute("aria-label", `${calendar.name} calendar row`);

  const dragHandle = document.createElement("span");
  dragHandle.className = "calendar-drag-handle";
  dragHandle.textContent = "⋮⋮";
  dragHandle.title = "Drag to reorder";
  dragHandle.setAttribute("aria-hidden", "true");

  const label = document.createElement("label");
  label.className = "calendar-toggle";
  label.innerHTML = `
    <input type="checkbox" ${visibleCalendars[calendar.id] ? "checked" : ""} data-calendar="${calendar.id}" />
    <span class="calendar-dot" style="--calendar-color: ${calendar.color}"></span>
    <span class="calendar-name" title="Double-click to rename">${escapeHtml(calendar.name)}</span>
  `;
  label.querySelector("input").addEventListener("change", (event) => {
    visibleCalendars[calendar.id] = event.target.checked;
    persistCalendarVisibility();
  });
  label.querySelector(".calendar-name").addEventListener("dblclick", (event) => {
    event.preventDefault();
    openEditCalendarModal(calendar.id);
  });

  const renameButton = document.createElement("button");
  renameButton.className = "calendar-rename-button";
  renameButton.type = "button";
  renameButton.textContent = "✎";
  renameButton.setAttribute("aria-label", `Rename ${calendar.name} calendar`);
  renameButton.title = `Rename ${calendar.name} calendar`;
  renameButton.addEventListener("click", () => openEditCalendarModal(calendar.id));

  const archiveButton = document.createElement("button");
  archiveButton.className = "calendar-archive-button";
  archiveButton.type = "button";
  archiveButton.textContent = "×";
  archiveButton.setAttribute("aria-label", `Archive ${calendar.name} calendar`);
  archiveButton.title = `Archive ${calendar.name} calendar`;
  archiveButton.addEventListener("click", () => archiveCalendar(calendar.id));

  row.addEventListener("dragstart", (event) => handleCalendarDragStart(event, calendar.id));
  row.addEventListener("dragover", handleCalendarDragOver);
  row.addEventListener("dragleave", handleCalendarDragLeave);
  row.addEventListener("drop", (event) => handleCalendarDrop(event, calendar.id));
  row.addEventListener("dragend", handleCalendarDragEnd);

  row.append(dragHandle, label, renameButton, archiveButton);
  return row;
}

function renderArchivedCalendars() {
  const archivedCalendars = getArchivedCalendars();
  els.archivedCalendarsSection.hidden = archivedCalendars.length === 0;
  els.archivedCalendarList.hidden = !archivedCalendarsExpanded;
  els.archivedCalendarsToggle.setAttribute("aria-expanded", String(archivedCalendarsExpanded));
  els.archivedCalendarsCaret.textContent = archivedCalendarsExpanded ? "⌄" : "›";

  els.archivedCalendarList.replaceChildren(
    ...archivedCalendars.map((calendar) => {
      const item = document.createElement("div");
      item.className = "archived-calendar-item";

      const label = document.createElement("label");
      label.className = "calendar-toggle archived-calendar-toggle";
      label.innerHTML = `
        <input type="checkbox" ${visibleCalendars[calendar.id] ? "checked" : ""} data-calendar="${calendar.id}" />
        <span class="calendar-dot" style="--calendar-color: ${calendar.color}"></span>
        <span class="calendar-name">${escapeHtml(calendar.name)}</span>
      `;
      label.querySelector("input").addEventListener("change", (event) => {
        visibleCalendars[calendar.id] = event.target.checked;
        persistCalendarVisibility();
      });

      const restoreButton = document.createElement("button");
      restoreButton.className = "restore-calendar-button";
      restoreButton.type = "button";
      restoreButton.textContent = "↩";
      restoreButton.title = `Restore ${calendar.name} calendar`;
      restoreButton.setAttribute("aria-label", `Restore ${calendar.name} calendar`);
      restoreButton.addEventListener("click", () => restoreArchivedCalendar(calendar.id));

      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-calendar-button";
      deleteButton.type = "button";
      deleteButton.textContent = "🗑️";
      deleteButton.setAttribute("aria-label", `Delete ${calendar.name} calendar`);
      deleteButton.title = `Delete ${calendar.name} calendar`;
      deleteButton.addEventListener("click", () => deleteArchivedCalendar(calendar.id));

      item.append(label, restoreButton, deleteButton);
      return item;
    })
  );
}

function toggleArchivedCalendars() {
  archivedCalendarsExpanded = !archivedCalendarsExpanded;
  renderArchivedCalendars();
}

function handleCalendarDragStart(event, calendarId) {
  if (event.target.closest("button, input")) {
    event.preventDefault();
    return;
  }
  draggedCalendarId = calendarId;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", calendarId);
  event.currentTarget.classList.add("is-dragging");
}

function handleCalendarDragOver(event) {
  if (!draggedCalendarId) return;
  const targetId = event.currentTarget.dataset.calendar;
  if (!targetId || targetId === draggedCalendarId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  event.currentTarget.classList.add("is-drag-over");
}

function handleCalendarDragLeave(event) {
  event.currentTarget.classList.remove("is-drag-over");
}

function handleCalendarDrop(event, targetCalendarId) {
  event.preventDefault();
  event.currentTarget.classList.remove("is-drag-over");
  const sourceCalendarId = draggedCalendarId || event.dataTransfer.getData("text/plain");
  if (!sourceCalendarId || sourceCalendarId === targetCalendarId) return;
  reorderCalendars(sourceCalendarId, targetCalendarId);
}

function handleCalendarDragEnd() {
  draggedCalendarId = "";
  els.calendarToggles.querySelectorAll(".calendar-toggle-row").forEach((row) => {
    row.classList.remove("is-dragging", "is-drag-over");
  });
}

function reorderCalendars(sourceCalendarId, targetCalendarId) {
  const orderedIds = calendars.map((calendar) => calendar.id);
  const sourceIndex = orderedIds.indexOf(sourceCalendarId);
  const targetIndex = orderedIds.indexOf(targetCalendarId);
  if (sourceIndex < 0 || targetIndex < 0) return;

  const [movedId] = orderedIds.splice(sourceIndex, 1);
  orderedIds.splice(targetIndex, 0, movedId);
  calendarOrderIds = normalizeCalendarOrderIds(orderedIds);
  calendars = getCalendars();
  saveCalendarOrderIds();
  renderCalendarToggles();
  renderArchivedCalendars();
  populateCalendarSelect();
  showToast("Calendar reordered");
}

function openEditCalendarModal(calendarId) {
  const calendar = getCalendar(calendarId);
  els.editCalendarId.value = calendarId;
  els.editCalendarNameInput.value = calendar.name;
  setColorPaletteValue(els.editCalendarColorPalette, els.editCalendarColorInput, calendar.color, { silent: true });
  renderCalendarTransferControls(calendarId);
  els.editCalendarModal.classList.add("is-open");
  els.editCalendarModal.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => els.editCalendarNameInput.focus());
}

function renderCalendarTransferControls(calendarId) {
  const targets = getActiveCalendars().filter((calendar) => calendar.id !== calendarId);
  const eventCount = events.filter((event) => event.calendar === calendarId).length;
  els.calendarTransferSummary.textContent = `${eventCount} event${eventCount === 1 ? "" : "s"} can be moved to another calendar.`;
  els.calendarTransferTarget.replaceChildren(...targets.map((calendar) => {
    const option = document.createElement("option");
    option.value = calendar.id;
    option.textContent = calendar.name;
    return option;
  }));
  els.calendarTransferTarget.disabled = targets.length === 0 || eventCount === 0;
  els.transferCalendarEvents.disabled = targets.length === 0 || eventCount === 0;
}

function transferCalendarEvents() {
  const sourceId = els.editCalendarId.value;
  const targetId = els.calendarTransferTarget.value;
  if (!sourceId || !targetId || sourceId === targetId) return;

  const source = getCalendar(sourceId);
  const target = getCalendar(targetId);
  let movedCount = 0;
  events = events.map((event) => {
    if (event.calendar !== sourceId) return event;
    movedCount += 1;
    return { ...event, calendar: targetId };
  });
  if (!movedCount) return;

  visibleCalendars[targetId] = true;
  saveEvents();
  saveVisibleCalendars();
  renderCalendarToggles();
  renderArchivedCalendars();
  renderCalendarTransferControls(sourceId);
  render();
  showToast(`${movedCount} event${movedCount === 1 ? "" : "s"} transferred from ${source.name} to ${target.name}`);
}

function exportCalendarJson() {
  const calendarId = els.editCalendarId.value;
  const calendar = getCalendar(calendarId);
  if (!calendarId || !calendar) return;

  const payload = {
    exportedAt: new Date().toISOString(),
    calendar: {
      id: calendar.id,
      name: calendar.name,
      color: calendar.color,
      builtIn: Boolean(calendar.builtIn),
    },
    events: events.filter((event) => event.calendar === calendarId),
  };
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugifyFilename(calendar.name || calendar.id)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast(`${calendar.name} exported`);
}

function slugifyFilename(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "calendar";
}

function closeEditCalendarModal() {
  els.editCalendarModal.classList.remove("is-open");
  els.editCalendarModal.setAttribute("aria-hidden", "true");
}

function saveEditedCalendar(event) {
  event.preventDefault();
  const calendarId = els.editCalendarId.value;
  const calendar = getCalendar(calendarId);
  const nextName = els.editCalendarNameInput.value.trim();
  const nextColor = els.editCalendarColorInput.value || calendar.color;
  if (!calendarId || !nextName) return;

  calendarNameOverrides[calendarId] = nextName;
  calendarColorOverrides[calendarId] = nextColor;
  calendars = getCalendars();
  persistCalendarManagement("Calendar updated");
  renderMonthGrid();
  closeEditCalendarModal();
}

function selectAllCalendars() {
  const availableIds = new Set(getAvailableCalendars().map((calendar) => calendar.id));
  visibleCalendars = Object.fromEntries(calendars.map((calendar) => [calendar.id, availableIds.has(calendar.id)]));
  persistCalendarVisibility("All calendars selected");
}

function soloCalendar(index) {
  const activeCalendars = getActiveCalendars();
  const calendar = activeCalendars[index];
  if (!calendar) return;
  visibleCalendars = Object.fromEntries(calendars.map((item) => [item.id, item.id === calendar.id]));
  persistCalendarVisibility(`${calendar.name} calendar selected`);
}

function archiveCalendar(calendarId) {
  const calendar = calendars.find((item) => item.id === calendarId);
  if (!calendar) return;

  const archivedSet = new Set(archivedCalendarIds);
  archivedSet.add(calendarId);
  archivedCalendarIds = [...archivedSet];
  visibleCalendars[calendarId] = false;
  persistCalendarArchive(`${calendar.name} calendar archived`);
}

function restoreArchivedCalendar(calendarId) {
  archivedCalendarIds = archivedCalendarIds.filter((id) => id !== calendarId);
  visibleCalendars[calendarId] = true;
  persistCalendarArchive(`${getCalendar(calendarId).name} calendar restored`);
}

function deleteArchivedCalendar(calendarId) {
  const calendar = getCalendar(calendarId);
  const removedEvents = events.filter((event) => event.calendar === calendarId);
  const restoredPapers = removedEvents.flatMap(getAllAssignedPapersInSeries);
  const paperTasksChanged = restorePapersToTasks(restoredPapers);

  archivedCalendarIds = archivedCalendarIds.filter((id) => id !== calendarId);
  if (defaultCalendars.some((item) => item.id === calendarId)) {
    deletedCalendarIds = [...new Set([...deletedCalendarIds, calendarId])];
  }
  customCalendars = customCalendars.filter((item) => item.id !== calendarId);
  calendarOrderIds = calendarOrderIds.filter((id) => id !== calendarId);
  delete calendarNameOverrides[calendarId];
  delete calendarColorOverrides[calendarId];
  calendars = getCalendars();
  delete visibleCalendars[calendarId];
  events = events.filter((event) => event.calendar !== calendarId);

  if (paperTasksChanged) {
    savePaperTasks();
    renderPaperTasks();
  }
  persistCalendarArchive(`${calendar.name} calendar deleted`);
}

function persistCalendarVisibility(message = "") {
  saveVisibleCalendars();
  renderCalendarToggles();
  renderArchivedCalendars();
  renderMonthGrid();
  renderSidebarTimeAnalysisIfActive();
  if (message) showToast(message);
}

function persistCalendarArchive(message = "") {
  saveCustomCalendars();
  saveCalendarNameOverrides();
  saveCalendarColorOverrides();
  saveCalendarOrderIds();
  saveArchivedCalendarIds();
  saveDeletedCalendarIds();
  saveVisibleCalendars();
  saveEvents();
  renderCalendarToggles();
  renderArchivedCalendars();
  populateCalendarSelect();
  renderMonthGrid();
  renderSidebarTimeAnalysisIfActive();
  if (message) showToast(message);
}

function getAvailableCalendars() {
  return calendars.filter((calendar) => !deletedCalendarIds.includes(calendar.id));
}

function getActiveCalendars() {
  return getAvailableCalendars().filter((calendar) => !archivedCalendarIds.includes(calendar.id));
}

function getArchivedCalendars() {
  return getAvailableCalendars().filter((calendar) => archivedCalendarIds.includes(calendar.id));
}

function isCalendarArchived(calendarId) {
  return archivedCalendarIds.includes(calendarId);
}

function isCalendarDeleted(calendarId) {
  return deletedCalendarIds.includes(calendarId);
}

function openCalendarModal() {
  els.calendarNameInput.value = "";
  setColorPaletteValue(els.calendarColorPalette, els.calendarColorInput, "blue", { silent: true });
  els.calendarFileInput.value = "";
  els.calendarModal.classList.add("is-open");
  els.calendarModal.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => els.calendarNameInput.focus());
}

function closeCalendarModal() {
  els.calendarModal.classList.remove("is-open");
  els.calendarModal.setAttribute("aria-hidden", "true");
}

async function createCalendarFromDialog(event) {
  event.preventDefault();
  const calendarName = els.calendarNameInput.value.trim();
  const color = els.calendarColorInput.value || "blue";
  const files = [...els.calendarFileInput.files].filter((file) => file.name.toLowerCase().endsWith(".ics") || file.type === "text/calendar");

  if (files.length) {
    const importedEvents = await importCalendarFiles(files, files.length === 1 ? calendarName : "", color);
    if (!importedEvents) return;
    closeCalendarModal();
    showToast(`Imported ${importedEvents} event${importedEvents === 1 ? "" : "s"}`);
    return;
  }

  createBlankCalendar(calendarName || "New calendar", color);
  closeCalendarModal();
  showToast("Calendar created");
}

function createBlankCalendar(name, color) {
  const calendar = {
    id: makeCustomCalendarId(name),
    name,
    color,
    imported: false,
  };
  customCalendars.push(calendar);
  calendarOrderIds = normalizeCalendarOrderIds([...calendarOrderIds, calendar.id]);
  calendars = getCalendars();
  visibleCalendars[calendar.id] = true;
  persistCalendarManagement();
}

async function importCalendarFiles(files, nameOverride = "", colorOverride = "") {
  let importedEvents = 0;
  for (const file of files) {
    try {
      const text = await file.text();
      const imported = parseIcsCalendar(text, file.name, { name: nameOverride, color: colorOverride });
      if (!imported.events.length) continue;
      customCalendars.push(imported.calendar);
      calendarOrderIds = normalizeCalendarOrderIds([...calendarOrderIds, imported.calendar.id]);
      calendars = getCalendars();
      visibleCalendars[imported.calendar.id] = true;
      events.push(...imported.events);
      importedEvents += imported.events.length;
    } catch (error) {
      console.error(error);
      showToast(`Could not import ${file.name}`);
    }
  }

  if (!importedEvents) {
    showToast("No events found in ICS file");
    return 0;
  }

  persistCalendarManagement();
  saveEvents();
  render();
  return importedEvents;
}

function persistCalendarManagement(message = "") {
  saveCustomCalendars();
  saveCalendarNameOverrides();
  saveCalendarColorOverrides();
  saveCalendarOrderIds();
  saveVisibleCalendars();
  renderCalendarToggles();
  renderArchivedCalendars();
  populateCalendarSelect();
  renderSidebarTimeAnalysisIfActive();
  if (message) showToast(message);
}

function parseIcsCalendar(text, fileName, options = {}) {
  const lines = unfoldIcsLines(text);
  const calendarName = options.name || getIcsPropertyValue(lines, "X-WR-CALNAME") || fileName.replace(/\.ics$/i, "") || "Imported calendar";
  const calendar = {
    id: makeCustomCalendarId(calendarName),
    name: calendarName,
    color: options.color || importedCalendarColors[customCalendars.length % importedCalendarColors.length],
    imported: true,
  };

  const parsedEvents = [];
  let block = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      block = [];
    } else if (line === "END:VEVENT" && block) {
      const parsedEvent = parseIcsEvent(block, calendar.id);
      if (parsedEvent) parsedEvents.push(parsedEvent);
      block = null;
    } else if (block) {
      block.push(line);
    }
  }

  return { calendar, events: normalizeIcsEvents(parsedEvents) };
}

function normalizeIcsEvents(parsedEvents) {
  const baseByUid = new Map();
  parsedEvents
    .filter((event) => !event.recurrenceId && event.status !== "CANCELLED")
    .forEach((event) => baseByUid.set(event.uid, { ...event, instanceOverrides: { ...(event.instanceOverrides ?? {}) } }));

  const standaloneEvents = [];
  parsedEvents
    .filter((event) => event.recurrenceId)
    .forEach((event) => {
      const baseEvent = baseByUid.get(event.uid);
      if (!baseEvent) return;

      const recurrenceDate = event.recurrenceId.date;

      if (event.status === "CANCELLED") {
        const excludedDates = new Set(baseEvent.excludedDates ?? []);
        excludedDates.add(recurrenceDate);
        baseEvent.excludedDates = [...excludedDates].sort();
        return;
      }

      if (event.date === recurrenceDate) {
        baseEvent.instanceOverrides[recurrenceDate] = {
          title: event.title,
          time: event.time,
          notes: event.notes,
          durationMinutes: event.durationMinutes,
        };
      } else {
        const excludedDates = new Set(baseEvent.excludedDates ?? []);
        excludedDates.add(recurrenceDate);
        baseEvent.excludedDates = [...excludedDates].sort();
        standaloneEvents.push({
          ...event,
          id: `${event.id}-${recurrenceDate}`.replace(/[^a-zA-Z0-9_-]/g, "-"),
          repeat: "none",
          excludedDates: [],
          instanceOverrides: {},
        });
      }
    });

  return [...baseByUid.values(), ...standaloneEvents].map(cleanImportedIcsEvent);
}

function cleanImportedIcsEvent(event) {
  const { uid, recurrenceId, status, ...cleanEvent } = event;
  if (!Object.keys(cleanEvent.instanceOverrides ?? {}).length) delete cleanEvent.instanceOverrides;
  if (!(cleanEvent.excludedDates ?? []).length) delete cleanEvent.excludedDates;
  if (!cleanEvent.repeatUntil) delete cleanEvent.repeatUntil;
  if (!cleanEvent.durationMinutes) delete cleanEvent.durationMinutes;
  return cleanEvent;
}

function unfoldIcsLines(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

function getIcsPropertyValue(lines, propertyName) {
  const property = lines.map(parseIcsLine).find((item) => item.name === propertyName);
  return property ? unescapeIcsText(property.value) : "";
}

function parseIcsEvent(lines, calendarId) {
  const properties = lines.map(parseIcsLine);
  const getProperty = (name) => properties.find((property) => property.name === name);
  const getProperties = (name) => properties.filter((property) => property.name === name);
  const startProperty = getProperty("DTSTART");
  if (!startProperty) return null;

  const start = parseIcsDate(startProperty.value, startProperty.params);
  if (!start) return null;

  const endProperty = getProperty("DTEND");
  const end = endProperty ? parseIcsDate(endProperty.value, endProperty.params) : null;
  const recurrenceIdProperty = getProperty("RECURRENCE-ID");
  const recurrenceId = recurrenceIdProperty ? parseIcsDate(recurrenceIdProperty.value, recurrenceIdProperty.params) : null;
  const summary = unescapeIcsText(getProperty("SUMMARY")?.value || "Untitled event");
  const description = unescapeIcsText(getProperty("DESCRIPTION")?.value || "");
  const uid = getProperty("UID")?.value || makeId();
  const { repeat, repeatUntil } = parseIcsRepeat(getProperty("RRULE")?.value || "");
  const excludedDates = getProperties("EXDATE").flatMap((property) => parseIcsDateList(property.value, property.params));
  const durationMinutes = getIcsDurationMinutes(start, end);

  return {
    id: `ics-${calendarId}-${uid}`.replace(/[^a-zA-Z0-9_-]/g, "-"),
    uid,
    recurrenceId,
    status: (getProperty("STATUS")?.value || "").toUpperCase(),
    title: summary,
    date: start.date,
    time: start.time,
    calendar: calendarId,
    repeat,
    repeatUntil,
    excludedDates,
    durationMinutes,
    notes: description,
  };
}

function parseIcsLine(line) {
  const separator = line.indexOf(":");
  const head = separator >= 0 ? line.slice(0, separator) : line;
  const value = separator >= 0 ? line.slice(separator + 1) : "";
  const [rawName, ...paramParts] = head.split(";");
  const params = Object.fromEntries(
    paramParts.map((part) => {
      const [key, ...rest] = part.split("=");
      return [key.toUpperCase(), rest.join("=")];
    })
  );
  return { name: rawName.toUpperCase(), params, value };
}

function parseIcsDate(value, params = {}) {
  const isDateOnly = params.VALUE === "DATE" || /^\d{8}$/.test(value);
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?$/);
  if (!match) return null;

  const [, year, month, day, hour = "00", minute = "00", second = "00", utc] = match;
  const date = utc
    ? new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)))
    : new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));

  return {
    date: isDateOnly ? `${year}-${month}-${day}` : toDateKey(date),
    time: isDateOnly ? "" : `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
    dateObject: date,
  };
}

function parseIcsDateList(value, params = {}) {
  return value
    .split(",")
    .map((item) => parseIcsDate(item.trim(), params)?.date)
    .filter(Boolean);
}

function getIcsDurationMinutes(start, end) {
  if (!start?.dateObject || !end?.dateObject) return DEFAULT_EVENT_DURATION_MINUTES;
  const duration = Math.round((end.dateObject - start.dateObject) / 60_000);
  return duration > 0 ? duration : DEFAULT_EVENT_DURATION_MINUTES;
}

function parseIcsRepeat(value) {
  if (!value) return { repeat: "none", repeatUntil: "" };
  const fields = Object.fromEntries(value.split(";").map((part) => {
    const [key, rest] = part.split("=");
    return [key, rest];
  }));
  let repeat = "none";
  if (fields.FREQ === "DAILY") repeat = "daily";
  if (fields.FREQ === "WEEKLY" && fields.BYDAY === "MO,TU,WE,TH,FR") repeat = "weekdays";
  else if (fields.FREQ === "WEEKLY") repeat = "weekly";
  return {
    repeat,
    repeatUntil: fields.UNTIL ? parseIcsUntilDate(fields.UNTIL) : "",
  };
}

function parseIcsUntilDate(value) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function unescapeIcsText(value) {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function makeCustomCalendarId(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "calendar";
  return `custom-${slug}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function openDblpSearchModal() {
  els.dblpSearchModal.classList.add("is-open");
  els.dblpSearchModal.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => els.dblpSearchInput.focus());
}

function closeDblpSearchModal() {
  activeDblpSearchController?.abort();
  activeDblpSearchController = null;
  dblpSearchRequestId += 1;
  els.dblpSearchModal.classList.remove("is-open");
  els.dblpSearchModal.setAttribute("aria-hidden", "true");
}

async function searchDblp(rawQuery) {
  const query = rawQuery.trim();
  if (!query) {
    renderDblpSearchMessage("Enter a query to search DBLP.");
    return;
  }

  activeDblpSearchController?.abort();
  const controller = new AbortController();
  const requestId = ++dblpSearchRequestId;
  activeDblpSearchController = controller;
  renderDblpSearchMessage("Searching DBLP…", true);

  try {
    const currentYear = getNow().getFullYear();
    const years = Array.from({ length: 5 }, (_, index) => currentYear - index);
    const result = await fetchDblpPage(query, years, 0, controller.signal);
    if (requestId !== dblpSearchRequestId) return;
    dblpSearchState = { query, years, hits: result.hits, totalMatches: result.totalMatches };
    renderDblpSearchResults(result.hits, result.totalMatches, years.at(-1), years[0]);
  } catch (error) {
    if (error.name === "AbortError" || requestId !== dblpSearchRequestId) return;
    console.warn("Could not search DBLP:", error);
    renderDblpSearchMessage("DBLP search is unavailable. Please try again.");
  } finally {
    if (requestId === dblpSearchRequestId) activeDblpSearchController = null;
  }
}

async function loadMoreDblpResults() {
  if (!dblpSearchState || dblpSearchState.hits.length >= dblpSearchState.totalMatches) return;
  activeDblpSearchController?.abort();
  const controller = new AbortController();
  const requestId = ++dblpSearchRequestId;
  activeDblpSearchController = controller;
  els.dblpLoadMore.disabled = true;
  els.dblpLoadMore.textContent = "Loading…";

  try {
    const { query, years, hits } = dblpSearchState;
    const result = await fetchDblpPage(query, years, hits.length, controller.signal);
    if (requestId !== dblpSearchRequestId) return;
    dblpSearchState.hits.push(...result.hits);
    dblpSearchState.totalMatches = result.totalMatches;
    renderDblpSearchResults(
      dblpSearchState.hits,
      result.totalMatches,
      years.at(-1),
      years[0],
    );
  } catch (error) {
    if (error.name === "AbortError" || requestId !== dblpSearchRequestId) return;
    console.warn("Could not load more DBLP results:", error);
    els.dblpLoadMore.textContent = "Retry load more";
  } finally {
    if (requestId === dblpSearchRequestId) {
      activeDblpSearchController = null;
      els.dblpLoadMore.disabled = false;
      if (els.dblpLoadMore.textContent === "Loading…") els.dblpLoadMore.textContent = "Load more";
    }
  }
}

async function fetchDblpPage(query, years, offset, signal) {
  const savedEndpoint = localStorage.getItem(STORAGE_DBLP_SEARCH_ENDPOINT);
  const endpoints = DBLP_SEARCH_ENDPOINTS.includes(savedEndpoint)
    ? [savedEndpoint, ...DBLP_SEARCH_ENDPOINTS.filter((endpoint) => endpoint !== savedEndpoint)]
    : DBLP_SEARCH_ENDPOINTS;
  let lastError;

  for (const endpoint of endpoints) {
    try {
      const result = await fetchDblpPageFromEndpoint(endpoint, query, years, offset, signal);
      localStorage.setItem(STORAGE_DBLP_SEARCH_ENDPOINT, endpoint);
      return result;
    } catch (error) {
      if (signal.aborted) throw error;
      lastError = error;
      console.warn(`DBLP endpoint failed; trying fallback: ${endpoint}`, error);
    }
  }
  throw lastError ?? new Error("All DBLP endpoints failed");
}

async function fetchDblpPageFromEndpoint(endpoint, query, years, offset, signal) {
  const yearFilter = years.map((year) => `year:${year}:`).join("|");
  const url = new URL(endpoint);
  url.searchParams.set("q", `${query} (${yearFilter})`);
  url.searchParams.set("format", "json");
  url.searchParams.set("h", "1000");
  url.searchParams.set("f", String(offset));
  url.searchParams.set("c", "0");
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(DBLP_REQUEST_TIMEOUT_MS)]);
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: requestSignal,
  });
  if (!response.ok) throw new Error(`DBLP request failed (${response.status})`);

  const data = await response.json();
  return {
    hits: Array.isArray(data?.result?.hits?.hit) ? data.result.hits.hit : [],
    totalMatches: Number.parseInt(data?.result?.hits?.["@total"], 10) || 0,
  };
}

function renderDblpSearchResults(hits, totalMatches, startYear, endYear) {
  els.dblpSearchCount.hidden = false;
  const preferredVenues = getDblpPreferredVenues();
  const rankedHits = hits.map((hit, index) => ({
    hit,
    index,
    venuePriority: getDblpVenuePriority(hit, preferredVenues),
    year: getDblpPublicationYear(hit),
  }));
  const preferredHits = rankedHits
    .filter(({ venuePriority }) => venuePriority !== -1)
    .sort((left, right) => right.year - left.year || left.index - right.index);
  const otherHits = rankedHits
    .filter(({ venuePriority }) => venuePriority === -1)
    .sort((left, right) => right.year - left.year || left.index - right.index);
  const loadedLabel = totalMatches > hits.length
    ? `${hits.length.toLocaleString()} of ${totalMatches.toLocaleString()} papers loaded`
    : `${hits.length} paper${hits.length === 1 ? "" : "s"} loaded`;
  const preferredLabel = ` · ${preferredHits.length} preferred`;
  const matchesLabel = Number.isFinite(totalMatches) ? ` · ${totalMatches.toLocaleString()} DBLP matches` : "";
  const yearLabel = Number.isFinite(startYear) && Number.isFinite(endYear) ? ` · ${startYear}–${endYear}` : "";
  els.dblpSearchCount.textContent = `${loadedLabel}${preferredLabel}${matchesLabel}${yearLabel}`;
  els.dblpLoadMore.hidden = hits.length >= totalMatches;
  els.dblpLoadMore.disabled = false;
  els.dblpLoadMore.textContent = "Load more";
  if (!hits.length) {
    renderDblpSearchMessage("No matching publications.", false, true);
    return;
  }

  els.dblpSearchResults.replaceChildren(
    ...preferredHits.map(({ hit }) => createDblpSearchResult(hit, true)),
    ...otherHits.map(({ hit }) => createDblpSearchResult(hit)),
  );
  els.dblpSearchResults.setAttribute("aria-busy", "false");
}

function renderDblpSearchMessage(text, busy = false, keepCount = false) {
  if (!keepCount) {
    els.dblpSearchCount.hidden = true;
    els.dblpSearchCount.textContent = "";
  }
  const message = document.createElement("p");
  message.className = "empty-state";
  message.textContent = text;
  els.dblpSearchResults.replaceChildren(message);
  els.dblpSearchResults.setAttribute("aria-busy", String(busy));
}

function createDblpSearchResult(hit, preferred = false) {
  const info = hit?.info ?? {};
  const article = document.createElement("article");
  article.className = `dblp-search-result${preferred ? " dblp-search-result--preferred" : ""}`;

  const title = document.createElement("a");
  title.className = "dblp-search-result-title";
  title.href = normalizeDblpUrl(info.url);
  title.target = "_blank";
  title.rel = "noreferrer";
  title.textContent = cleanPaperText(String(info.title ?? "Untitled publication"));

  const authors = document.createElement("p");
  authors.className = "dblp-search-result-authors";
  authors.textContent = getDblpAuthors(info.authors).join(", ") || "Unknown authors";

  const details = document.createElement("p");
  details.className = "dblp-search-result-details";
  details.textContent = [getDblpDisplayVenue(info), info.year, info.type].filter(Boolean).join(" · ");

  article.append(title, authors);
  if (details.textContent) article.append(details);
  return article;
}

function getDblpDisplayVenue(info) {
  const venue = String(info?.venue ?? "").trim();
  const issue = String(info?.number ?? "").trim();
  if (venue.toUpperCase() === "PROC. ACM PROGRAM. LANG." && /^OOPSLA\d*$/i.test(issue)) return "OOPSLA";
  return venue;
}

function getDblpPreferredVenues() {
  return els.dblpPreferredVenuesInput.value
    .split(",")
    .map((venue) => venue.trim().toUpperCase())
    .filter((venue, index, venues) => venue && venues.indexOf(venue) === index);
}

function getDblpVenuePriority(hit, preferredVenues) {
  const info = hit?.info ?? {};
  if (isDblpShortPaper(info.pages)) return -1;
  const venue = String(info.venue ?? "").trim().toUpperCase();
  const issue = String(info.number ?? "").trim().toUpperCase();
  return preferredVenues.findIndex((preferredVenue) => isDblpMainTrackVenue(venue, issue, preferredVenue));
}

function isDblpShortPaper(pages) {
  const [firstPage, lastPage] = String(pages ?? "").split(/[-–—]/);
  if (!firstPage || !lastPage) return false;
  const start = Number.parseInt(firstPage.match(/\d+$/)?.[0], 10);
  const end = Number.parseInt(lastPage.match(/\d+$/)?.[0], 10);
  return Number.isFinite(start) && Number.isFinite(end) && end >= start && end - start + 1 <= 6;
}

function isDblpMainTrackVenue(venue, issue, preferredVenue) {
  if (venue === preferredVenue) return true;
  // DBLP uses both FSE and ESEC/SIGSOFT FSE for the main software-engineering conference.
  if (preferredVenue === "FSE" && /^(ESEC\/)?SIGSOFT FSE$/.test(venue)) return true;
  // OOPSLA papers are published in PACMPL issues named OOPSLA1 or OOPSLA2.
  if (preferredVenue === "OOPSLA" && venue === "PROC. ACM PROGRAM. LANG." && /^OOPSLA\d*$/.test(issue)) return true;
  return false;
}

function getDblpPublicationYear(hit) {
  const year = Number.parseInt(hit?.info?.year, 10);
  return Number.isFinite(year) ? year : Number.NEGATIVE_INFINITY;
}

function getDblpAuthors(authors) {
  const values = authors?.author == null ? [] : [].concat(authors.author);
  return values.map((author) => cleanPaperText(typeof author === "string" ? author : author?.text ?? "")).filter(Boolean);
}

function normalizeDblpUrl(value) {
  try {
    const url = new URL(value || "https://dblp.uni-trier.de/");
    if (url.hostname === "dblp.org" || url.hostname.endsWith(".dblp.org")) url.hostname = "dblp.uni-trier.de";
    return url.href;
  } catch {
    return "https://dblp.uni-trier.de/";
  }
}

function openPaperModal(task = null) {
  editingPaperTaskId = task?.id ?? "";
  document.querySelector("#paperDialogTitle").textContent = task ? "Edit paper" : "Add paper";
  els.paperModalFieldLabel.textContent = "Paper titles, arXiv URLs, or ACM DL URLs";
  els.paperModalSubmit.textContent = task ? "Save" : "Add papers";
  els.deletePaper.hidden = !task;
  els.paperModalInput.value = "";
  els.paperModalInputField.hidden = Boolean(task);
  els.paperEditIdentity.hidden = !task;
  els.paperEditTitle.textContent = task?.title ?? "";
  const sourceUrl = task?.metadata?.absUrl ?? "";
  els.paperEditSource.hidden = !sourceUrl;
  els.paperEditSource.href = sourceUrl;
  els.paperEditSource.textContent = sourceUrl;
  els.paperEditFields.hidden = !task;
  els.paperNoteInput.value = task?.note ?? "";
  els.paperTagsInput.value = Array.isArray(task?.tags) ? task.tags.join(", ") : "";
  renderPaperTagSuggestions();
  els.paperModal.classList.add("is-open");
  els.paperModal.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => (task ? els.paperNoteInput : els.paperModalInput).focus());
}

function closePaperModal() {
  editingPaperTaskId = "";
  els.paperModal.classList.remove("is-open");
  els.paperModal.setAttribute("aria-hidden", "true");
  els.paperModalInput.value = "";
  els.paperNoteInput.value = "";
  els.paperTagsInput.value = "";
  els.paperEditFields.hidden = true;
  els.paperEditIdentity.hidden = true;
  els.paperEditSource.hidden = true;
  els.paperTagSuggestions.hidden = true;
  els.paperTagSuggestionList.replaceChildren();
  els.paperModalInputField.hidden = false;
  els.deletePaper.hidden = true;
}

function renderPaperTagSuggestions() {
  const seen = new Set();
  const tags = paperTasks
    .flatMap((task) => (Array.isArray(task.tags) ? task.tags : []))
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.localeCompare(b));

  els.paperTagSuggestions.hidden = !editingPaperTaskId || !tags.length;
  els.paperTagSuggestionList.replaceChildren(...tags.map(createPaperTagSuggestion));
}

function createPaperTagSuggestion(tag) {
  const button = document.createElement("button");
  button.className = "paper-tag-suggestion";
  button.type = "button";
  button.textContent = tag;
  button.style.setProperty("--paper-tag-color", getPaperTagColor(tag));
  button.addEventListener("click", () => {
    const tags = parsePaperTags(els.paperTagsInput.value);
    if (!tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) tags.push(tag);
    els.paperTagsInput.value = tags.join(", ");
    els.paperTagsInput.focus();
  });
  return button;
}

function deleteEditingPaperTask() {
  if (!editingPaperTaskId) return;
  paperTasks = paperTasks.filter((task) => task.id !== editingPaperTaskId);
  savePaperTasks();
  renderPaperTasks();
  closePaperModal();
  showToast("Paper deleted");
}

function renderPaperTasks() {
  const activeTasks = paperTasks
    .filter((task) => !task.done && paperMatchesFilter(task))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const readPapers = paperTasks
    .filter((task) => task.done && paperMatchesFilter(task))
    .sort((a, b) => (b.readAt || b.createdAt).localeCompare(a.readAt || a.createdAt));

  els.paperTaskCount.textContent = activeTasks.length;
  els.readPaperCount.textContent = readPapers.length;
  const activeEmptyText = paperFilterQuery ? "No matching paper tasks." : "No papers queued.";
  const readEmptyText = paperFilterQuery ? "No matching read papers." : "No papers read yet.";
  renderPaperTaskGroup(els.paperTaskList, activeTasks, activeEmptyText);
  renderPaperTaskGroup(els.readPaperList, readPapers, readEmptyText);
}

function paperMatchesFilter(task) {
  if (!paperFilterQuery) return true;
  const metadata = task.metadata ?? {};
  const haystack = [
    task.title,
    ...(metadata.authors ?? []),
    metadata.arxivId,
    metadata.doi,
    metadata.semanticScholarId,
    metadata.summary,
    task.note,
    ...(Array.isArray(task.tags) ? task.tags : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(paperFilterQuery);
}

function renderPaperTaskGroup(container, tasks, emptyText) {
  if (tasks.length) {
    container.replaceChildren(...tasks.map(createPaperTaskItem));
    return;
  }

  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = emptyText;
  container.replaceChildren(empty);
}

function createPaperTaskItem(task) {
  const item = document.createElement("article");
  item.className = "paper-task-item";

  const body = document.createElement("div");
  body.className = "paper-task-body";

  const details = document.createElement("div");
  details.className = "paper-task-details";

  const title = document.createElement("div");
  title.className = "paper-task-title";
  title.title = task.title;
  title.textContent = task.title;

  details.append(title);
  if (task.metadata) {
    const meta = document.createElement("div");
    meta.className = "paper-task-meta";
    meta.textContent = formatPaperMetadata(task.metadata);
    details.append(meta);
  }

  if (Array.isArray(task.tags) && task.tags.length) {
    const tags = document.createElement("div");
    tags.className = "paper-task-tags";
    tags.replaceChildren(...task.tags.map(createPaperTag));
    details.append(tags);
  }

  if (task.note) {
    const note = document.createElement("p");
    note.className = "paper-task-note";
    note.textContent = task.note;
    details.append(note);
  }

  const actions = document.createElement("div");
  actions.className = "paper-task-actions";

  const editButton = document.createElement("button");
  editButton.className = "paper-task-action";
  editButton.type = "button";
  editButton.textContent = "Edit";
  editButton.setAttribute("aria-label", `Edit ${task.title}`);
  editButton.addEventListener("click", () => openPaperModal(task));

  if (task.metadata?.absUrl) {
    actions.append(createPaperLink("Abs", task.metadata.absUrl));
  }

  if (task.metadata?.pdfUrl) {
    actions.append(createPaperLink("PDF", task.metadata.pdfUrl));
  }

  actions.append(editButton);
  body.append(details, actions);
  item.append(body);
  return item;
}

function createPaperTag(label) {
  const tag = document.createElement("span");
  tag.className = "paper-task-tag";
  tag.textContent = label;
  tag.style.setProperty("--paper-tag-color", getPaperTagColor(label));
  return tag;
}

function getPaperTagColor(label) {
  const hash = [...label.toLowerCase()].reduce((value, character) => ((value * 31) + character.codePointAt(0)) >>> 0, 0);
  return paperTagColors[hash % paperTagColors.length];
}

function createPaperLink(label, href) {
  const link = document.createElement("a");
  link.className = "paper-task-action";
  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = label;
  return link;
}

function formatPaperMetadata(metadata) {
  const authorList = formatPaperAuthors(metadata.authors ?? []);
  const authors = authorList ? ` · ${authorList}` : "";
  const published = metadata.published ? ` · ${metadata.published.slice(0, 10)}` : "";
  const source = metadata.source === "semantic-scholar"
    ? `S2:${metadata.semanticScholarId?.slice(0, 8)}`
    : metadata.source === "acm"
      ? `ACM:${metadata.doi}`
      : `arXiv:${metadata.arxivId}`;
  return `${source}${authors}${published}`;
}

function formatPaperAuthors(authors) {
  if (authors.length <= 3) return authors.join(", ");
  return `${authors[0]}, ${authors[1]}, …, ${authors.at(-1)}`;
}

async function addPaperTasksFromInput(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (editingPaperTaskId) {
    await saveEditedPaperTask(form);
    return;
  }
  const input = form.querySelector("textarea");
  const inputs = input.value
    .split("\n")
    .map((title) => title.trim())
    .filter(Boolean);

  if (!inputs.length) return;

  const submitButton = form.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Adding...";

  const existingKeys = new Set(paperTasks.map((task) => getPaperTaskKey(task)));
  const createdAt = new Date().toISOString();
  const newTasks = [];

  const resolvedPapers = await Promise.all(inputs.map(resolvePaperMetadata));

  for (const [index, paperInput] of inputs.entries()) {
    const metadata = resolvedPapers[index];
    const title = metadata?.title ?? paperInput;
    const task = {
      id: makeId(),
      title,
      done: false,
      createdAt: `${createdAt}-${newTasks.length}`,
      ...(metadata ? { metadata } : {}),
    };

    const key = getPaperTaskKey(task);
    if (!existingKeys.has(key)) {
      existingKeys.add(key);
      newTasks.push(task);
    }
  }

  submitButton.disabled = false;
  submitButton.textContent = "Add papers";

  if (!newTasks.length) {
    showToast("Those papers are already queued");
    return;
  }

  paperTasks = [...paperTasks, ...newTasks];
  input.value = "";
  if (form === els.paperModalForm) closePaperModal();
  savePaperTasks();
  renderPaperTasks();
  setSidebarPanel("papers");
  showToast(`${newTasks.length} paper${newTasks.length === 1 ? "" : "s"} added`);
}

async function saveEditedPaperTask(form) {
  const taskIndex = paperTasks.findIndex((task) => task.id === editingPaperTaskId);
  if (taskIndex < 0) return;

  const submitButton = form.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Saving...";

  paperTasks.splice(taskIndex, 1, {
    ...paperTasks[taskIndex],
    note: els.paperNoteInput.value.trim(),
    tags: parsePaperTags(els.paperTagsInput.value),
  });
  submitButton.disabled = false;
  submitButton.textContent = "Save";
  savePaperTasks();
  renderPaperTasks();
  closePaperModal();
  showToast("Paper updated");
}

function parsePaperTags(value) {
  return [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))];
}

function getPaperTaskKey(task) {
  if (task.metadata?.arxivId) return `arxiv:${task.metadata.arxivId.toLowerCase()}`;
  if (task.metadata?.doi) return `doi:${task.metadata.doi.toLowerCase()}`;
  if (task.metadata?.semanticScholarId) return `s2:${task.metadata.semanticScholarId.toLowerCase()}`;
  return `title:${task.title.toLowerCase()}`;
}

function extractArxivId(input) {
  const value = input.trim();
  const urlMatch = value.match(/arxiv\.org\/(?:abs|pdf|e-print)\/([^?#\s]+)/i);
  if (urlMatch) return normalizeArxivId(urlMatch[1]);

  const idMatch = value.match(/\b(\d{4}\.\d{4,5}(?:v\d+)?|[a-z-]+(?:\.[A-Z]{2})?\/\d{7}(?:v\d+)?)\b/i);
  return idMatch ? normalizeArxivId(idMatch[1]) : null;
}

function normalizeArxivId(value) {
  return value.replace(/\.pdf$/i, "").replace(/^arxiv:/i, "");
}

function extractAcmDoi(input) {
  const value = input.trim();
  const urlMatch = value.match(/(?:dl\.acm\.org\/doi\/(?:abs\/|pdf\/|epdf\/|full\/)?|doi\.org\/)(10\.1145\/\d+(?:\.\d+)*)(?:[/?#]|$)/i);
  if (urlMatch) return urlMatch[1].toLowerCase();

  const doiMatch = value.match(/\b(10\.1145\/\d+(?:\.\d+)*)\b/i);
  return doiMatch ? doiMatch[1].toLowerCase() : null;
}

function extractSemanticScholarPaperId(input) {
  const value = input.trim();
  const urlMatch = value.match(/semanticscholar\.org\/paper\/(?:[^/]+\/)?([a-f0-9]{40})(?:[/?#]|$)/i);
  if (urlMatch) return urlMatch[1];

  const hashMatch = value.match(/\b([a-f0-9]{40})\b/i);
  return hashMatch ? hashMatch[1] : null;
}

function createStaticPaperMetadata(input) {
  const arxivId = extractArxivId(input);
  if (arxivId) {
    return {
      source: "arxiv",
      arxivId,
      title: `arXiv:${arxivId}`,
      authors: [],
      summary: "",
      published: "",
      absUrl: `https://arxiv.org/abs/${arxivId}`,
      pdfUrl: `https://arxiv.org/pdf/${arxivId}`,
    };
  }

  const doi = extractAcmDoi(input);
  if (doi) {
    return {
      source: "acm",
      doi,
      title: `ACM:${doi}`,
      authors: [],
      summary: "",
      published: "",
      absUrl: `https://dl.acm.org/doi/abs/${doi}`,
      pdfUrl: `https://dl.acm.org/doi/pdf/${doi}`,
    };
  }

  const semanticScholarId = extractSemanticScholarPaperId(input);
  if (semanticScholarId) {
    return {
      source: "semantic-scholar",
      semanticScholarId,
      title: getSemanticScholarTitleFallback(input, semanticScholarId),
      authors: [],
      summary: "",
      published: "",
      absUrl: input.includes("semanticscholar.org") ? input : `https://www.semanticscholar.org/paper/${semanticScholarId}`,
      pdfUrl: "",
    };
  }

  return null;
}

function getSemanticScholarTitleFallback(input, paperId) {
  const slug = input.match(/semanticscholar\.org\/paper\/([^/]+)\//i)?.[1];
  if (!slug) return `Semantic Scholar:${paperId.slice(0, 8)}`;
  return slug.replace(/-/g, " ");
}

async function resolvePaperMetadata(input) {
  const fallback = createStaticPaperMetadata(input);
  if (!fallback?.arxivId && !fallback?.doi) return fallback;

  const endpoint = window.ACADEMICAL_GOOGLE_CONFIG?.paperMetadataUrl
    || window.ACADEMICAL_GOOGLE_CONFIG?.arxivMetadataUrl;
  if (!endpoint) return fallback;

  try {
    const url = new URL(endpoint, window.location.origin);
    if (fallback.arxivId) {
      url.searchParams.set("id", fallback.arxivId);
      const response = await fetch(url, { headers: { Accept: "application/atom+xml" } });
      if (!response.ok) throw new Error(`Metadata request failed (${response.status})`);
      return parseArxivMetadata(await response.text(), fallback);
    }

    url.searchParams.set("doi", fallback.doi);
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Metadata request failed (${response.status})`);
    return parseAcmMetadata(await response.json(), fallback);
  } catch (error) {
    const identifier = fallback.arxivId || fallback.doi;
    console.warn(`Could not load paper metadata for ${identifier}:`, error);
    return fallback;
  }
}

function parseAcmMetadata(metadata, fallback) {
  if (!metadata || metadata.source !== "acm" || !metadata.title) {
    throw new Error("Worker returned invalid ACM metadata");
  }

  return {
    ...fallback,
    title: cleanPaperText(metadata.title) || fallback.title,
    authors: Array.isArray(metadata.authors) ? metadata.authors.map(cleanPaperText).filter(Boolean) : [],
    summary: cleanPaperText(metadata.summary || ""),
    published: cleanPaperText(metadata.published || ""),
    absUrl: metadata.absUrl || fallback.absUrl,
    pdfUrl: metadata.pdfUrl || fallback.pdfUrl,
  };
}

function parseArxivMetadata(xml, fallback) {
  const documentNode = new DOMParser().parseFromString(xml, "application/xml");
  const entry = documentNode.getElementsByTagName("entry")[0];
  if (!entry || documentNode.getElementsByTagName("parsererror").length) {
    throw new Error("arXiv returned invalid metadata");
  }

  const text = (tagName) => cleanPaperText(entry.getElementsByTagName(tagName)[0]?.textContent ?? "");
  const authors = [...entry.getElementsByTagName("author")]
    .map((author) => cleanPaperText(author.getElementsByTagName("name")[0]?.textContent ?? ""))
    .filter(Boolean);
  const links = [...entry.getElementsByTagName("link")];
  const alternateLink = links.find((link) => link.getAttribute("rel") === "alternate")?.getAttribute("href");
  const pdfLink = links.find((link) => link.getAttribute("title") === "pdf")?.getAttribute("href");

  return {
    ...fallback,
    title: text("title") || fallback.title,
    authors,
    summary: text("summary"),
    published: text("published"),
    absUrl: alternateLink || fallback.absUrl,
    pdfUrl: pdfLink || fallback.pdfUrl,
  };
}

function cleanPaperText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function isReadEventTitle(title) {
  return title.trim().slice(0, 4).toLowerCase() === "read";
}

function getReadEventPaperQuery(title) {
  if (!isReadEventTitle(title)) return "";
  return title.trim().slice(4).replace(/^[:\s-]+/, "").trim().toLowerCase();
}

function inferPaperTaskIdsFromEvent(event) {
  if (!event?.title) return [];
  const readTitle = getReadEventPaperQuery(event.title);
  if (!readTitle) return [];
  return paperTasks
    .filter((task) => !task.done && task.title.trim().toLowerCase() === readTitle)
    .map((task) => task.id);
}

function getPaperSnapshot(task) {
  return {
    id: task.id,
    title: task.title,
    metadata: task.metadata ?? null,
  };
}

function getExistingEventPaperSnapshots(event) {
  const snapshots = Array.isArray(event?.papers) ? event.papers : [];
  const snapshotIds = new Set(snapshots.map((paper) => paper.id));
  const idMatches = (event?.paperTaskIds ?? [])
    .filter((id) => !snapshotIds.has(id))
    .map((id) => paperTasks.find((task) => task.id === id))
    .filter(Boolean)
    .map(getPaperSnapshot);
  return [...snapshots, ...idMatches];
}

function getEventPaperAssignmentCandidates() {
  return paperTasks
    .filter((task) => !task.done)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(getPaperSnapshot);
}

function renderEventPaperAssignment(selectedIds = []) {
  const selectedSet = new Set(selectedIds);
  const showAssignment = isReadEventTitle(els.eventTitle.value);
  els.eventPaperAssignment.hidden = !showAssignment;

  if (!showAssignment) {
    els.eventPaperAssignmentList.replaceChildren();
    els.eventPaperAssignmentCount.textContent = "0 selected";
    return;
  }

  const candidates = getEventPaperAssignmentCandidates();
  if (!candidates.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No paper tasks yet. Press P to add papers.";
    els.eventPaperAssignmentList.replaceChildren(empty);
    els.eventPaperAssignmentCount.textContent = "0 selected";
    return;
  }

  els.eventPaperAssignmentList.replaceChildren(
    ...candidates.map((paper) => createEventPaperAssignmentOption(paper, selectedSet.has(paper.id)))
  );
  updateEventPaperAssignmentCount();
}

function createEventPaperAssignmentOption(task, checked) {
  const label = document.createElement("label");
  label.className = "paper-assignment-option";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.value = task.id;
  checkbox.checked = checked;
  checkbox.addEventListener("change", updateEventPaperAssignmentCount);

  const text = document.createElement("span");
  text.textContent = task.title;
  text.title = task.title;

  label.append(checkbox, text);
  return label;
}

function getSelectedEventPaperIds() {
  return [...els.eventPaperAssignmentList.querySelectorAll("input[type='checkbox']:checked")].map((input) => input.value);
}

function getSelectedEventPapers() {
  const selectedIds = new Set(getSelectedEventPaperIds());
  return getEventPaperAssignmentCandidates().filter((paper) => selectedIds.has(paper.id));
}

function getReadEventTitleForPapers(currentTitle, papers) {
  if (!papers.length) return currentTitle.trim();
  const readPrefix = currentTitle.trim().slice(0, 4);
  if (papers.length === 1) return `${readPrefix}: ${papers[0].title}`;
  return `${readPrefix}: ${papers[0].title} + ${papers.length - 1} more`;
}

function markAssignedPapersAsRead(papers) {
  const selectedById = new Map(papers.filter((paper) => paper?.id).map((paper) => [paper.id, paper]));
  if (!selectedById.size) return false;

  const readAt = new Date().toISOString();
  let changed = false;
  paperTasks = paperTasks.map((task) => {
    if (!selectedById.has(task.id) || task.done) return task;
    changed = true;
    return { ...task, done: true, readAt };
  });

  const existingIds = new Set(paperTasks.map((task) => task.id));
  const added = [...selectedById.values()]
    .filter((paper) => !existingIds.has(paper.id))
    .map((paper, index) => ({
      id: paper.id,
      title: paper.title,
      metadata: paper.metadata ?? null,
      done: true,
      readAt,
      createdAt: `${readAt}-assigned-${index}`,
    }));

  if (added.length) {
    paperTasks = [...paperTasks, ...added];
    changed = true;
  }
  return changed;
}

function restorePapersToTasks(papers) {
  const restoredIds = new Set(papers.filter((paper) => paper?.id).map((paper) => paper.id));
  let changed = false;
  paperTasks = paperTasks.map((task) => {
    if (!restoredIds.has(task.id) || !task.done) return task;
    changed = true;
    const { readAt, ...restoredTask } = task;
    return { ...restoredTask, done: false };
  });

  const existingIds = new Set(paperTasks.map((task) => task.id));
  const added = papers
    .filter((paper) => paper?.id && !existingIds.has(paper.id))
    .map((paper, index) => ({
      id: paper.id,
      title: paper.title,
      metadata: paper.metadata ?? null,
      done: false,
      createdAt: `${new Date().toISOString()}-restored-${index}`,
    }));

  if (added.length) {
    paperTasks = [...paperTasks, ...added];
    changed = true;
  }
  return changed;
}

function getAssignedPapersForOccurrence(event, occurrenceDate = event.date) {
  const occurrence = createEventOccurrence(event, occurrenceDate);
  return Array.isArray(occurrence.papers) ? occurrence.papers : [];
}

function getAllAssignedPapersInSeries(event) {
  const byId = new Map();
  (event.papers ?? []).forEach((paper) => byId.set(paper.id, paper));
  Object.values(event.instanceOverrides ?? {}).forEach((override) => {
    (override.papers ?? []).forEach((paper) => byId.set(paper.id, paper));
  });
  return [...byId.values()];
}

function updateEventPaperAssignmentCount() {
  const count = getSelectedEventPaperIds().length;
  els.eventPaperAssignmentCount.textContent = `${count} selected`;
}

function getCurrentViewTimeAnalysis() {
  const { start, end } = getVisibleDateRange();
  const rangeStart = new Date(start);
  const rangeEnd = new Date(end);
  const days = Math.max(1, Math.round((startOfDay(rangeEnd) - startOfDay(rangeStart)) / 86_400_000) + 1);
  const occurrences = [];

  makeDateRange(startOfDay(rangeStart), days).forEach((date) => {
    const dateKey = toDateKey(date);
    getFilteredEventsForDate(dateKey).forEach((occurrence) => {
      if (!occurrence.time) return;
      const { start: occurrenceStart, end: occurrenceEnd } = getOccurrenceDateTimeRange(occurrence);
      const clippedStart = occurrenceStart < rangeStart ? rangeStart : occurrenceStart;
      const clippedEnd = occurrenceEnd > rangeEnd ? rangeEnd : occurrenceEnd;
      const hours = Math.max(0, (clippedEnd - clippedStart) / 3_600_000);
      if (!hours) return;
      occurrences.push({
        title: occurrence.title,
        label: `${occurrence.title} · ${compactDateFormatter.format(occurrenceStart)}, ${formatTime(occurrence.time)}, ${formatHoursLong(hours)}`,
        start: clippedStart,
        end: clippedEnd,
        hours,
      });
    });
  });

  return {
    rangeLabel: getHeaderTitle(rangeStart, rangeEnd),
    occurrences: occurrences.sort((a, b) => a.label.localeCompare(b.label)),
    totalHours: occurrences.reduce((total, occurrence) => total + occurrence.hours, 0),
    weeklyHours: getWeeklyHoursData(occurrences, rangeStart, rangeEnd),
    weeklyActivity: getWeeklyActivityData(occurrences),
  };
}

function getWeeklyHoursData(occurrences, rangeStart, rangeEnd) {
  const byWeek = new Map();
  let cursor = startOfWeek(rangeStart);

  while (cursor <= rangeEnd) {
    ensureWeeklyHoursRow(byWeek, cursor);
    cursor = addDays(cursor, 7);
  }

  occurrences.forEach((occurrence) => addOccurrenceHoursToWeeks(byWeek, occurrence));

  return [...byWeek.values()]
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((row) => ({ ...row, hours: Math.round(row.hours * 100) / 100 }));
}

function ensureWeeklyHoursRow(byWeek, date) {
  const weekInfo = getIsoWeekInfo(date);
  if (!byWeek.has(weekInfo.key)) {
    byWeek.set(weekInfo.key, {
      week: weekInfo.key,
      label: `W${String(weekInfo.week).padStart(2, "0")}`,
      hours: 0,
    });
  }
  return byWeek.get(weekInfo.key);
}

function addOccurrenceHoursToWeeks(byWeek, occurrence) {
  let cursor = new Date(occurrence.start);
  const end = new Date(occurrence.end);

  while (cursor < end) {
    const nextWeekStart = addDays(startOfWeek(cursor), 7);
    const segmentEnd = end < nextWeekStart ? end : nextWeekStart;
    if (segmentEnd <= cursor) break;

    const hours = Math.max(0, (segmentEnd - cursor) / 3_600_000);
    if (hours) ensureWeeklyHoursRow(byWeek, cursor).hours += hours;
    cursor = new Date(segmentEnd);
  }
}

function getWeeklyActivityData(occurrences) {
  const byWeek = new Map();

  occurrences.forEach((occurrence) => {
    const category = getActivityCategory(occurrence.title);
    if (!category || !occurrence.start) return;

    const weekInfo = getIsoWeekInfo(occurrence.start);
    if (!byWeek.has(weekInfo.key)) {
      byWeek.set(weekInfo.key, {
        week: weekInfo.key,
        label: `W${String(weekInfo.week).padStart(2, "0")}`,
      });
    }

    const row = byWeek.get(weekInfo.key);
    row[category] = (row[category] || 0) + occurrence.hours;
  });

  const cumulativeTotals = Object.fromEntries(ACTIVITY_CATEGORIES.map(({ key }) => [key, 0]));
  return [...byWeek.values()]
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((row) => {
      const cumulativeRow = { week: row.week, label: row.label };
      ACTIVITY_CATEGORIES.forEach(({ key }) => {
        cumulativeTotals[key] += row[key] || 0;
        cumulativeRow[key] = cumulativeTotals[key];
      });
      return cumulativeRow;
    });
}

function getActivityCategory(title = "") {
  const prefix = title.split(":")[0].trim().toLowerCase();
  return ACTIVITY_CATEGORIES.some(({ key }) => key === prefix) ? prefix : "";
}

function renderWeeklyActivityChart(activityData, weeklyHoursData = []) {
  els.weeklyActivityChart.hidden = false;
  els.weeklyActivityChartBody.replaceChildren();

  if (!weeklyHoursData.length) {
    const empty = document.createElement("p");
    empty.className = "weekly-activity-chart-empty";
    empty.textContent = "No worked hours in this range.";
    els.weeklyActivityChartBody.append(empty);
    return;
  }

  const hoursPanel = document.createElement("section");
  hoursPanel.className = "time-analysis-chart-panel";
  hoursPanel.setAttribute("aria-label", "Working hours per week chart");
  hoursPanel.append(createWeeklyHoursChart(weeklyHoursData));
  els.weeklyActivityChartBody.append(hoursPanel);

  if (activityData.length) {
    const activityPanel = document.createElement("section");
    activityPanel.className = "time-analysis-chart-panel";
    activityPanel.setAttribute("aria-label", "Cumulative activity categories chart");

    const activityHeading = document.createElement("h4");
    activityHeading.className = "weekly-activity-chart-subheading";
    activityHeading.textContent = "Cumulative activity categories";
    activityPanel.append(activityHeading, createWeeklyActivityChart(activityData), createWeeklyActivityLegend());
    els.weeklyActivityChartBody.append(activityPanel);
  }
}

function createWeeklyHoursChart(data) {
  const frame = document.createElement("div");
  frame.className = "weekly-hours-chart-frame";

  const tooltip = document.createElement("div");
  tooltip.className = "weekly-hours-tooltip";
  tooltip.hidden = true;

  frame.append(createWeeklyHoursChartSvg(data, tooltip), tooltip);
  return frame;
}

function createWeeklyHoursChartSvg(data, tooltip) {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const width = 360;
  const height = 220;
  const margin = { top: 18, right: 18, bottom: 46, left: 54 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxHours = Math.max(1, ...data.map((row) => row.hours || 0));
  const yTicks = getWeeklyHoursAxisTicks(maxHours);
  const yMax = yTicks[yTicks.length - 1] || maxHours;
  const xForIndex = (index) => margin.left + (data.length === 1 ? plotWidth / 2 : (plotWidth * index) / (data.length - 1));
  const yForHours = (hours) => margin.top + plotHeight - (plotHeight * hours) / yMax;

  const svg = document.createElementNS(svgNamespace, "svg");
  svg.classList.add("weekly-hours-svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Working hours per week scatter plot");
  svg.dataset.weekCount = String(data.length);

  const title = document.createElementNS(svgNamespace, "title");
  title.textContent = "Working hours per week";
  svg.append(title);

  yTicks.forEach((tick) => {
    const y = yForHours(tick);
    const gridLine = document.createElementNS(svgNamespace, "line");
    gridLine.classList.add("weekly-hours-grid");
    gridLine.setAttribute("x1", String(margin.left));
    gridLine.setAttribute("x2", String(width - margin.right));
    gridLine.setAttribute("y1", String(y));
    gridLine.setAttribute("y2", String(y));
    gridLine.setAttribute("stroke", "#e8eaed");
    gridLine.setAttribute("stroke-width", "1");
    svg.append(gridLine);

    const label = document.createElementNS(svgNamespace, "text");
    label.classList.add("weekly-hours-axis-label");
    label.setAttribute("x", String(margin.left - 8));
    label.setAttribute("y", String(y + 3));
    label.setAttribute("text-anchor", "end");
    label.setAttribute("fill", "#5f6368");
    label.setAttribute("font-size", "10");
    label.textContent = formatHours(tick).replace("h", "");
    svg.append(label);
  });

  const yAxis = document.createElementNS(svgNamespace, "line");
  yAxis.classList.add("weekly-hours-axis");
  yAxis.setAttribute("x1", String(margin.left));
  yAxis.setAttribute("x2", String(margin.left));
  yAxis.setAttribute("y1", String(margin.top));
  yAxis.setAttribute("y2", String(margin.top + plotHeight));
  yAxis.setAttribute("stroke", "#dadce0");
  yAxis.setAttribute("stroke-width", "1.2");

  const xAxis = document.createElementNS(svgNamespace, "line");
  xAxis.classList.add("weekly-hours-axis");
  xAxis.setAttribute("x1", String(margin.left));
  xAxis.setAttribute("x2", String(width - margin.right));
  xAxis.setAttribute("y1", String(margin.top + plotHeight));
  xAxis.setAttribute("y2", String(margin.top + plotHeight));
  xAxis.setAttribute("stroke", "#dadce0");
  xAxis.setAttribute("stroke-width", "1.2");
  svg.append(yAxis, xAxis);

  data.forEach((row, index) => {
    const showLabel = data.length <= 8 || index === 0 || index === data.length - 1 || index % Math.ceil(data.length / 5) === 0;
    if (!showLabel) return;
    const label = document.createElementNS(svgNamespace, "text");
    label.classList.add("weekly-hours-axis-label");
    label.setAttribute("x", String(xForIndex(index)));
    label.setAttribute("y", String(height - 20));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("fill", "#5f6368");
    label.setAttribute("font-size", "10");
    label.textContent = row.label;
    svg.append(label);
  });

  const yAxisTitle = document.createElementNS(svgNamespace, "text");
  yAxisTitle.classList.add("weekly-hours-axis-title");
  yAxisTitle.setAttribute("text-anchor", "middle");
  yAxisTitle.setAttribute("transform", `translate(16 ${margin.top + plotHeight / 2}) rotate(-90)`);
  yAxisTitle.setAttribute("fill", "#202124");
  yAxisTitle.setAttribute("font-size", "12");
  yAxisTitle.setAttribute("font-weight", "700");
  yAxisTitle.textContent = "Hours";
  svg.append(yAxisTitle);

  const xAxisTitle = document.createElementNS(svgNamespace, "text");
  xAxisTitle.classList.add("weekly-hours-axis-title");
  xAxisTitle.setAttribute("x", String(margin.left + plotWidth / 2));
  xAxisTitle.setAttribute("y", String(height - 3));
  xAxisTitle.setAttribute("text-anchor", "middle");
  xAxisTitle.setAttribute("fill", "#202124");
  xAxisTitle.setAttribute("font-size", "12");
  xAxisTitle.setAttribute("font-weight", "700");
  xAxisTitle.textContent = "Week";
  svg.append(xAxisTitle);

  data.forEach((row, index) => {
    const point = {
      x: xForIndex(index),
      y: yForHours(row.hours || 0),
      row,
      hours: row.hours || 0,
    };
    point.color = getWeeklyHoursColor(point.hours);
    point.range = getWeeklyHoursRange(point.hours);

    const circle = document.createElementNS(svgNamespace, "circle");
    circle.classList.add("weekly-hours-point");
    circle.dataset.week = row.week;
    circle.dataset.hours = String(Math.round(point.hours * 100) / 100);
    circle.dataset.range = point.range;
    circle.setAttribute("cx", String(point.x));
    circle.setAttribute("cy", String(point.y));
    circle.setAttribute("r", point.hours ? "5.4" : "4.2");
    circle.setAttribute("fill", point.color);
    circle.setAttribute("fill-opacity", "0.9");
    circle.setAttribute("stroke", "#ffffff");
    circle.setAttribute("stroke-width", "1.5");
    circle.setAttribute("tabindex", "0");
    circle.setAttribute("aria-label", `${row.week}: ${formatHours(point.hours)} worked`);
    circle.addEventListener("mouseenter", () => showWeeklyHoursTooltip(tooltip, svg, point));
    circle.addEventListener("focus", () => showWeeklyHoursTooltip(tooltip, svg, point));
    circle.addEventListener("mouseleave", () => hideWeeklyActivityTooltip(tooltip));
    circle.addEventListener("blur", () => hideWeeklyActivityTooltip(tooltip));
    const pointTitle = document.createElementNS(svgNamespace, "title");
    pointTitle.textContent = `${row.week}: ${formatHours(point.hours)} worked`;
    circle.append(pointTitle);
    svg.append(circle);
  });

  return svg;
}

function getWeeklyHoursColor(hours) {
  if (hours < 38) return "#188038";
  if (hours < 42) return "#1a73e8";
  if (hours < 50) return "#f29900";
  return "#d93025";
}

function getWeeklyHoursRange(hours) {
  if (hours < 38) return "under-38";
  if (hours < 42) return "38-42";
  if (hours < 50) return "42-50";
  return "50-plus";
}

function getWeeklyHoursAxisTicks(maxHours) {
  const roughStep = Math.max(1, maxHours / 4);
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const step = normalized <= 1 ? magnitude : normalized <= 2 ? 2 * magnitude : normalized <= 5 ? 5 * magnitude : 10 * magnitude;
  const top = Math.max(step, step * Math.ceil(maxHours / step));
  const ticks = [];
  for (let tick = 0; tick <= top + step / 2; tick += step) {
    ticks.push(Math.round(tick * 100) / 100);
  }
  return ticks;
}

function showWeeklyHoursTooltip(tooltip, svg, point) {
  if (!tooltip) return;

  const svgRect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  const left = viewBox.width ? (point.x / viewBox.width) * svgRect.width : point.x;
  const top = viewBox.height ? (point.y / viewBox.height) * svgRect.height : point.y;

  tooltip.style.setProperty("--activity-color", point.color || "#1a73e8");
  tooltip.innerHTML = `
    <strong>${escapeHtml(point.row.week)}</strong>
    <span>${formatHours(point.hours)} worked</span>
  `;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.hidden = false;
}

function createWeeklyActivityChart(data) {
  const frame = document.createElement("div");
  frame.className = "weekly-activity-chart-frame";

  const tooltip = document.createElement("div");
  tooltip.className = "weekly-activity-tooltip";
  tooltip.hidden = true;

  frame.append(createWeeklyActivityChartSvg(data, tooltip), tooltip);
  return frame;
}

function createWeeklyActivityChartSvg(data, tooltip) {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const width = 320;
  const height = 180;
  const margin = { top: 16, right: 14, bottom: 34, left: 42 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxHours = Math.max(1, ...data.flatMap((row) => ACTIVITY_CATEGORIES.map(({ key }) => row[key] || 0)));
  const yTicks = Array.from({ length: 4 }, (_, index) => (maxHours * index) / 3);
  const xForIndex = (index) => margin.left + (data.length === 1 ? plotWidth / 2 : (plotWidth * index) / (data.length - 1));
  const yForHours = (hours) => margin.top + plotHeight - (plotHeight * hours) / maxHours;

  const svg = document.createElementNS(svgNamespace, "svg");
  svg.classList.add("weekly-activity-svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Weekly cumulative activity chart for read, code, write, and meet events");
  svg.dataset.weekCount = String(data.length);

  const title = document.createElementNS(svgNamespace, "title");
  title.textContent = "Weekly cumulative activity chart";
  svg.append(title);

  yTicks.forEach((tick) => {
    const y = yForHours(tick);
    const gridLine = document.createElementNS(svgNamespace, "line");
    gridLine.classList.add("weekly-activity-grid");
    gridLine.setAttribute("x1", String(margin.left));
    gridLine.setAttribute("x2", String(width - margin.right));
    gridLine.setAttribute("y1", String(y));
    gridLine.setAttribute("y2", String(y));
    svg.append(gridLine);

    const label = document.createElementNS(svgNamespace, "text");
    label.classList.add("weekly-activity-axis-label");
    label.setAttribute("x", String(margin.left - 8));
    label.setAttribute("y", String(y + 3));
    label.setAttribute("text-anchor", "end");
    label.textContent = formatHours(tick);
    svg.append(label);
  });

  const axis = document.createElementNS(svgNamespace, "path");
  axis.classList.add("weekly-activity-axis");
  axis.setAttribute("d", `M${margin.left},${margin.top} V${margin.top + plotHeight} H${width - margin.right}`);
  svg.append(axis);

  data.forEach((row, index) => {
    const showLabel = data.length <= 6 || index === 0 || index === data.length - 1 || index % Math.ceil(data.length / 4) === 0;
    if (!showLabel) return;
    const label = document.createElementNS(svgNamespace, "text");
    label.classList.add("weekly-activity-axis-label");
    label.setAttribute("x", String(xForIndex(index)));
    label.setAttribute("y", String(height - 10));
    label.setAttribute("text-anchor", "middle");
    label.textContent = row.label;
    svg.append(label);
  });

  ACTIVITY_CATEGORIES.forEach(({ key, label, color }) => {
    const points = data.map((row, index) => ({
      x: xForIndex(index),
      y: yForHours(row[key] || 0),
      row,
      hours: row[key] || 0,
    }));
    const path = document.createElementNS(svgNamespace, "path");
    path.classList.add("weekly-activity-line");
    path.dataset.category = key;
    path.setAttribute("stroke", color);
    path.setAttribute("d", points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" "));
    svg.append(path);

    points.forEach((point) => {
      const circle = document.createElementNS(svgNamespace, "circle");
      circle.classList.add("weekly-activity-point");
      circle.dataset.category = key;
      circle.dataset.week = point.row.week;
      circle.dataset.hours = String(Math.round(point.hours * 100) / 100);
      circle.setAttribute("cx", String(point.x));
      circle.setAttribute("cy", String(point.y));
      circle.setAttribute("r", point.hours ? "3.2" : "2.2");
      circle.setAttribute("fill", color);
      circle.setAttribute("tabindex", "0");
      circle.setAttribute("aria-label", `${label} ${point.row.week}: ${formatHours(point.hours)} cumulative`);
      circle.addEventListener("mouseenter", () => showWeeklyActivityTooltip(tooltip, svg, point, { key, label, color }));
      circle.addEventListener("focus", () => showWeeklyActivityTooltip(tooltip, svg, point, { key, label, color }));
      circle.addEventListener("mouseleave", () => hideWeeklyActivityTooltip(tooltip));
      circle.addEventListener("blur", () => hideWeeklyActivityTooltip(tooltip));
      const pointTitle = document.createElementNS(svgNamespace, "title");
      pointTitle.textContent = `${label} ${point.row.week}: ${formatHours(point.hours)} cumulative`;
      circle.append(pointTitle);
      svg.append(circle);
    });
  });

  return svg;
}

function showWeeklyActivityTooltip(tooltip, svg, point, category) {
  if (!tooltip) return;

  const svgRect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox.baseVal;
  const left = viewBox.width ? (point.x / viewBox.width) * svgRect.width : point.x;
  const top = viewBox.height ? (point.y / viewBox.height) * svgRect.height : point.y;

  tooltip.innerHTML = `
    <strong>${escapeHtml(point.row.week)}</strong>
    <span class="weekly-activity-tooltip-focus" style="--activity-color: ${category.color}">${escapeHtml(category.label)}: ${formatHours(point.hours)} cumulative</span>
    <div class="weekly-activity-tooltip-list">
      ${ACTIVITY_CATEGORIES.map(({ key, label, color }) => `
        <span style="--activity-color: ${color}">
          <i aria-hidden="true"></i>${escapeHtml(label)} <b>${formatHours(point.row[key] || 0)}</b>
        </span>
      `).join("")}
    </div>
  `;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.hidden = false;
}

function hideWeeklyActivityTooltip(tooltip) {
  if (tooltip) tooltip.hidden = true;
}

function createWeeklyActivityLegend() {
  const legend = document.createElement("div");
  legend.className = "weekly-activity-legend";
  legend.replaceChildren(
    ...ACTIVITY_CATEGORIES.map(({ key, label, color }) => {
      const item = document.createElement("span");
      item.className = "weekly-activity-legend-item";
      item.dataset.category = key;
      item.innerHTML = `<span class="weekly-activity-legend-swatch" style="--activity-color: ${color}" aria-hidden="true"></span>${label}`;
      return item;
    })
  );
  return legend;
}

function getIsoWeekInfo(date) {
  const thursday = startOfDay(date);
  const dayIndex = (thursday.getDay() + 6) % 7;
  thursday.setDate(thursday.getDate() - dayIndex + 3);

  const isoYear = thursday.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  const firstDayIndex = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayIndex + 3);

  const week = 1 + Math.round((thursday - firstThursday) / 604_800_000);
  return {
    year: isoYear,
    week,
    key: `${isoYear}-W${String(week).padStart(2, "0")}`,
  };
}

function getOccurrenceDateTimeRange(event) {
  const [hour = 0, minute = 0] = (event.time || "00:00").split(":").map(Number);
  const start = fromDateKey(getEventDate(event));
  start.setHours(hour, minute, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + getOccurrenceDurationMinutes(event));
  return { start, end };
}

function getOccurrenceDurationMinutes(event = {}) {
  event = event || {};
  const durationMinutes = Number(event.durationMinutes);
  return Number.isFinite(durationMinutes) && durationMinutes >= 0 ? durationMinutes : DEFAULT_EVENT_DURATION_MINUTES;
}

function getEventDialogDurationMinutes() {
  const durationMinutes = Number(els.eventDurationMinutes.value);
  return Number.isFinite(durationMinutes) && durationMinutes >= 0 ? durationMinutes : DEFAULT_EVENT_DURATION_MINUTES;
}

function getOccurrenceDurationHours(event = {}) {
  return getOccurrenceDurationMinutes(event) / 60;
}

function getWorkedHoursForDate(dateKey) {
  return getFilteredEventsForDate(dateKey)
    .filter((event) => event.time)
    .reduce((total, event) => total + getOccurrenceDurationHours(event), 0);
}

function getAllRecordedEventHours() {
  return events
    .filter((event) => !isCalendarDeleted(event.calendar) && visibleCalendars[event.calendar])
    .reduce((total, event) => total + getOccurrenceDurationHours(event), 0);
}

function getRemainingDeadlineHours(today, deadline) {
  const start = startOfDay(today);
  const end = startOfDay(deadline);
  if (end < start) return 0;

  const inclusiveDays = Math.round((end - start) / 86_400_000) + 1;
  const finalSprintDays = Math.min(30, inclusiveDays);
  const regularDays = Math.max(0, inclusiveDays - finalSprintDays);
  return (regularDays / 7) * 40 + finalSprintDays * 10;
}

function getHeatmapIntensityLevel(hours) {
  if (hours <= 0) return 0;
  if (hours <= 1) return 1;
  if (hours <= 2) return 2;
  if (hours <= 4) return 3;
  return 4;
}

function formatHours(hours) {
  const rounded = Math.round(hours * 100) / 100;
  return `${formatHourValue(rounded)}h`;
}

function formatHoursLong(hours) {
  const rounded = Math.round(hours * 100) / 100;
  return `${formatHourValue(rounded)} hour${rounded === 1 ? "" : "s"}`;
}

function formatHourValue(hours) {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function startOfDay(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getDefaultEventCalendarId() {
  return getActiveCalendars().find((calendar) => visibleCalendars[calendar.id])?.id ?? getActiveCalendars()[0]?.id ?? "";
}

function populateCalendarSelect() {
  const activeCalendars = getActiveCalendars();
  els.eventCalendar.disabled = activeCalendars.length === 0;

  if (!activeCalendars.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No active calendars";
    els.eventCalendar.replaceChildren(option);
    return;
  }

  els.eventCalendar.replaceChildren(
    ...activeCalendars.map((calendar) => {
      const option = document.createElement("option");
      option.value = calendar.id;
      option.textContent = calendar.name;
      return option;
    })
  );
}

function renderMonthGrid() {
  const weekScrollPosition = currentView === "week" ? getWeekScrollPosition() : null;
  els.weekdayRow.hidden = ["week", "heatmap"].includes(currentView);
  els.monthGrid.className = `month-grid month-grid--${currentView}`;
  els.monthGrid.style.removeProperty("--month-grid-row-count");

  if (currentView === "week") {
    renderWeekTimeline(weekScrollPosition);
    return;
  }

  if (currentView === "heatmap") {
    renderHeatmapView();
    return;
  }

  const dates = getMainCalendarDates();
  if (currentView === "month") {
    els.monthGrid.style.setProperty("--month-grid-row-count", Math.max(1, dates.length / 7));
  }
  els.monthGrid.replaceChildren(
    ...dates.map((date) => createDayCell(date))
  );
}

async function loadDeadlineConferences() {
  try {
    const response = await fetch("./deadlines.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    deadlineConferences = Array.isArray(data) ? data : [];
    renderDeadlinePanel();
    render();
    await checkPredictedDeadlineUpdates();
  } catch (error) {
    console.error("Unable to load deadline data:", error);
  }
}

async function checkPredictedDeadlineUpdates() {
  const proxyUrl = window.ACADEMICAL_GOOGLE_CONFIG?.deadlineUpdatesUrl;
  if (!proxyUrl) return;

  const forecasts = getDeadlinePredictions();
  const checks = await Promise.allSettled(forecasts.map(async (forecast) => {
    const cachedUpdate = loadCachedDeadlineUpdate(forecast);
    if (cachedUpdate) return { forecast, update: cachedUpdate };

    const url = new URL(proxyUrl);
    url.searchParams.set("conference", forecast.name);
    url.searchParams.set("year", String(forecast.year));
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const update = await response.json();
    saveCachedDeadlineUpdate(forecast, update);
    return { forecast, update };
  }));

  let changed = false;
  checks.forEach((check) => {
    if (check.status !== "fulfilled") {
      console.warn("Unable to check a predicted deadline:", check.reason);
      return;
    }

    const { forecast, update } = check.value;
    if (!update?.available || !Array.isArray(update.deadlines) || !update.deadlines.length) return;
    const latest = deadlineConferences
      .filter((conference) => conference.name === forecast.name)
      .sort((a, b) => b.year - a.year)[0];
    const publishedDeadlines = update.deadlines.map((deadline) => deadline.date).filter(Boolean);
    if (!latest || !publishedDeadlines.length) return;

    const announced = {
      ...latest,
      year: forecast.year,
      link: update.deadlines[0].link || update.sourceUrl || forecast.link,
      deadlines: publishedDeadlines,
      date: "",
      place: "",
      note: "Researchr has announced this deadline. Add it to deadlines.json to make the update permanent.",
      isAnnouncedUpdate: true,
    };
    const existingIndex = deadlineConferences.findIndex((conference) => (
      conference.name === announced.name && conference.year === announced.year
    ));
    if (existingIndex >= 0) {
      deadlineConferences[existingIndex] = announced;
    } else {
      deadlineConferences.push(announced);
    }
    changed = true;
  });

  if (changed) {
    renderDeadlinePanel();
    render();
  }
}

function loadCachedDeadlineUpdate(forecast) {
  try {
    const cached = JSON.parse(localStorage.getItem(getDeadlineUpdateCacheKey(forecast)) || "null");
    if (!cached || Date.now() - cached.checkedAt >= DEADLINE_UPDATE_INTERVAL_MS) return null;
    return cached.update;
  } catch {
    return null;
  }
}

function saveCachedDeadlineUpdate(forecast, update) {
  try {
    localStorage.setItem(getDeadlineUpdateCacheKey(forecast), JSON.stringify({
      checkedAt: Date.now(),
      update,
    }));
  } catch {
    // A failed browser cache write should not prevent deadline updates.
  }
}

function getDeadlineUpdateCacheKey(forecast) {
  return `${STORAGE_DEADLINE_UPDATE_PREFIX}.${forecast.name}.${forecast.year}`;
}

function renderDeadlinePanel() {
  if (!els.deadlinePanel) return;
  const allDeadlines = getDeadlineEntries();
  const deadlines = getFilteredDeadlineEntries(allDeadlines);
  const upcomingCount = deadlines.filter((entry) => !entry.isPast && !entry.isPredicted).length;
  const predictionCount = deadlines.filter((entry) => entry.isPredicted).length;

  const view = document.createElement("section");
  view.className = "deadline-view";
  view.setAttribute("aria-label", "Research venue deadlines");

  const header = document.createElement("header");
  header.className = "deadline-view-header";
  header.innerHTML = `
    <div>
      <h2>Research venue deadlines</h2>
    </div>
    <strong>${upcomingCount} upcoming · ${predictionCount} forecast${predictionCount === 1 ? "" : "s"}</strong>
  `;

  const filters = createDeadlineFilters();
  header.insertBefore(filters, header.lastElementChild);

  const list = document.createElement("div");
  list.className = "deadline-list";
  if (deadlines.length) {
    list.replaceChildren(...deadlines.map(createDeadlineCard));
  } else {
    const empty = document.createElement("p");
    empty.className = "deadline-empty";
    empty.textContent = "No deadlines match the selected filters.";
    list.replaceChildren(empty);
  }

  view.append(header, list);
  els.deadlinePanel.replaceChildren(view);
  updateDeadlineTimers();
}

function createDeadlineFilters() {
  const form = document.createElement("form");
  form.className = "deadline-filters";
  form.setAttribute("aria-label", "Deadline filters");
  form.addEventListener("change", (event) => {
    const input = event.target.closest("input[data-deadline-filter-tag]");
    if (!input) return;

    const selected = new Set(deadlineFilterTags);
    if (input.checked) {
      selected.add(input.dataset.deadlineFilterTag);
    } else {
      selected.delete(input.dataset.deadlineFilterTag);
    }
    deadlineFilterTags = [...selected].filter(isValidDeadlineFilterTag);
    saveDeadlineFilterTags();
    renderDeadlinePanel();
  });

  const groups = ["venue"].map((type) => {
    const group = document.createElement("fieldset");
    group.className = "deadline-filter-group";
    group.append(...DEADLINE_TYPES.filter((item) => item.type === type).map(createDeadlineFilterOption));
    return group;
  });

  form.replaceChildren(...groups);
  return form;
}

function createDeadlineFilterOption(type) {
  const label = document.createElement("label");
  label.className = "deadline-filter-option";
  label.innerHTML = `
    <input type="checkbox" data-deadline-filter-tag="${escapeHtml(type.tag)}" ${deadlineFilterTags.includes(type.tag) ? "checked" : ""} />
    <span>${escapeHtml(type.name)}</span>
  `;
  return label;
}

function getFilteredDeadlineEntries(entries) {
  if (!deadlineFilterTags.length) return entries;
  return entries.filter((entry) => deadlineFilterTags.some((tag) => entry.tags.includes(tag)));
}

function getDeadlineEntries() {
  const now = getNow();
  const conferences = [...deadlineConferences, ...getDeadlinePredictions()];
  return conferences.flatMap((conference) => {
    const deadlines = Array.isArray(conference.deadlines) ? conference.deadlines : [conference.deadlines];
    return deadlines.map((rawDeadline, index) => {
      const date = parseDeadlineDate(rawDeadline, conference.timezone);
      return {
        ...conference,
        id: makeDeadlineId(conference, index),
        rawDeadline,
        tags: normalizeDeadlineTags(conference.tags, conference.name),
        deadline: date,
        deadlineIndex: index,
        deadlineCount: deadlines.length,
        prediction: conference.predictions?.[index] ?? null,
        isPast: date <= now,
      };
    });
  }).sort(compareDeadlineEntries);
}

function getDeadlinePredictions() {
  return DEADLINE_TYPES.map(({ name }) => {
    const editions = deadlineConferences
      .filter((conference) => conference.name === name)
      .sort((a, b) => b.year - a.year);
    const latest = editions[0];
    if (!latest) return null;

    const now = getNow();
    const hasAnnouncedUpcomingDeadline = editions.some((conference) => {
      const deadlines = Array.isArray(conference.deadlines) ? conference.deadlines : [conference.deadlines];
      return deadlines.some((deadline) => parseDeadlineDate(deadline, conference.timezone) > now);
    });
    if (hasAnnouncedUpcomingDeadline) return null;

    const targetYear = latest.year + 1;
    const deadlineCount = Array.isArray(latest.deadlines) ? latest.deadlines.length : 1;
    const predictionEditions = editions
      .filter((conference) => conference.year >= (latest.predictionHistoryStartYear ?? -Infinity))
      .slice(0, 5);
    const cyclePredictions = Array.from({ length: deadlineCount }, (_, index) => {
      const offsets = predictionEditions.flatMap((conference) => {
        const deadlines = Array.isArray(conference.deadlines) ? conference.deadlines : [conference.deadlines];
        const date = getDeadlineDateParts(deadlines[index]);
        return date ? [getConferenceYearDayOffset(date, conference.year)] : [];
      });
      return predictDeadlineFromOffsets(offsets, targetYear);
    });

    const nextPrediction = cyclePredictions
      .filter(Boolean)
      .sort((a, b) => a.date.localeCompare(b.date))
      .find((prediction) => parseDeadlineDate(`${prediction.date} 23:59`) > now)
      ?? cyclePredictions.filter(Boolean).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (!nextPrediction) return null;

    return {
      name,
      description: latest.description,
      year: targetYear,
      link: getDeadlineSeriesLink(name),
      deadlines: [`${nextPrediction.date} 23:59`],
      predictions: [nextPrediction],
      date: "",
      place: "",
      note: "",
      isPredicted: true,
    };
  }).filter(Boolean);
}

function getDeadlineDateParts(rawDeadline) {
  const match = String(rawDeadline || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
}

function getConferenceYearDayOffset(date, conferenceYear) {
  return Math.round((Date.UTC(date.year, date.month - 1, date.day) - Date.UTC(conferenceYear, 0, 1)) / 86_400_000);
}

function predictDeadlineFromOffsets(offsets, targetYear) {
  if (!offsets.length) return null;
  const sorted = [...offsets].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  const spreadDays = sorted.at(-1) - sorted[0];
  const confidence = sorted.length >= 4 && spreadDays <= 35
    ? "High"
    : sorted.length >= 3 && spreadDays <= 70
      ? "Medium"
      : "Low";
  return {
    date: formatPredictionDateKey(targetYear, median),
    rangeStart: formatPredictionDateKey(targetYear, sorted[0]),
    rangeEnd: formatPredictionDateKey(targetYear, sorted.at(-1)),
    confidence,
    sampleSize: sorted.length,
    spreadDays,
  };
}

function formatPredictionDateKey(year, dayOffset) {
  return new Date(Date.UTC(year, 0, 1 + dayOffset)).toISOString().slice(0, 10);
}

function getDeadlineSeriesLink(name) {
  return `https://conf.researchr.org/series/${name === "OOPSLA" ? "splash" : name.toLowerCase()}`;
}

function normalizeDeadlineTags(tags, venue) {
  const normalized = Array.isArray(tags) ? tags.filter(isValidDeadlineFilterTag) : [];
  return normalized.length ? normalized : [venue].filter(isValidDeadlineFilterTag);
}

function createDeadlineCard(entry) {
  const card = document.createElement("article");
  card.className = [
    "deadline-card",
    entry.isPast ? "deadline-card--past" : "",
    entry.isPredicted ? "deadline-card--predicted" : "",
    entry.isAnnouncedUpdate ? "deadline-card--announced" : "",
  ].filter(Boolean).join(" ");
  card.dataset.deadlineAt = entry.deadline.toISOString();
  card.id = entry.id;

  const deadlineLabel = entry.deadlineCount > 1
    ? `Deadline (${entry.deadlineIndex + 1} / ${entry.deadlineCount})`
    : "Deadline";
  const place = entry.place ? `// ${escapeHtml(entry.place)}` : "";
  const meta = entry.date || entry.place
    ? `<p class="deadline-meta">${escapeHtml(String(entry.date || "")).replace(/ - /g, " – ")} ${place}</p>`
    : "";
  const note = entry.note ? `<p class="deadline-note">${escapeHtml(entry.note)}</p>` : "";
  const predictionBadge = entry.isPredicted
    ? `<span class="deadline-prediction-badge deadline-prediction-badge--${entry.prediction.confidence.toLowerCase()}">Predicted · ${escapeHtml(entry.prediction.confidence)} confidence</span>`
    : "";
  const announcedBadge = entry.isAnnouncedUpdate
    ? `<span class="deadline-announced-badge">Announced · update available</span>`
    : "";
  const predictionRange = entry.isPredicted
    ? `<p class="deadline-prediction-range">Likely range: <span>${formatPredictionRange(entry.prediction)}</span> · ${entry.prediction.sampleSize} edition${entry.prediction.sampleSize === 1 ? "" : "s"}</p>`
    : "";
  const calendarToggle = `
    <label class="deadline-calendar-toggle">
      <input type="checkbox" data-deadline-calendar-id="${escapeHtml(entry.id)}" ${selectedDeadlineIds.includes(entry.id) ? "checked" : ""} />
      <span>Show in calendar</span>
    </label>
  `;

  card.innerHTML = `
    <div class="deadline-card-main">
      <h3><a href="${escapeHtml(entry.link)}" target="_blank" rel="noreferrer">${escapeHtml(entry.name)} ${entry.year}</a></h3>
      ${predictionBadge}
      ${announcedBadge}
      <p>${escapeHtml(entry.description)}</p>
      ${meta}
      ${note}
    </div>
    <div class="deadline-card-countdown">
      <strong class="deadline-countdown" data-deadline-at="${entry.deadline.toISOString()}">${formatDeadlineDistance(entry.deadline)}</strong>
      <p>${entry.isPredicted ? "Predicted deadline" : deadlineLabel}: <span>${formatDeadlineDate(entry.deadline)}</span></p>
      ${predictionRange}
      <span class="deadline-timezone">AoE / UTC-12</span>
      ${calendarToggle}
    </div>
  `;

  card.querySelector("[data-deadline-calendar-id]").addEventListener("change", toggleDeadlineCalendarEvent);
  return card;
}

function toggleDeadlineCalendarEvent(event) {
  const id = event.currentTarget.dataset.deadlineCalendarId;
  const selected = new Set(selectedDeadlineIds);
  if (event.currentTarget.checked) {
    selected.add(id);
    visibleCalendars.deadlines = true;
    saveVisibleCalendars();
    renderCalendarToggles();
  } else {
    selected.delete(id);
  }
  selectedDeadlineIds = [...selected];
  saveSelectedDeadlineIds();
  render();
}

function getSelectedDeadlineEvents() {
  const selected = new Set(selectedDeadlineIds);
  return getDeadlineEntries()
    .filter((entry) => selected.has(entry.id))
    .map((entry) => ({
      id: `calendar-${entry.id}`,
      deadlineId: entry.id,
      title: `${entry.name} ${entry.year}${entry.deadlineCount > 1 ? ` deadline ${entry.deadlineIndex + 1}` : " deadline"}`,
      date: String(entry.rawDeadline).slice(0, 10),
      time: "23:59",
      durationMinutes: 0,
      calendar: "deadlines",
      notes: entry.isPredicted ? "Predicted deadline" : entry.description,
      repeat: "none",
      readOnlyDeadline: true,
    }));
}

function getCalendarEvents() {
  return [...events, ...getSelectedDeadlineEvents()];
}

function updateDeadlineTimers() {
  els.deadlinePanel?.querySelectorAll(".deadline-countdown[data-deadline-at]").forEach((item) => {
    const deadline = new Date(item.dataset.deadlineAt);
    item.textContent = formatDeadlineDistance(deadline);
  });
}

function compareDeadlineEntries(a, b) {
  const now = getNow();
  const aDiff = now - a.deadline;
  const bDiff = now - b.deadline;
  if (aDiff < 0 && bDiff > 0) return -1;
  if (aDiff > 0 && bDiff < 0) return 1;
  if (aDiff < 0 && bDiff < 0) return bDiff - aDiff;
  if (aDiff > 0 && bDiff > 0) return aDiff - bDiff;
  return a.deadline - b.deadline;
}

function parseDeadlineDate(rawDeadline, timezone = "") {
  if (!rawDeadline || rawDeadline === "TBA") return new Date("3000-01-01T00:00:00-12:00");
  const normalized = String(rawDeadline).trim().replace(" ", "T");
  const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized) ? `${normalized}:59` : normalized;
  const offset = timezone || "-12:00";
  return new Date(`${withSeconds}${offset}`);
}

function formatPredictionRange(prediction) {
  const start = parseDeadlineDate(`${prediction.rangeStart} 23:59`);
  const end = parseDeadlineDate(`${prediction.rangeEnd} 23:59`);
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  return prediction.rangeStart === prediction.rangeEnd
    ? formatter.format(start)
    : `${formatter.format(start)} – ${formatter.format(end)}`;
}

function formatDeadlineDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatDeadlineDistance(date) {
  const diffMs = date - getNow();
  const absSeconds = Math.max(0, Math.floor(Math.abs(diffMs) / 1000));
  const days = Math.floor(absSeconds / 86_400);
  const hours = Math.floor((absSeconds % 86_400) / 3_600);
  const minutes = Math.floor((absSeconds % 3_600) / 60);
  const seconds = absSeconds % 60;

  if (diffMs < 0) {
    if (days) return `${days} day${days === 1 ? "" : "s"} ago`;
    if (hours) return `${hours}h ago`;
    if (minutes) return `${minutes}m ago`;
    return `${seconds}s ago`;
  }

  return `${String(days).padStart(2, "0")} days ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

function makeDeadlineId(conference, index) {
  return `deadline-${conference.name}-${conference.year}-${index}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function getHeatmapDateRange() {
  const today = startOfDay(getNow());
  const futureDeadlineDates = getSelectedDeadlineEvents()
    .map((event) => fromDateKey(event.date))
    .filter((date) => date >= today);
  if (futureDeadlineDates.length) {
    return {
      start: today,
      end: futureDeadlineDates.reduce((latest, date) => date > latest ? date : latest, today),
      hasEvents: true,
      mode: "deadline",
    };
  }

  if (heatmapRangeMode === "year") {
    const rangeEnd = startOfDay(viewAnchorDate);
    return {
      start: addYears(rangeEnd, -1),
      end: rangeEnd,
      hasEvents: true,
      mode: heatmapRangeMode,
    };
  }

  const visibleEventDates = getCalendarEvents()
    .filter((event) => isEventVisible(event))
    .flatMap((event) => [event.date, getEventRangeEndDateKey(event)]);

  if (!visibleEventDates.length) {
    return { start: startOfDay(selectedDate), end: startOfDay(selectedDate), hasEvents: false, mode: heatmapRangeMode };
  }

  let rangeStart = fromDateKey(visibleEventDates.reduce((min, date) => (date < min ? date : min)));
  let rangeEnd = fromDateKey(visibleEventDates.reduce((max, date) => (date > max ? date : max)));
  if (rangeEnd < rangeStart) rangeEnd = new Date(rangeStart);
  if (Math.round((rangeEnd - rangeStart) / 86_400_000) > 3660) rangeEnd = addDays(rangeStart, 3660);

  let firstEventDate = null;
  let lastEventDate = null;
  const days = Math.round((startOfDay(rangeEnd) - startOfDay(rangeStart)) / 86_400_000) + 1;
  makeDateRange(rangeStart, days).forEach((date) => {
    if (!getFilteredEventsForDate(toDateKey(date)).length) return;
    if (!firstEventDate) firstEventDate = new Date(date);
    lastEventDate = new Date(date);
  });

  return firstEventDate
    ? { start: firstEventDate, end: lastEventDate, hasEvents: true, mode: heatmapRangeMode }
    : { start: startOfDay(selectedDate), end: startOfDay(selectedDate), hasEvents: false, mode: heatmapRangeMode };
}

function getEventRangeEndDateKey(event) {
  const repeat = event.repeat ?? "none";
  if (repeat === "none") return event.date;
  if (event.repeatUntil) return event.repeatUntil;
  return toDateKey(addDays(fromDateKey(event.date), 365));
}

function getMonthStartsBetween(start, end) {
  const monthStarts = [];
  let cursor = startOfMonth(start);
  while (cursor <= end) {
    monthStarts.push(new Date(cursor));
    cursor = addMonths(cursor, 1);
  }
  return monthStarts;
}

function renderHeatmapView() {
  const { start: rangeStart, end: rangeEnd, hasEvents, mode } = getHeatmapDateRange();
  const dayCount = Math.max(1, Math.round((startOfDay(rangeEnd) - startOfDay(rangeStart)) / 86_400_000) + 1);
  const leadingBlankDays = (rangeStart.getDay() - WEEK_START_DAY + 7) % 7;
  const weekCount = Math.max(1, Math.ceil((leadingBlankDays + dayCount) / 7));
  const dates = makeDateRange(rangeStart, dayCount);
  const hoursByDate = new Map(dates.map((date) => {
    const dateKey = toDateKey(date);
    return [dateKey, hasEvents ? getWorkedHoursForDate(dateKey) : 0];
  }));
  const totalHours = [...hoursByDate.values()].reduce((total, hours) => total + hours, 0);
  const activeDays = [...hoursByDate.values()].filter(Boolean).length;
  const maxHours = Math.max(0, ...hoursByDate.values());
  const selectedDay = startOfDay(selectedDate);
  const selectedHeatmapDate = selectedDay >= startOfDay(rangeStart) && selectedDay <= startOfDay(rangeEnd) ? selectedDay : rangeStart;

  const heatmap = document.createElement("section");
  heatmap.className = "heatmap-view";
  heatmap.setAttribute("aria-label", `${formatDateRange(rangeStart, rangeEnd)} worked-hours heatmap`);

  const summary = document.createElement("div");
  summary.className = `heatmap-summary${mode === "deadline" ? " heatmap-summary--deadline" : ""}`;
  if (mode === "deadline") {
    const currentTimeSpent = getAllRecordedEventHours();
    const remainingTime = getRemainingDeadlineHours(rangeStart, rangeEnd);
    summary.innerHTML = `
      <div class="heatmap-deadline-metric">
        <span>Current time spent</span>
        <strong>${formatHours(currentTimeSpent)}</strong>
      </div>
      <div class="heatmap-deadline-metric">
        <span>Remaining time</span>
        <strong>${formatHours(remainingTime)}</strong>
      </div>
      <div class="heatmap-deadline-metric heatmap-deadline-metric--total">
        <span>Total time spent</span>
        <strong>${formatHours(currentTimeSpent + remainingTime)}</strong>
      </div>
      <p>Today to deadline · ${formatDateRange(rangeStart, rangeEnd)}</p>
    `;
  } else {
    summary.innerHTML = `
      <strong>${formatHours(totalHours)}</strong>
      <span>${mode === "year" ? "Rolling year" : "Event span"} · ${activeDays} active day${activeDays === 1 ? "" : "s"} · ${formatDateRange(rangeStart, rangeEnd)}${maxHours ? ` · max ${formatHours(maxHours)}/day` : ""}</span>
    `;
  }

  const monthRow = document.createElement("div");
  monthRow.className = "heatmap-month-row";
  const monthSpacer = document.createElement("span");
  monthSpacer.className = "heatmap-weekday-spacer";
  monthSpacer.setAttribute("aria-hidden", "true");
  const monthLabels = document.createElement("div");
  monthLabels.className = "heatmap-month-labels";
  monthLabels.style.setProperty("--heatmap-week-count", weekCount);
  getMonthStartsBetween(rangeStart, rangeEnd).forEach((monthStart) => {
    const labelDate = monthStart < rangeStart ? rangeStart : monthStart;
    const offsetDays = leadingBlankDays + Math.round((startOfDay(labelDate) - startOfDay(rangeStart)) / 86_400_000);
    const weekIndex = Math.floor(offsetDays / 7);
    const label = document.createElement("span");
    label.textContent = shortMonthFormatter.format(monthStart);
    label.style.gridColumn = `${weekIndex + 1} / span 4`;
    monthLabels.append(label);
  });
  monthRow.append(monthSpacer, monthLabels);

  const body = document.createElement("div");
  body.className = "heatmap-body";

  const weekdayLabels = document.createElement("div");
  weekdayLabels.className = "heatmap-weekdays";
  ["M", "T", "W", "T", "F", "S", "S"].forEach((label) => {
    const item = document.createElement("span");
    item.textContent = label;
    weekdayLabels.append(item);
  });

  const grid = document.createElement("div");
  grid.className = "heatmap-grid";
  grid.style.setProperty("--heatmap-week-count", weekCount);
  Array.from({ length: leadingBlankDays }).forEach(() => {
    const blank = document.createElement("span");
    blank.className = "heatmap-day-spacer";
    blank.setAttribute("aria-hidden", "true");
    grid.append(blank);
  });
  dates.forEach((date) => {
    const dateKey = toDateKey(date);
    const hours = hoursByDate.get(dateKey) ?? 0;
    const day = document.createElement("button");
    day.className = [
      "heatmap-day",
      isSameDay(date, selectedHeatmapDate) ? "heatmap-day--selected" : "",
      isSameDay(date, TODAY) ? "heatmap-day--today" : "",
    ].filter(Boolean).join(" ");
    day.type = "button";
    day.dataset.date = dateKey;
    day.dataset.level = String(getHeatmapIntensityLevel(hours));
    day.dataset.hours = String(hours);
    day.title = `${longDateFormatter.format(date)} · ${formatHours(hours)} worked`;
    day.setAttribute("aria-label", day.title);
    day.addEventListener("click", (event) => {
      selectedDate = new Date(date);
      heatmapDetailsAnchor = getHeatmapDetailsAnchor(event);
      render();
    });
    grid.append(day);
  });

  const legend = document.createElement("div");
  legend.className = "heatmap-legend";
  legend.innerHTML = `
    <span>Less</span>
    ${[0, 1, 2, 3, 4].map((level) => `<span class="heatmap-legend-box" data-level="${level}" aria-hidden="true"></span>`).join("")}
    <span>More</span>
  `;

  body.append(weekdayLabels, grid);
  heatmap.append(summary, monthRow, body, legend);

  if (heatmapDetailsAnchor) {
    const details = createHeatmapDetails(selectedHeatmapDate, { popover: true });
    heatmap.append(details);
    positionHeatmapDetails(details, heatmapDetailsAnchor);
  }

  els.monthGrid.replaceChildren(heatmap);
}

function getHeatmapDetailsAnchor(event) {
  const targetRect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX || targetRect.left + targetRect.width / 2;
  const y = event.clientY || targetRect.top + targetRect.height / 2;
  return { x, y };
}

function positionHeatmapDetails(details, anchor) {
  const viewportMargin = 16;
  const cursorOffset = 14;
  const setPosition = () => {
    const rect = details.getBoundingClientRect();
    let left = anchor.x + cursorOffset;
    let top = anchor.y + cursorOffset;

    if (left + rect.width > window.innerWidth - viewportMargin) {
      left = anchor.x - rect.width - cursorOffset;
    }
    if (top + rect.height > window.innerHeight - viewportMargin) {
      top = anchor.y - rect.height - cursorOffset;
    }

    details.style.left = `${Math.max(viewportMargin, left)}px`;
    details.style.top = `${Math.max(viewportMargin, top)}px`;
  };

  details.style.left = `${anchor.x + cursorOffset}px`;
  details.style.top = `${anchor.y + cursorOffset}px`;
  requestAnimationFrame(setPosition);
}

function createHeatmapDetails(date, { popover = false } = {}) {
  const dateKey = toDateKey(date);
  const dayEvents = getFilteredEventsForDate(dateKey);
  const hours = getWorkedHoursForDate(dateKey);
  const details = document.createElement("section");
  details.className = ["heatmap-details", popover ? "heatmap-details--popover" : ""].filter(Boolean).join(" ");
  details.setAttribute("aria-label", "Selected heatmap day details");

  const header = document.createElement("header");
  header.className = "heatmap-details-header";
  header.innerHTML = `
    <h2>${longDateFormatter.format(date)}</h2>
    <strong>${formatHours(hours)} worked</strong>
  `;

  if (!dayEvents.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No visible events on this day.";
    details.append(header, empty);
    return details;
  }

  const list = document.createElement("div");
  list.className = "heatmap-details-list";
  list.replaceChildren(
    ...dayEvents.map((event) => {
      const calendar = getCalendar(event.calendar);
      const item = document.createElement("article");
      item.className = "heatmap-details-event";
      item.style.setProperty("--event-color", calendar.color);
      item.innerHTML = `
        <span class="heatmap-details-event-dot" aria-hidden="true"></span>
        <div>
          <h3>${escapeHtml(event.title)}</h3>
          <p>${event.time ? formatTime(event.time) : "All day"} · ${escapeHtml(calendar.name)} · ${formatHours(getOccurrenceDurationHours(event))}</p>
          ${event.notes ? `<p class="heatmap-details-event-notes">${escapeHtml(event.notes)}</p>` : ""}
        </div>
      `;
      return item;
    })
  );

  details.append(header, list);
  return details;
}

function createDayCell(date) {
  const dateKey = toDateKey(date);
  const dayEvents = getFilteredEventsForDate(dateKey);
  const isCurrentMonth = currentView !== "month" || date.getMonth() === visibleMonth.getMonth();
  const isSelected = isSameDay(date, selectedDate);
  const isToday = isSameDay(date, TODAY);
  const maxVisibleEvents = getMaxVisibleEvents();

  const cell = document.createElement("section");
  cell.className = [
    "day-cell",
    isCurrentMonth ? "" : "day-cell--muted",
    isSelected ? "day-cell--selected" : "",
    isToday ? "day-cell--today" : "",
  ]
    .filter(Boolean)
    .join(" ");
  cell.tabIndex = 0;
  cell.dataset.date = dateKey;
  cell.setAttribute("role", "button");
  cell.setAttribute("aria-label", `${longDateFormatter.format(date)}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}` : ""}`);

  const dateRow = document.createElement("div");
  dateRow.className = "date-row";

  const dayNumber = document.createElement("span");
  dayNumber.className = "day-number";
  dayNumber.textContent = date.getDate();

  const addButton = document.createElement("button");
  addButton.className = "day-add";
  addButton.type = "button";
  addButton.textContent = "+";
  addButton.setAttribute("aria-label", `Create event on ${longDateFormatter.format(date)}`);
  addButton.addEventListener("click", (event) => {
    event.stopPropagation();
    selectedDate = new Date(date);
    ensureDateVisible(date);
    openEventDialog(dateKey);
  });

  dateRow.append(dayNumber, addButton);
  cell.append(dateRow);

  const eventList = document.createElement("div");
  eventList.className = "event-list";

  dayEvents.slice(0, maxVisibleEvents).forEach((calendarEvent) => {
    eventList.append(createEventChip(calendarEvent));
  });

  if (dayEvents.length > maxVisibleEvents) {
    const moreButton = document.createElement("button");
    moreButton.className = "more-events";
    moreButton.type = "button";
    moreButton.textContent = `+${dayEvents.length - maxVisibleEvents} more`;
    moreButton.addEventListener("click", (event) => {
      event.stopPropagation();
      selectedDate = new Date(date);
      ensureDateVisible(date);
      showToast(`${dayEvents.length} events on ${compactDateFormatter.format(date)}`);
    });
    eventList.append(moreButton);
  }

  cell.append(eventList);

  cell.addEventListener("click", () => {
    selectedDate = new Date(date);
    ensureDateVisible(date);
    render();
  });

  cell.addEventListener("dblclick", () => {
    selectedDate = new Date(date);
    ensureDateVisible(date);
    openEventDialog(dateKey);
  });

  cell.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      selectedDate = new Date(date);
      ensureDateVisible(date);
      render();
    }
    if (event.key === " ") {
      event.preventDefault();
      selectedDate = new Date(date);
      ensureDateVisible(date);
      openEventDialog(dateKey);
    }
  });

  return cell;
}

function getWeekScrollPosition() {
  const scroller = els.monthGrid.querySelector(".week-timeline-scroll");
  return scroller
    ? { top: scroller.scrollTop, left: scroller.scrollLeft }
    : null;
}

function restoreWeekScrollPosition(position) {
  if (!position) return;
  const scroller = els.monthGrid.querySelector(".week-timeline-scroll");
  if (!scroller) return;
  scroller.scrollTo({ top: position.top, left: position.left, behavior: "auto" });
}

function renderWeekTimeline(scrollPosition = null) {
  const weekDates = getMainCalendarDates();
  const timeline = document.createElement("section");
  timeline.className = "week-timeline";
  timeline.setAttribute("aria-label", `${getHeaderTitle(weekDates[0], weekDates[6])} weekly schedule`);

  const header = document.createElement("header");
  header.className = "week-timeline-header";

  const timezone = document.createElement("div");
  timezone.className = "week-timezone";
  timezone.textContent = getTimezoneLabel();
  header.append(timezone, ...weekDates.map(createWeekHeaderDay));

  const scroller = document.createElement("div");
  scroller.className = "week-timeline-scroll";
  scroller.style.setProperty("--hour-height", `${WEEK_HOUR_HEIGHT}px`);

  const timeColumn = document.createElement("div");
  timeColumn.className = "week-time-column";
  HOURS.forEach((hour) => {
    const label = document.createElement("div");
    label.className = "week-time-label";
    label.textContent = hour === 0 ? "" : formatHourLabel(hour);
    timeColumn.append(label);
  });

  const daysGrid = document.createElement("div");
  daysGrid.className = "week-days-grid";
  weekDates.forEach((date) => daysGrid.append(createWeekDayColumn(date)));

  scroller.append(timeColumn, daysGrid);
  timeline.append(header, scroller);
  els.monthGrid.replaceChildren(timeline);
  restoreWeekScrollPosition(scrollPosition);
}

function createWeekHeaderDay(date) {
  const dateKey = toDateKey(date);
  const dayEvents = getFilteredEventsForDate(dateKey).filter((event) => !event.time);
  const headerButton = document.createElement("button");
  headerButton.className = [
    "week-day-header",
    isSameDay(date, TODAY) ? "week-day-header--today" : "",
    isSameDay(date, selectedDate) ? "week-day-header--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
  headerButton.type = "button";
  headerButton.setAttribute("aria-label", longDateFormatter.format(date));

  const weekday = document.createElement("span");
  weekday.className = "week-day-header-weekday";
  weekday.textContent = shortWeekdayFormatter.format(date);

  const dayNumber = document.createElement("span");
  dayNumber.className = "week-day-header-number";
  dayNumber.textContent = date.getDate();

  headerButton.append(weekday, dayNumber);

  if (dayEvents.length) {
    const allDayList = document.createElement("span");
    allDayList.className = "week-all-day-list";
    dayEvents.slice(0, 2).forEach((calendarEvent) => {
      const chip = document.createElement("span");
      chip.className = "week-all-day-chip";
      chip.style.setProperty("--event-color", getCalendar(calendarEvent.calendar).color);
      chip.textContent = calendarEvent.title;
      chip.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectedDate = fromDateKey(getEventDate(calendarEvent));
        ensureDateVisible(selectedDate);
        openEventDialog(getEventDate(calendarEvent), calendarEvent);
      });
      allDayList.append(chip);
    });
    headerButton.append(allDayList);
  }

  headerButton.addEventListener("click", () => {
    selectedDate = new Date(date);
    ensureDateVisible(date);
    render();
  });

  return headerButton;
}

function createWeekDayColumn(date) {
  const dateKey = toDateKey(date);
  const column = document.createElement("div");
  column.className = [
    "week-day-column",
    isSameDay(date, selectedDate) ? "week-day-column--selected" : "",
    isSameDay(date, TODAY) ? "week-day-column--today" : "",
  ]
    .filter(Boolean)
    .join(" ");
  column.dataset.date = dateKey;
  column.addEventListener("pointermove", handleWeekColumnPointerMove);
  column.addEventListener("pointerleave", handleWeekColumnPointerLeave);

  const hoverSelection = document.createElement("div");
  hoverSelection.className = "week-hover-selection";
  hoverSelection.hidden = true;
  hoverSelection.setAttribute("aria-hidden", "true");
  column.append(hoverSelection);

  HOURS.forEach((hour) => column.append(createWeekSlot(date, hour)));

  getFilteredEventsForDate(dateKey)
    .filter((calendarEvent) => calendarEvent.time)
    .forEach((calendarEvent) => column.append(createWeekTimedEvent(calendarEvent)));

  if (isSameDay(date, getNow())) {
    column.append(createNowIndicator());
  }

  return column;
}

function handleWeekColumnPointerMove(event) {
  const column = event.currentTarget;
  if (activeWeekRangeDrag || activeWeekEventDrag || !(column instanceof Element)) return;
  if (!(event.target instanceof Element) || !event.target.closest(".week-slot")) {
    hideWeekHoverSelection(column);
    return;
  }

  const minutes = getWeekMinutesAtClientY(column, event.clientY);
  const hoverSelection = column.querySelector(".week-hover-selection");
  if (!hoverSelection) return;

  const durationMinutes = Math.min(DEFAULT_EVENT_DURATION_MINUTES, 24 * 60 - minutes);
  hoverSelection.hidden = false;
  hoverSelection.dataset.time = formatMinutesInput(minutes);
  hoverSelection.dataset.durationMinutes = String(durationMinutes);
  hoverSelection.style.top = `${(minutes / 60) * WEEK_HOUR_HEIGHT + 1}px`;
  hoverSelection.style.height = `${Math.max(18, ((durationMinutes / 60) * WEEK_HOUR_HEIGHT) - 2)}px`;
}

function handleWeekColumnPointerLeave(event) {
  hideWeekHoverSelection(event.currentTarget);
}

function hideWeekHoverSelection(column) {
  if (!(column instanceof Element)) return;
  const hoverSelection = column.querySelector(".week-hover-selection");
  if (hoverSelection) hoverSelection.hidden = true;
}

function createNowIndicator() {
  const now = getNow();
  const indicator = document.createElement("div");
  indicator.className = "week-now-indicator";
  indicator.dataset.date = toDateKey(now);
  indicator.style.top = `${getNowOffsetPixels(now)}px`;
  indicator.setAttribute("aria-label", `Current time ${formatClockTime(now)}`);

  const dot = document.createElement("span");
  dot.className = "week-now-dot";

  const label = document.createElement("span");
  label.className = "week-now-time";
  label.textContent = formatClockTime(now);

  indicator.append(dot, label);
  return indicator;
}

function createWeekSlot(date, hour) {
  const dateKey = toDateKey(date);
  const slot = document.createElement("button");
  slot.className = "week-slot";
  slot.type = "button";
  slot.dataset.date = dateKey;
  slot.dataset.hour = String(hour);
  slot.style.top = `${hour * WEEK_HOUR_HEIGHT}px`;
  slot.setAttribute("aria-label", `Create event on ${longDateFormatter.format(date)} at ${formatHourLabel(hour) || "12 AM"}`);
  slot.addEventListener("pointerdown", (event) => startWeekRangeDrag(event, date));
  slot.addEventListener("click", (event) => {
    if (suppressNextWeekSlotClick) {
      event.preventDefault();
      suppressNextWeekSlotClick = false;
      return;
    }
    const startMinutes = getWeekPointerMinutes(event);
    selectedDate = new Date(date);
    ensureDateVisible(date);
    openEventDialog(dateKey, null, { time: formatMinutesInput(startMinutes), durationMinutes: DEFAULT_EVENT_DURATION_MINUTES });
  });
  return slot;
}

function startWeekRangeDrag(event, date) {
  if (event.button !== 0 || activeWeekRangeDrag) return;

  const column = event.currentTarget.closest(".week-day-column");
  if (!column) return;

  const startMinutes = getWeekPointerMinutes(event);
  hideWeekHoverSelection(column);
  const selection = document.createElement("div");
  selection.className = "week-drag-selection";
  selection.hidden = true;
  column.append(selection);

  activeWeekRangeDrag = {
    date: new Date(date),
    dateKey: toDateKey(date),
    column,
    selection,
    startMinutes,
    endMinutes: startMinutes,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
  };
  updateWeekRangeDragSelection(activeWeekRangeDrag);

  window.addEventListener("pointermove", handleWeekRangeDragMove);
  window.addEventListener("pointerup", handleWeekRangeDragEnd);
  window.addEventListener("pointercancel", cancelWeekRangeDrag);
}

function handleWeekRangeDragMove(event) {
  if (!activeWeekRangeDrag) return;

  const nextMinutes = getWeekRangeDragMinutes(activeWeekRangeDrag, event);
  const distance = Math.hypot(event.clientX - activeWeekRangeDrag.startX, event.clientY - activeWeekRangeDrag.startY);
  activeWeekRangeDrag.moved = activeWeekRangeDrag.moved || distance > 4 || nextMinutes !== activeWeekRangeDrag.startMinutes;
  activeWeekRangeDrag.endMinutes = nextMinutes;
  activeWeekRangeDrag.selection.hidden = !activeWeekRangeDrag.moved;
  updateWeekRangeDragSelection(activeWeekRangeDrag);
}

function handleWeekRangeDragEnd() {
  if (!activeWeekRangeDrag) return;

  const drag = activeWeekRangeDrag;
  cleanupWeekRangeDrag();

  if (!drag.moved) return;

  suppressNextWeekSlotClick = true;
  setTimeout(() => {
    suppressNextWeekSlotClick = false;
  }, 0);

  const range = getWeekRangeDragRange(drag);
  selectedDate = new Date(drag.date);
  ensureDateVisible(drag.date);
  openEventDialog(drag.dateKey, null, {
    time: formatMinutesInput(range.startMinutes),
    durationMinutes: range.durationMinutes,
  });
}

function cancelWeekRangeDrag() {
  cleanupWeekRangeDrag();
}

function cleanupWeekRangeDrag() {
  if (activeWeekRangeDrag?.selection) activeWeekRangeDrag.selection.remove();
  activeWeekRangeDrag = null;
  window.removeEventListener("pointermove", handleWeekRangeDragMove);
  window.removeEventListener("pointerup", handleWeekRangeDragEnd);
  window.removeEventListener("pointercancel", cancelWeekRangeDrag);
}

function getWeekPointerMinutes(event) {
  const column = event.currentTarget.closest(".week-day-column");
  if (!column) return (Number(event.currentTarget.dataset.hour) || 0) * 60;
  return getWeekMinutesAtClientY(column, event.clientY);
}

function getWeekRangeDragMinutes(drag, event) {
  return getWeekMinutesAtClientY(drag.column, event.clientY);
}

function getWeekMinutesAtClientY(column, clientY, { offsetMinutes = 0, maxMinutes = (24 * 60) - WEEK_SLOT_GRANULARITY_MINUTES } = {}) {
  const rect = column.getBoundingClientRect();
  const y = Math.min(Math.max(clientY - rect.top, 0), rect.height - 1);
  const rawMinutes = ((y / WEEK_HOUR_HEIGHT) * 60) - offsetMinutes;
  const snappedMinutes = Math.floor(rawMinutes / WEEK_SLOT_GRANULARITY_MINUTES) * WEEK_SLOT_GRANULARITY_MINUTES;
  return Math.min(maxMinutes, Math.max(0, snappedMinutes));
}

function getWeekRangeDragRange(drag) {
  const startMinutes = Math.min(drag.startMinutes, drag.endMinutes);
  const endMinutes = Math.min(24 * 60, Math.max(drag.startMinutes, drag.endMinutes) + WEEK_SLOT_GRANULARITY_MINUTES);
  return {
    startMinutes,
    endMinutes,
    durationMinutes: endMinutes - startMinutes,
  };
}

function updateWeekRangeDragSelection(drag) {
  const range = getWeekRangeDragRange(drag);
  drag.selection.style.top = `${(range.startMinutes / 60) * WEEK_HOUR_HEIGHT + 2}px`;
  drag.selection.style.height = `${Math.max(18, ((range.durationMinutes / 60) * WEEK_HOUR_HEIGHT) - 4)}px`;
  drag.selection.textContent = `${formatMinuteBoundary(range.startMinutes)} – ${formatMinuteBoundary(range.endMinutes)} · ${formatHours(range.durationMinutes / 60)}`;
}

function createWeekTimedEvent(calendarEvent) {
  const calendar = getCalendar(calendarEvent.calendar);
  const [hour, minute] = calendarEvent.time.split(":").map(Number);
  const startMinutes = hour * 60 + minute;
  const top = (startMinutes / 60) * WEEK_HOUR_HEIGHT;
  const height = (getOccurrenceDurationMinutes(calendarEvent) / 60) * WEEK_HOUR_HEIGHT;

  const eventButton = document.createElement("button");
  eventButton.className = "week-timed-event";
  eventButton.type = "button";
  eventButton.style.setProperty("--event-color", calendar.color);
  eventButton.style.top = `${top + 2}px`;
  eventButton.style.height = `${Math.max(34, height - 4)}px`;
  eventButton.setAttribute("aria-label", `${formatTime(calendarEvent.time)} ${calendarEvent.title}, ${calendar.name}`);

  const time = document.createElement("span");
  time.className = "week-timed-event-time";
  time.textContent = formatTime(calendarEvent.time);

  const title = document.createElement("span");
  title.className = "week-timed-event-title";
  title.textContent = calendarEvent.title;

  eventButton.append(title, time);
  eventButton.addEventListener("pointerdown", (event) => startWeekEventDrag(event, calendarEvent));
  eventButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (suppressNextWeekEventClick) {
      event.preventDefault();
      suppressNextWeekEventClick = false;
      return;
    }
    selectedDate = fromDateKey(getEventDate(calendarEvent));
    ensureDateVisible(selectedDate);
    openEventDialog(getEventDate(calendarEvent), calendarEvent);
  });

  return eventButton;
}

function startWeekEventDrag(event, calendarEvent) {
  if (event.button !== 0 || activeWeekEventDrag || activeWeekRangeDrag) return;

  const sourceButton = event.currentTarget;
  const sourceColumn = sourceButton.closest(".week-day-column");
  if (!sourceColumn) return;

  const sourceRect = sourceButton.getBoundingClientRect();
  const durationMinutes = getOccurrenceDurationMinutes(calendarEvent);
  const offsetMinutes = Math.min(
    Math.max(0, durationMinutes - WEEK_SLOT_GRANULARITY_MINUTES),
    Math.max(0, ((event.clientY - sourceRect.top) / WEEK_HOUR_HEIGHT) * 60)
  );
  const preview = document.createElement("div");
  preview.className = "week-event-drag-preview";
  preview.style.setProperty("--event-color", getCalendar(calendarEvent.calendar).color);
  preview.hidden = true;

  activeWeekEventDrag = {
    event: calendarEvent,
    sourceButton,
    sourceColumn,
    preview,
    durationMinutes,
    offsetMinutes,
    targetDateKey: getEventDate(calendarEvent),
    targetMinutes: timeToMinutes(calendarEvent.time),
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
  };

  window.addEventListener("pointermove", handleWeekEventDragMove);
  window.addEventListener("pointerup", handleWeekEventDragEnd);
  window.addEventListener("pointercancel", cancelWeekEventDrag);
}

function handleWeekEventDragMove(event) {
  if (!activeWeekEventDrag) return;

  const drag = activeWeekEventDrag;
  const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
  drag.moved = drag.moved || distance > 4;
  if (!drag.moved) return;

  event.preventDefault();
  drag.sourceButton.classList.add("is-dragging");
  updateWeekEventDragPreview(drag, event);
}

function handleWeekEventDragEnd(event) {
  if (!activeWeekEventDrag) return;

  const drag = activeWeekEventDrag;
  if (drag.moved) updateWeekEventDragPreview(drag, event);
  cleanupWeekEventDrag();

  if (!drag.moved) return;

  suppressNextWeekEventClick = true;
  setTimeout(() => {
    suppressNextWeekEventClick = false;
  }, 0);

  moveWeekEventOccurrence(drag.event, drag.targetDateKey, drag.targetMinutes);
}

function cancelWeekEventDrag() {
  cleanupWeekEventDrag();
}

function cleanupWeekEventDrag() {
  if (activeWeekEventDrag?.preview) activeWeekEventDrag.preview.remove();
  if (activeWeekEventDrag?.sourceButton) activeWeekEventDrag.sourceButton.classList.remove("is-dragging");
  activeWeekEventDrag = null;
  window.removeEventListener("pointermove", handleWeekEventDragMove);
  window.removeEventListener("pointerup", handleWeekEventDragEnd);
  window.removeEventListener("pointercancel", cancelWeekEventDrag);
}

function updateWeekEventDragPreview(drag, event) {
  const targetColumn = getWeekColumnAtPoint(event.clientX) || drag.sourceColumn;
  const maxStartMinutes = Math.max(0, (24 * 60) - drag.durationMinutes);
  const targetMinutes = getWeekMinutesAtClientY(targetColumn, event.clientY, {
    offsetMinutes: drag.offsetMinutes,
    maxMinutes: maxStartMinutes,
  });
  const targetDateKey = targetColumn.dataset.date || drag.targetDateKey;

  hideWeekHoverSelection(targetColumn);
  drag.targetDateKey = targetDateKey;
  drag.targetMinutes = targetMinutes;
  drag.preview.hidden = false;
  drag.preview.style.top = `${(targetMinutes / 60) * WEEK_HOUR_HEIGHT + 2}px`;
  drag.preview.style.height = `${Math.max(34, ((drag.durationMinutes / 60) * WEEK_HOUR_HEIGHT) - 4)}px`;
  drag.preview.textContent = `${formatMinuteBoundary(targetMinutes)} · ${drag.event.title}`;
  if (drag.preview.parentElement !== targetColumn) targetColumn.append(drag.preview);
}

function getWeekColumnAtPoint(clientX) {
  return [...els.monthGrid.querySelectorAll(".week-day-column")].find((column) => {
    const rect = column.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right;
  });
}

function moveWeekEventOccurrence(calendarEvent, targetDateKey, targetMinutes) {
  moveEventOccurrence(calendarEvent, targetDateKey, formatMinutesInput(targetMinutes));
}

function moveEventOccurrence(calendarEvent, targetDateKey, targetTime = calendarEvent.time ?? "") {
  const eventIndex = events.findIndex((event) => event.id === calendarEvent.id);
  if (eventIndex < 0) return false;

  const sourceEvent = events[eventIndex];
  const sourceDateKey = getEventDate(calendarEvent);
  const sourceTime = calendarEvent.time ?? "";
  const repeat = sourceEvent.repeat ?? "none";

  if (targetDateKey === sourceDateKey && targetTime === sourceTime) return false;

  if (repeat === "none") {
    events.splice(eventIndex, 1, {
      ...sourceEvent,
      date: targetDateKey,
      time: targetTime,
    });
  } else if (targetDateKey === sourceDateKey) {
    events.splice(eventIndex, 1, {
      ...sourceEvent,
      instanceOverrides: {
        ...(sourceEvent.instanceOverrides ?? {}),
        [sourceDateKey]: {
          ...(sourceEvent.instanceOverrides?.[sourceDateKey] ?? {}),
          time: targetTime,
        },
      },
    });
  } else {
    const excludedDates = new Set(sourceEvent.excludedDates ?? []);
    excludedDates.add(sourceDateKey);
    events.splice(eventIndex, 1, {
      ...sourceEvent,
      excludedDates: [...excludedDates].sort(),
    });
    events.push(createMovedStandaloneOccurrence(calendarEvent, targetDateKey, targetTime));
  }

  selectedDate = fromDateKey(targetDateKey);
  viewAnchorDate = new Date(selectedDate);
  visibleMonth = startOfMonth(selectedDate);
  saveEvents();
  render();
  showToast("Event moved");
  return true;
}

function createMovedStandaloneOccurrence(calendarEvent, targetDateKey, targetTime) {
  return {
    id: makeId(),
    title: calendarEvent.title,
    date: targetDateKey,
    time: targetTime,
    calendar: calendarEvent.calendar,
    repeat: "none",
    paperTaskIds: calendarEvent.paperTaskIds ?? [],
    papers: calendarEvent.papers ?? [],
    durationMinutes: getOccurrenceDurationMinutes(calendarEvent),
    notes: calendarEvent.notes ?? "",
  };
}

function startMonthEventDrag(event, calendarEvent) {
  if (event.button !== 0 || activeMonthEventDrag || activeWeekEventDrag || activeWeekRangeDrag) return;
  if (!["month", "four-week"].includes(currentView)) return;

  const sourceButton = event.currentTarget;
  const preview = document.createElement("div");
  preview.className = "month-event-drag-preview";
  preview.style.setProperty("--event-color", getCalendar(calendarEvent.calendar).color);
  preview.textContent = `${calendarEvent.time ? `${formatTime(calendarEvent.time)} · ` : ""}${calendarEvent.title}`;
  preview.hidden = true;
  document.body.append(preview);

  activeMonthEventDrag = {
    event: calendarEvent,
    sourceButton,
    preview,
    sourceTime: calendarEvent.time ?? "",
    targetDateKey: getEventDate(calendarEvent),
    targetCell: null,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
  };

  window.addEventListener("pointermove", handleMonthEventDragMove);
  window.addEventListener("pointerup", handleMonthEventDragEnd);
  window.addEventListener("pointercancel", cancelMonthEventDrag);
}

function handleMonthEventDragMove(event) {
  if (!activeMonthEventDrag) return;

  const drag = activeMonthEventDrag;
  const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
  drag.moved = drag.moved || distance > 4;
  if (!drag.moved) return;

  event.preventDefault();
  drag.sourceButton.classList.add("is-dragging");
  updateMonthEventDragPreview(drag, event);
}

function handleMonthEventDragEnd(event) {
  if (!activeMonthEventDrag) return;

  const drag = activeMonthEventDrag;
  if (drag.moved) updateMonthEventDragPreview(drag, event);
  const targetDateKey = drag.targetCell?.dataset.date || "";
  cleanupMonthEventDrag();

  if (!drag.moved) return;

  suppressNextMonthEventClick = true;
  setTimeout(() => {
    suppressNextMonthEventClick = false;
  }, 0);

  if (targetDateKey) moveEventOccurrence(drag.event, targetDateKey, drag.sourceTime);
}

function cancelMonthEventDrag() {
  cleanupMonthEventDrag();
}

function cleanupMonthEventDrag() {
  if (activeMonthEventDrag?.preview) activeMonthEventDrag.preview.remove();
  if (activeMonthEventDrag?.sourceButton) activeMonthEventDrag.sourceButton.classList.remove("is-dragging");
  if (activeMonthEventDrag?.targetCell) activeMonthEventDrag.targetCell.classList.remove("day-cell--drag-over");
  activeMonthEventDrag = null;
  window.removeEventListener("pointermove", handleMonthEventDragMove);
  window.removeEventListener("pointerup", handleMonthEventDragEnd);
  window.removeEventListener("pointercancel", cancelMonthEventDrag);
}

function updateMonthEventDragPreview(drag, event) {
  const targetCell = getMonthDayCellAtPoint(event.clientX, event.clientY);
  if (targetCell) drag.targetDateKey = targetCell.dataset.date || drag.targetDateKey;

  if (drag.targetCell !== targetCell) {
    drag.targetCell?.classList.remove("day-cell--drag-over");
    targetCell?.classList.add("day-cell--drag-over");
    drag.targetCell = targetCell;
  }

  drag.preview.hidden = false;
  drag.preview.style.left = `${event.clientX + 12}px`;
  drag.preview.style.top = `${event.clientY + 12}px`;
}

function getMonthDayCellAtPoint(clientX, clientY) {
  return document.elementFromPoint(clientX, clientY)?.closest?.(".day-cell[data-date]") ?? null;
}

function createEventChip(calendarEvent) {
  const calendar = getCalendar(calendarEvent.calendar);
  const chip = document.createElement("button");
  chip.className = `event-chip ${calendarEvent.time ? "event-chip--timed" : "event-chip--all-day"}`;
  chip.type = "button";
  chip.style.setProperty("--event-color", calendar.color);
  chip.dataset.eventId = calendarEvent.id;
  chip.setAttribute("aria-label", `${calendarEvent.time ? `${formatTime(calendarEvent.time)} ` : ""}${calendarEvent.title}, ${calendar.name}`);

  if (calendarEvent.time) {
    const dot = document.createElement("span");
    dot.className = "event-dot";
    dot.setAttribute("aria-hidden", "true");

    const time = document.createElement("span");
    time.className = "event-time";
    time.textContent = formatTime(calendarEvent.time);

    chip.append(dot, time);
  }

  const title = document.createElement("span");
  title.className = "event-title";
  title.textContent = calendarEvent.title;

  chip.append(title);
  if (calendarEvent.readOnlyDeadline) {
    chip.classList.add("event-chip--deadline");
    chip.addEventListener("click", (event) => event.stopPropagation());
    return chip;
  }

  chip.addEventListener("pointerdown", (event) => startMonthEventDrag(event, calendarEvent));
  chip.addEventListener("click", (event) => {
    event.stopPropagation();
    if (suppressNextMonthEventClick) {
      event.preventDefault();
      suppressNextMonthEventClick = false;
      return;
    }
    selectedDate = fromDateKey(getEventDate(calendarEvent));
    openEventDialog(getEventDate(calendarEvent), calendarEvent);
  });

  return chip;
}

function updateEventEndTimeFromDuration() {
  if (!els.eventTime.value) {
    els.eventEndTime.value = "";
    return;
  }

  const startMinutes = timeToMinutes(els.eventTime.value);
  const durationMinutes = getEventDialogDurationMinutes();
  els.eventEndTime.value = formatMinutesInput(startMinutes + durationMinutes);
}

function updateEventDurationFromEndTime() {
  if (!els.eventTime.value || !els.eventEndTime.value) return;

  const startMinutes = timeToMinutes(els.eventTime.value);
  let endMinutes = timeToMinutes(els.eventEndTime.value);
  if (endMinutes < startMinutes) {
    endMinutes = Math.min(23 * 60 + 59, startMinutes + WEEK_SLOT_GRANULARITY_MINUTES);
    els.eventEndTime.value = formatMinutesInput(endMinutes);
  }

  els.eventDurationMinutes.value = String(Math.max(0, endMinutes - startMinutes));
}

function adjustEventEndTimeShortcut(minutes) {
  if (!els.eventTime.value) return;

  const startMinutes = timeToMinutes(els.eventTime.value);
  const endMinutes = els.eventEndTime.value ? timeToMinutes(els.eventEndTime.value) : startMinutes;
  const adjustedEndMinutes = Math.min(23 * 60 + 59, Math.max(startMinutes, endMinutes + minutes));
  els.eventEndTime.value = formatMinutesInput(adjustedEndMinutes);
  els.eventDurationMinutes.value = String(adjustedEndMinutes - startMinutes);
  showToast(`End time ${formatTime(els.eventEndTime.value)}`);
}

function setEventDurationHoursShortcut(hours) {
  els.eventDurationMinutes.value = String(hours * 60);
  updateEventEndTimeFromDuration();
  showToast(`${hours}h duration`);
}

function updateEventRepeatUntilField() {
  const isRecurring = els.eventRepeat.value !== "none";
  els.eventRepeatUntilField.hidden = !isRecurring;
  els.eventRepeatUntil.disabled = !isRecurring;
  els.eventRepeatUntil.min = els.eventDate.value;
  els.eventRepeatUntil.setCustomValidity(
    isRecurring && els.eventRepeatUntil.value && els.eventRepeatUntil.value < els.eventDate.value
      ? "Repeat end date must be on or after the event date."
      : "",
  );
}

function openEventDialog(dateKey, existingEvent = null, options = {}) {
  els.eventForm.reset();
  els.eventId.value = existingEvent?.id ?? "";
  els.eventOccurrenceDate.value = existingEvent ? getEventDate(existingEvent) : dateKey;
  els.eventDurationMinutes.value = String(options.durationMinutes ?? getOccurrenceDurationMinutes(existingEvent));
  els.eventTitle.value = existingEvent?.title ?? "";
  els.eventDate.value = existingEvent ? getEventDate(existingEvent) : dateKey;
  els.eventTime.value = options.time ?? existingEvent?.time ?? "";
  updateEventEndTimeFromDuration();
  els.eventCalendar.value = existingEvent?.calendar ?? getDefaultEventCalendarId();
  els.eventRepeat.value = existingEvent?.repeat ?? "none";
  els.eventRepeatUntil.value = existingEvent?.repeatUntil ?? "";
  updateEventRepeatUntilField();
  els.eventNotes.value = existingEvent?.notes ?? "";
  activeEventPaperSnapshots = getExistingEventPaperSnapshots(existingEvent);
  const selectedPaperIds = existingEvent?.paperTaskIds ?? activeEventPaperSnapshots.map((paper) => paper.id);
  renderEventPaperAssignment(selectedPaperIds.length ? selectedPaperIds : inferPaperTaskIdsFromEvent(existingEvent));
  const isRecurringEvent = existingEvent && (existingEvent.repeat ?? "none") !== "none";
  els.deleteEvent.hidden = !existingEvent;
  els.deleteEvent.textContent = isRecurringEvent ? "Delete instance" : "Delete";
  els.deleteSeriesEvent.hidden = !isRecurringEvent;
  document.querySelector("#eventDialogTitle").textContent = existingEvent ? "Edit event" : "Create event";
  els.eventModal.classList.add("is-open");
  els.eventModal.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    if (existingEvent) {
      els.eventForm.focus();
    } else {
      els.eventTitle.focus();
    }
  });
}

function closeEventDialog() {
  els.eventModal.classList.remove("is-open");
  els.eventModal.setAttribute("aria-hidden", "true");
}

function saveEventFromDialog(event) {
  event.preventDefault();

  const id = els.eventId.value || makeId();
  const existingIndex = events.findIndex((item) => item.id === id);
  const existingEvent = existingIndex >= 0 ? events[existingIndex] : null;
  let selectedPapers = isReadEventTitle(els.eventTitle.value) ? getSelectedEventPapers() : [];
  if (!selectedPapers.length && isReadEventTitle(els.eventTitle.value)) {
    const matchingIds = new Set(inferPaperTaskIdsFromEvent({ title: els.eventTitle.value }));
    selectedPapers = getEventPaperAssignmentCandidates().filter((paper) => matchingIds.has(paper.id));
  }
  if (!selectedPapers.length && existingEvent && isReadEventTitle(els.eventTitle.value)) {
    selectedPapers = activeEventPaperSnapshots;
  }

  updateEventDurationFromEndTime();
  const repeat = els.eventRepeat.value;
  const assignedTitle = selectedPapers.length ? getReadEventTitleForPapers(els.eventTitle.value, selectedPapers) : els.eventTitle.value.trim();
  const formEvent = {
    id,
    title: assignedTitle,
    date: els.eventDate.value,
    time: els.eventTime.value,
    calendar: els.eventCalendar.value,
    repeat,
    repeatUntil: repeat !== "none" ? els.eventRepeatUntil.value : "",
    paperTaskIds: selectedPapers.map((paper) => paper.id),
    papers: selectedPapers,
    durationMinutes: getEventDialogDurationMinutes(),
    notes: els.eventNotes.value.trim(),
  };
  if (!formEvent.repeatUntil) delete formEvent.repeatUntil;
  if (!formEvent.title || !formEvent.date || !formEvent.calendar) return;

  const edit = {
    existingIndex,
    existingEvent,
    occurrenceDate: els.eventOccurrenceDate.value || formEvent.date,
    formEvent,
    selectedPapers,
  };

  if (existingEvent && (existingEvent.repeat ?? "none") !== "none") {
    pendingRecurringEdit = edit;
    openRecurrenceScopeModal();
    return;
  }

  commitStandardEventEdit(edit);
}

function openRecurrenceScopeModal() {
  els.recurrenceScopeModal.classList.add("is-open");
  els.recurrenceScopeModal.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => els.recurrenceScopeOptions[0]?.focus());
}

function closeRecurrenceScopeModal() {
  pendingRecurringEdit = null;
  els.recurrenceScopeModal.classList.remove("is-open");
  els.recurrenceScopeModal.setAttribute("aria-hidden", "true");
  if (els.eventModal.classList.contains("is-open")) els.eventForm.focus();
}

function applyRecurringEdit(scope) {
  const edit = pendingRecurringEdit;
  if (!edit) return;
  pendingRecurringEdit = null;
  els.recurrenceScopeModal.classList.remove("is-open");
  els.recurrenceScopeModal.setAttribute("aria-hidden", "true");

  const { existingEvent, existingIndex, occurrenceDate, formEvent } = edit;
  if (scope === "only") {
    applyOnlyThisEventEdit(existingIndex, existingEvent, occurrenceDate, formEvent);
  } else if (scope === "following") {
    applyFollowingEventsEdit(existingIndex, existingEvent, occurrenceDate, formEvent);
  } else if (scope === "all") {
    applyAllEventsEdit(existingIndex, existingEvent, occurrenceDate, formEvent);
  } else {
    return;
  }
  finishEventEdit(
    edit.selectedPapers,
    formEvent.date,
    scope === "only" ? "Event instance updated" : "Recurring events updated",
    { preserveView: true },
  );
}

function applyOnlyThisEventEdit(existingIndex, existingEvent, occurrenceDate, formEvent) {
  const override = {
    title: formEvent.title,
    time: formEvent.time,
    calendar: formEvent.calendar,
    paperTaskIds: formEvent.paperTaskIds,
    papers: formEvent.papers,
    durationMinutes: formEvent.durationMinutes,
    notes: formEvent.notes,
  };

  if (formEvent.date === occurrenceDate) {
    events.splice(existingIndex, 1, {
      ...existingEvent,
      instanceOverrides: {
        ...(existingEvent.instanceOverrides ?? {}),
        [occurrenceDate]: override,
      },
    });
    return;
  }

  const excludedDates = new Set(existingEvent.excludedDates ?? []);
  excludedDates.add(occurrenceDate);
  events.splice(existingIndex, 1, { ...existingEvent, excludedDates: [...excludedDates].sort() });
  events.push({ ...formEvent, id: makeId(), repeat: "none" });
}

function applyFollowingEventsEdit(existingIndex, existingEvent, occurrenceDate, formEvent) {
  const previousDate = toDateKey(addDays(fromDateKey(occurrenceDate), -1));
  const priorSeries = {
    ...existingEvent,
    repeatUntil: existingEvent.repeatUntil && existingEvent.repeatUntil < previousDate ? existingEvent.repeatUntil : previousDate,
    instanceOverrides: filterDateMap(existingEvent.instanceOverrides, (date) => date < occurrenceDate),
    excludedDates: (existingEvent.excludedDates ?? []).filter((date) => date < occurrenceDate),
  };
  const followingSeries = {
    ...formEvent,
    id: makeId(),
    instanceOverrides: filterDateMap(existingEvent.instanceOverrides, (date) => date > occurrenceDate),
    excludedDates: (existingEvent.excludedDates ?? []).filter((date) => date > occurrenceDate),
  };
  const replacement = occurrenceDate > existingEvent.date ? [priorSeries, followingSeries] : [followingSeries];
  events.splice(existingIndex, 1, ...replacement);
}

function applyAllEventsEdit(existingIndex, existingEvent, occurrenceDate, formEvent) {
  const dayShift = Math.round((fromDateKey(formEvent.date) - fromDateKey(occurrenceDate)) / 86400000);
  const seriesDate = toDateKey(addDays(fromDateKey(existingEvent.date), dayShift));
  events.splice(existingIndex, 1, {
    ...existingEvent,
    ...formEvent,
    id: existingEvent.id,
    date: seriesDate,
    instanceOverrides: existingEvent.instanceOverrides ?? {},
    excludedDates: existingEvent.excludedDates ?? [],
  });
}

function filterDateMap(value, predicate) {
  return Object.fromEntries(Object.entries(value ?? {}).filter(([date]) => predicate(date)));
}

function commitStandardEventEdit(edit) {
  const { existingIndex, existingEvent, formEvent, selectedPapers } = edit;
  if (existingIndex >= 0) {
    events.splice(existingIndex, 1, { ...existingEvent, ...formEvent });
  } else {
    events.push(formEvent);
  }
  finishEventEdit(selectedPapers, formEvent.date, existingIndex >= 0 ? "Event updated" : "Event created");
}

function finishEventEdit(selectedPapers, date, message, options = {}) {
  const paperTasksChanged = selectedPapers.length ? markAssignedPapersAsRead(selectedPapers) : false;
  if (!options.preserveView) {
    selectedDate = fromDateKey(date);
    viewAnchorDate = new Date(selectedDate);
    visibleMonth = startOfMonth(selectedDate);
  }
  if (paperTasksChanged) {
    savePaperTasks();
    renderPaperTasks();
  }
  saveEvents();
  closeEventDialog();
  render();
  showToast(message);
}

function deleteActiveEvent() {
  const id = els.eventId.value;
  if (!id) return;

  const existingIndex = events.findIndex((event) => event.id === id);
  if (existingIndex < 0) return;

  const event = events[existingIndex];
  const repeat = event.repeat ?? "none";

  let paperTasksChanged = false;

  if (repeat !== "none") {
    const occurrenceDate = els.eventOccurrenceDate.value || event.date;
    paperTasksChanged = restorePapersToTasks(getAssignedPapersForOccurrence(event, occurrenceDate));
    const excludedDates = new Set(event.excludedDates ?? []);
    excludedDates.add(occurrenceDate);
    events.splice(existingIndex, 1, {
      ...event,
      excludedDates: [...excludedDates].sort(),
    });
    showToast("Event instance deleted");
  } else {
    paperTasksChanged = restorePapersToTasks(getAssignedPapersForOccurrence(event, event.date));
    events.splice(existingIndex, 1);
    showToast("Event deleted");
  }

  if (paperTasksChanged) {
    savePaperTasks();
    renderPaperTasks();
  }
  saveEvents();
  closeEventDialog();
  render();
}

function deleteRecurringSeries() {
  const id = els.eventId.value;
  if (!id) return;

  const existingIndex = events.findIndex((event) => event.id === id);
  if (existingIndex < 0) return;

  const paperTasksChanged = restorePapersToTasks(getAllAssignedPapersInSeries(events[existingIndex]));
  events.splice(existingIndex, 1);
  if (paperTasksChanged) {
    savePaperTasks();
    renderPaperTasks();
  }
  saveEvents();
  closeEventDialog();
  render();
  showToast("Recurring event deleted");
}

function setView(view) {
  if (!VIEW_LABELS[view] || currentView === view) return;
  currentView = view;
  heatmapDetailsAnchor = null;
  viewAnchorDate = new Date(selectedDate);
  visibleMonth = startOfMonth(selectedDate);
  render();
}

function toggleHeatmapRangeMode() {
  heatmapRangeMode = heatmapRangeMode === "events" ? "year" : "events";
  heatmapDetailsAnchor = null;
  render();
  showToast(heatmapRangeMode === "year" ? "Heatmap showing rolling year" : "Heatmap showing event span");
}

function jumpToCurrentTime() {
  const now = getNow();
  heatmapDetailsAnchor = null;
  currentView = "week";
  selectedDate = new Date(now);
  viewAnchorDate = new Date(now);
  visibleMonth = startOfMonth(now);
  render();
  requestAnimationFrame(centerWeekScrollerOnNow);
  showToast("Centered on current time");
}

function navigatePeriod(direction) {
  heatmapDetailsAnchor = null;
  if (currentView === "month") {
    visibleMonth = addMonths(visibleMonth, direction);
    selectedDate = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      Math.min(selectedDate.getDate(), daysInMonth(visibleMonth))
    );
    viewAnchorDate = new Date(selectedDate);
  } else if (currentView === "heatmap") {
    selectedDate = addYears(selectedDate, direction);
    viewAnchorDate = addYears(viewAnchorDate, direction);
    visibleMonth = startOfMonth(viewAnchorDate);
  } else {
    const step = currentView === "week" ? 7 : 28;
    selectedDate = addDays(selectedDate, direction * step);
    viewAnchorDate = addDays(viewAnchorDate, direction * step);
    visibleMonth = startOfMonth(viewAnchorDate);
  }

  render();
}

function ensureDateVisible(date) {
  if (currentView === "month") {
    visibleMonth = startOfMonth(date);
    viewAnchorDate = new Date(date);
    return;
  }

  const { start, end } = getVisibleDateRange();
  if (date < start || date > end) {
    viewAnchorDate = new Date(date);
  }
  visibleMonth = startOfMonth(date);
}

function getVisibleDateRange() {
  if (currentView === "month") {
    return {
      start: startOfMonth(visibleMonth),
      end: endOfDay(endOfMonth(visibleMonth)),
    };
  }

  if (currentView === "heatmap") {
    const { start, end } = getHeatmapDateRange();
    return {
      start,
      end: endOfDay(end),
    };
  }

  const start = startOfWeek(viewAnchorDate);
  return {
    start,
    end: endOfDay(addDays(start, currentView === "week" ? 6 : 27)),
  };
}

function getHeaderTitle(start, end) {
  if (currentView === "month") return monthFormatter.format(visibleMonth);
  return formatDateRange(start, end);
}

function formatDateRange(start, end) {
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${rangeFullMonthDayFormatter.format(start)} – ${end.getDate()}, ${end.getFullYear()}`;
  }

  if (start.getFullYear() === end.getFullYear()) {
    return `${rangeMonthDayFormatter.format(start)} – ${rangeMonthDayFormatter.format(end)}, ${end.getFullYear()}`;
  }

  return `${rangeMonthDayFormatter.format(start)}, ${start.getFullYear()} – ${rangeMonthDayFormatter.format(end)}, ${end.getFullYear()}`;
}

function getMainCalendarDates() {
  if (currentView === "month") {
    return getMonthCalendarDates();
  }

  const { start } = getVisibleDateRange();
  return makeDateRange(start, currentView === "week" ? 7 : 28);
}

function getMonthCalendarDates() {
  const firstDay = startOfMonth(visibleMonth);
  const lastDay = endOfMonth(visibleMonth);
  const gridStart = startOfWeek(firstDay);
  const gridEnd = endOfWeek(lastDay);
  const dayCount = Math.round((startOfDay(gridEnd) - startOfDay(gridStart)) / 86_400_000) + 1;
  return makeDateRange(gridStart, dayCount);
}

function makeDateRange(start, length) {
  return Array.from({ length }, (_, index) => addDays(start, index));
}

function getMaxVisibleEvents() {
  if (currentView === "week") return 8;
  if (currentView === "four-week") return 8;
  return 6;
}

function getFilteredEventsForDate(dateKey) {
  return getCalendarEvents()
    .filter((event) => doesEventOccurOnDate(event, dateKey))
    .map((event) => createEventOccurrence(event, dateKey))
    .filter((event) => isEventVisible(event))
    .sort(compareEvents);
}

function doesEventOccurOnDate(event, dateKey) {
  const repeat = event.repeat ?? "none";
  if ((event.excludedDates ?? []).includes(dateKey)) return false;
  if (dateKey < event.date) return false;
  if (event.repeatUntil && dateKey > event.repeatUntil) return false;
  if (repeat === "none") return event.date === dateKey;
  if (repeat === "daily") return true;
  if (repeat === "weekly") return fromDateKey(dateKey).getDay() === fromDateKey(event.date).getDay();
  if (repeat === "weekdays") return isWeekday(fromDateKey(dateKey));
  return event.date === dateKey;
}

function createEventOccurrence(event, dateKey) {
  const override = event.instanceOverrides?.[dateKey] ?? {};
  return {
    ...event,
    ...override,
    id: event.id,
    repeat: event.repeat ?? "none",
    sourceDate: event.date,
    occurrenceDate: dateKey,
    instanceOverride: override,
  };
}

function getEventDate(event) {
  return event.occurrenceDate ?? event.date;
}

function isWeekday(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function renderSearchResults() {
  if (!searchQuery) {
    hideSearchResults();
    return;
  }

  const matches = events
    .filter((event) => !isCalendarDeleted(event.calendar) && eventMatchesSearch(event))
    .sort(compareEvents)
    .slice(0, 50);

  if (!matches.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state search-results-empty";
    empty.textContent = "No matching events.";
    els.searchResults.replaceChildren(empty);
  } else {
    els.searchResults.replaceChildren(...matches.map(createSearchResultItem));
  }

  els.searchResults.hidden = false;
  els.searchInput.setAttribute("aria-expanded", "true");
}

function hideSearchResults() {
  els.searchResults.hidden = true;
  els.searchInput.setAttribute("aria-expanded", "false");
}

function createSearchResultItem(event) {
  const calendar = getCalendar(event.calendar);
  const result = document.createElement("button");
  result.className = "search-result-item";
  result.type = "button";
  result.setAttribute("role", "option");
  result.style.setProperty("--event-color", calendar.color);

  const icon = document.createElement("span");
  icon.className = "search-result-calendar-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = String(new Date(`${getEventDate(event)}T00:00:00`).getDate());

  const main = document.createElement("span");
  main.className = "search-result-main";
  const title = document.createElement("span");
  title.className = "search-result-title";
  title.textContent = event.title;
  const calendarName = document.createElement("span");
  calendarName.className = "search-result-calendar";
  calendarName.textContent = calendar.name;
  main.append(title, calendarName);

  const when = document.createElement("span");
  when.className = "search-result-when";
  const date = document.createElement("span");
  date.className = "search-result-date";
  date.textContent = searchResultDateFormatter.format(fromDateKey(getEventDate(event)));
  const time = document.createElement("span");
  time.className = "search-result-time";
  time.textContent = getSearchResultTimeLabel(event);
  when.append(date, time);

  result.append(icon, main, when);
  result.addEventListener("click", () => openSearchResult(event));
  return result;
}

function getSearchResultTimeLabel(event) {
  if (!event.time) return "All day";
  const startMinutes = timeToMinutes(event.time);
  const endMinutes = Math.min(23 * 60 + 59, startMinutes + getOccurrenceDurationMinutes(event));
  return `${formatSearchResultTime(startMinutes)}–${formatSearchResultTime(endMinutes)}`;
}

function formatSearchResultTime(totalMinutes) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return searchResultTimeFormatter.format(new Date(2026, 0, 1, hour, minute));
}

function openSearchResult(event) {
  const date = fromDateKey(getEventDate(event));
  selectedDate = date;
  viewAnchorDate = new Date(date);
  visibleMonth = startOfMonth(date);
  hideSearchResults();
  render();
  openEventDialog(getEventDate(event), event);
}

function eventMatchesSearch(event) {
  const haystack = `${event.title} ${event.notes ?? ""} ${getCalendar(event.calendar).name}`.toLowerCase();
  return haystack.includes(searchQuery);
}

function isEventVisible(event) {
  if (isCalendarDeleted(event.calendar)) return false;
  if (!visibleCalendars[event.calendar]) return false;
  return !searchQuery || eventMatchesSearch(event);
}

function compareEvents(a, b) {
  const dateA = getEventDate(a);
  const dateB = getEventDate(b);
  if (dateA !== dateB) return dateA.localeCompare(dateB);
  if (Boolean(a.time) !== Boolean(b.time)) return a.time ? 1 : -1;
  return (a.time || "").localeCompare(b.time || "");
}

function getCalendar(id) {
  return calendars.find((calendar) => calendar.id === id) ?? defaultCalendars[0];
}

function loadEvents() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_EVENTS) || "null");
    return Array.isArray(saved) ? saved : seedEvents;
  } catch {
    return seedEvents;
  }
}

function saveEvents({ sync = true, touch = true } = {}) {
  localStorage.setItem(STORAGE_EVENTS, JSON.stringify(events));
  if (touch) touchLocalSyncUpdatedAt();
  if (sync) queueCloudSync();
}

function getCalendars() {
  const combined = [...defaultCalendars, ...customCalendars].map((calendar) => ({
    ...calendar,
    name: calendarNameOverrides?.[calendar.id] || calendar.name,
    color: calendarColorOverrides?.[calendar.id] || calendar.color,
  }));
  return orderCalendars(combined);
}

function orderCalendars(calendarList) {
  const byId = new Map(calendarList.map((calendar) => [calendar.id, calendar]));
  const ordered = calendarOrderIds?.map((id) => byId.get(id)).filter(Boolean) ?? [];
  const orderedIds = new Set(ordered.map((calendar) => calendar.id));
  return [...ordered, ...calendarList.filter((calendar) => !orderedIds.has(calendar.id))];
}

function normalizeCustomCalendars(value) {
  if (!Array.isArray(value)) return [];
  const builtInIds = new Set(defaultCalendars.map((calendar) => calendar.id));
  const seen = new Set();
  return value
    .filter((calendar) => calendar?.id && calendar?.name && !builtInIds.has(calendar.id) && !seen.has(calendar.id))
    .map((calendar) => {
      seen.add(calendar.id);
      return {
        id: String(calendar.id),
        name: String(calendar.name),
        color: calendar.color || importedCalendarColors[seen.size % importedCalendarColors.length],
        imported: true,
      };
    });
}

function loadCustomCalendars() {
  try {
    return normalizeCustomCalendars(JSON.parse(localStorage.getItem(STORAGE_CUSTOM_CALENDARS) || "[]"));
  } catch {
    return [];
  }
}

function saveCustomCalendars({ sync = true, touch = true } = {}) {
  localStorage.setItem(STORAGE_CUSTOM_CALENDARS, JSON.stringify(customCalendars));
  if (touch) touchLocalSyncUpdatedAt();
  if (sync) queueCloudSync();
}

function normalizeCalendarOrderIds(value) {
  if (!Array.isArray(value)) return [];
  const validIds = new Set([...defaultCalendars, ...customCalendars].map((calendar) => calendar.id));
  return [...new Set(value.filter((id) => validIds.has(id)))];
}

function loadCalendarOrderIds() {
  try {
    return normalizeCalendarOrderIds(JSON.parse(localStorage.getItem(STORAGE_CALENDAR_ORDER) || "[]"));
  } catch {
    return [];
  }
}

function saveCalendarOrderIds({ sync = true, touch = true } = {}) {
  localStorage.setItem(STORAGE_CALENDAR_ORDER, JSON.stringify(calendarOrderIds));
  if (touch) touchLocalSyncUpdatedAt();
  if (sync) queueCloudSync();
}

function normalizeCalendarNameOverrides(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const validIds = new Set([...defaultCalendars, ...customCalendars].map((calendar) => calendar.id));
  return Object.fromEntries(
    Object.entries(value)
      .filter(([id, name]) => validIds.has(id) && typeof name === "string" && name.trim())
      .map(([id, name]) => [id, name.trim()])
  );
}

function loadCalendarNameOverrides() {
  try {
    return normalizeCalendarNameOverrides(JSON.parse(localStorage.getItem(STORAGE_CALENDAR_RENAMES) || "{}"));
  } catch {
    return {};
  }
}

function saveCalendarNameOverrides({ sync = true, touch = true } = {}) {
  localStorage.setItem(STORAGE_CALENDAR_RENAMES, JSON.stringify(calendarNameOverrides));
  if (touch) touchLocalSyncUpdatedAt();
  if (sync) queueCloudSync();
}

function normalizeCalendarColorOverrides(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const validIds = new Set([...defaultCalendars, ...customCalendars].map((calendar) => calendar.id));
  const validColors = new Set(basicColorKeywords);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([id, color]) => validIds.has(id) && validColors.has(color))
      .map(([id, color]) => [id, color])
  );
}

function loadCalendarColorOverrides() {
  try {
    return normalizeCalendarColorOverrides(JSON.parse(localStorage.getItem(STORAGE_CALENDAR_COLORS) || "{}"));
  } catch {
    return {};
  }
}

function saveCalendarColorOverrides({ sync = true, touch = true } = {}) {
  localStorage.setItem(STORAGE_CALENDAR_COLORS, JSON.stringify(calendarColorOverrides));
  if (touch) touchLocalSyncUpdatedAt();
  if (sync) queueCloudSync();
}

function loadVisibleCalendars() {
  const defaults = Object.fromEntries(calendars.map((calendar) => [calendar.id, true]));
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_VISIBLE_CALENDARS) || "{}") };
  } catch {
    return defaults;
  }
}

function saveVisibleCalendars({ sync = true, touch = true } = {}) {
  localStorage.setItem(STORAGE_VISIBLE_CALENDARS, JSON.stringify(visibleCalendars));
  if (touch) touchLocalSyncUpdatedAt();
  if (sync) queueCloudSync();
}

function normalizeCalendarIdList(value) {
  if (!Array.isArray(value)) return [];
  const validIds = new Set(calendars.map((calendar) => calendar.id));
  return [...new Set(value.filter((id) => validIds.has(id)))];
}

function loadArchivedCalendarIds() {
  try {
    return normalizeCalendarIdList(JSON.parse(localStorage.getItem(STORAGE_ARCHIVED_CALENDARS) || "[]"));
  } catch {
    return [];
  }
}

function saveArchivedCalendarIds({ sync = true, touch = true } = {}) {
  localStorage.setItem(STORAGE_ARCHIVED_CALENDARS, JSON.stringify(archivedCalendarIds));
  if (touch) touchLocalSyncUpdatedAt();
  if (sync) queueCloudSync();
}

function loadDeletedCalendarIds() {
  try {
    return normalizeCalendarIdList(JSON.parse(localStorage.getItem(STORAGE_DELETED_CALENDARS) || "[]"));
  } catch {
    return [];
  }
}

function saveDeletedCalendarIds({ sync = true, touch = true } = {}) {
  localStorage.setItem(STORAGE_DELETED_CALENDARS, JSON.stringify(deletedCalendarIds));
  if (touch) touchLocalSyncUpdatedAt();
  if (sync) queueCloudSync();
}

function loadPaperTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_PAPER_TASKS) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function savePaperTasks({ sync = true, touch = true } = {}) {
  localStorage.setItem(STORAGE_PAPER_TASKS, JSON.stringify(paperTasks));
  if (touch) touchLocalSyncUpdatedAt();
  if (sync) queueCloudSync();
}

function isValidSidebarLocation(value) {
  return value === "bottom";
}

function loadSidebarLocation() {
  return "bottom";
}

function saveSidebarLocation() {
  localStorage.setItem(STORAGE_SIDEBAR_LOCATION, "bottom");
}

function loadBottomSidebarHeight() {
  const saved = Number(localStorage.getItem(STORAGE_BOTTOM_SIDEBAR_HEIGHT));
  return Number.isFinite(saved) && saved > 0 ? saved : 0;
}

function saveBottomSidebarHeight() {
  if (bottomSidebarHeight) localStorage.setItem(STORAGE_BOTTOM_SIDEBAR_HEIGHT, String(bottomSidebarHeight));
}

function loadSelectedDeadlineIds() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_SELECTED_DEADLINES) || "[]");
    return Array.isArray(saved) ? saved.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function saveSelectedDeadlineIds() {
  localStorage.setItem(STORAGE_SELECTED_DEADLINES, JSON.stringify(selectedDeadlineIds));
}

function loadDeadlineFilterTags() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_DEADLINE_FILTER_TAGS) || "[]");
    return Array.isArray(saved) ? saved.filter(isValidDeadlineFilterTag) : [];
  } catch {
    return [];
  }
}

function saveDeadlineFilterTags() {
  localStorage.setItem(STORAGE_DEADLINE_FILTER_TAGS, JSON.stringify(deadlineFilterTags));
}

function isValidDeadlineFilterTag(tag) {
  return DEADLINE_TYPES.some((type) => type.tag === tag);
}

function createReferenceToday() {
  return new Date();
}

function getNow() {
  return createReferenceToday();
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfYear(date) {
  return new Date(date.getFullYear(), 0, 1);
}

function endOfYear(date) {
  return new Date(date.getFullYear(), 11, 31);
}

function endOfDay(date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

function startOfWeek(date) {
  const start = new Date(date);
  const daysSinceWeekStart = (start.getDay() - WEEK_START_DAY + 7) % 7;
  start.setDate(start.getDate() - daysSinceWeekStart);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfWeek(date) {
  return addDays(startOfWeek(date), 6);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addYears(date, amount) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + amount);
  if (next.getMonth() !== date.getMonth()) next.setDate(0);
  return next;
}

function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function centerWeekScrollerOnNow() {
  const scroller = els.monthGrid.querySelector(".week-timeline-scroll");
  if (!scroller) return;
  const top = getNowOffsetPixels(getNow());
  const centeredTop = Math.max(0, top - scroller.clientHeight / 2);
  scroller.scrollTo({ top: centeredTop, behavior: "auto" });
}

function updateNowIndicator() {
  if (currentView !== "week") return;
  const indicator = els.monthGrid.querySelector(".week-now-indicator");
  const now = getNow();

  if (!indicator) {
    const { start, end } = getVisibleDateRange();
    if (now >= start && now <= end) renderMonthGrid();
    return;
  }

  if (indicator.dataset.date !== toDateKey(now)) {
    renderMonthGrid();
    return;
  }

  indicator.style.top = `${getNowOffsetPixels(now)}px`;
  indicator.setAttribute("aria-label", `Current time ${formatClockTime(now)}`);
  indicator.querySelector(".week-now-time").textContent = formatClockTime(now);
}

function getNowOffsetPixels(date) {
  return ((date.getHours() * 60 + date.getMinutes()) / 60) * WEEK_HOUR_HEIGHT;
}

function formatClockTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatHourLabel(hour) {
  if (hour === 0) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
  }).format(new Date(2026, 0, 1, hour));
}

function formatHourBoundary(hour) {
  if (hour === 24) return "12 AM";
  return formatHourLabel(hour) || "12 AM";
}

function timeToMinutes(time = "00:00") {
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  return (hour * 60) + minute;
}

function formatMinuteBoundary(totalMinutes) {
  if (totalMinutes >= 24 * 60) return "12 AM";
  return formatTime(formatMinutesInput(totalMinutes));
}

function formatMinutesInput(totalMinutes) {
  const clampedMinutes = Math.min(23 * 60 + 59, Math.max(0, Math.round(totalMinutes)));
  const hour = Math.floor(clampedMinutes / 60);
  const minute = clampedMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatTimeInput(hour) {
  return formatMinutesInput(hour * 60);
}

function formatTime(time) {
  if (!time) return "";
  const [hour, minute] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: minute ? "2-digit" : undefined,
  }).format(new Date(2026, 0, 1, hour, minute));
}

function getTimezoneLabel() {
  const offsetMinutes = -new Date().getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const hours = Math.floor(Math.abs(offsetMinutes) / 60);
  const minutes = Math.abs(offsetMinutes) % 60;
  return `GMT${sign}${String(hours).padStart(2, "0")}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isTypingTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 2400);
}

function escapeHtml(value) {
  return value.replace(/[&<>"]/g, (character) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    };
    return replacements[character];
  });
}
