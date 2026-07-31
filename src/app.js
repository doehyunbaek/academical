import { createSyncManager } from "./sync.js";
import { createCalendarPanel } from "./panels/calendar.js";
import { createPapersPanel } from "./panels/papers.js";
import { createAnalysisPanel } from "./panels/analysis.js";
import { createDeadlinesPanel } from "./panels/deadlines.js";
import { createHeatmapCalendar } from "./calendar/heatmap.js";
import { createWeekCalendar } from "./calendar/week.js";
import { createMonthCalendar } from "./calendar/month.js";
import { createFourWeekCalendar } from "./calendar/four-week.js";

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
const STORAGE_SIDEBAR_LOCATION = "academical.sidebarLocation.v1";
const STORAGE_BOTTOM_SIDEBAR_HEIGHT = "academical.bottomSidebarHeight.v1";
const VIEW_LABELS = {
  week: "Week",
  month: "Month",
  "four-week": "4 weeks",
  heatmap: "Heatmap",
};
const WEEK_START_DAY = 1; // Monday
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
const defaultCalendars = [
  { id: "teaching", name: "Teaching", color: "#1a73e8", builtIn: true },
  { id: "research", name: "Research", color: "#188038", builtIn: true },
  { id: "deadlines", name: "Deadlines", color: "#d93025", builtIn: true },
  { id: "personal", name: "Personal", color: "#9334e6", builtIn: true },
  { id: "tasks", name: "Tasks", color: "#f9ab00", builtIn: true },
];
const importedCalendarColors = ["#1a73e8", "#188038", "#d93025", "#9334e6", "#f9ab00", "#0891b2", "#c026d3", "#ea580c"];
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
  paperCalendarInput: document.querySelector("#paperCalendarInput"),
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
  syncConflictModal: document.querySelector("#syncConflictModal"),
  syncConflictLocalCount: document.querySelector("#syncConflictLocalCount"),
  syncConflictLocalTime: document.querySelector("#syncConflictLocalTime"),
  syncConflictCloudCount: document.querySelector("#syncConflictCloudCount"),
  syncConflictCloudTime: document.querySelector("#syncConflictCloudTime"),
  syncConflictActions: document.querySelectorAll("[data-sync-conflict-action]"),
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
let weekFit24Hours = false;
let visibleMonth = startOfMonth(TODAY);
let selectedDate = new Date(TODAY);
let viewAnchorDate = new Date(TODAY);
let events = loadEvents();
let visibleCalendars = loadVisibleCalendars();
let archivedCalendarIds = loadArchivedCalendarIds();
let deletedCalendarIds = loadDeletedCalendarIds();
let sidebarLocation = loadSidebarLocation();
let bottomSidebarHeight = loadBottomSidebarHeight();
let activeSidebarPanel = "calendar";
let paperTasks = loadPaperTasks();
let searchQuery = "";
let heatmapRangeMode = "events";
const calendarInteractionState = {
  activeWeekRangeDrag: null,
  activeWeekEventDrag: null,
  activeMonthEventDrag: null,
  suppressNextWeekSlotClick: false,
  suppressNextWeekEventClick: false,
  suppressNextMonthEventClick: false,
};
let pendingRecurringEdit = null;
let activeSidebarResize = null;

const syncManager = createSyncManager({
  elements: els,
  defaultCalendars,
  getLocalState: () => ({
    events,
    paperTasks,
    customCalendars,
    calendarNameOverrides,
    calendarColorOverrides,
    calendarOrderIds,
    visibleCalendars,
    archivedCalendarIds,
    deletedCalendarIds,
  }),
  applyRemoteState: applySyncedState,
  applyRemoteEvents: applySyncedEvents,
  renderSyncedState,
  showToast,
  normalizeCustomCalendars,
  normalizeCalendarNameOverrides,
  normalizeCalendarColorOverrides,
  normalizePaperTasks,
});

const calendarPanel = createCalendarPanel({
  elements: els,
  getCalendars: () => calendars,
  getActiveCalendars,
  getAvailableCalendars,
  getArchivedCalendars,
  getVisibleCalendars: () => visibleCalendars,
  setVisibleCalendars: (value) => {
    visibleCalendars = value;
  },
  persistCalendarVisibility,
  openEditCalendarModal,
  archiveCalendar,
  restoreArchivedCalendar,
  deleteArchivedCalendar,
  reorderCalendars,
  escapeHtml,
});

const papersPanel = createPapersPanel({
  elements: els,
  getPaperTasks: () => paperTasks,
  setPaperTasks: (value) => {
    paperTasks = value;
  },
  savePaperTasks,
  getEvents: () => events,
  getVisibleCalendars: () => visibleCalendars,
  getActiveCalendars,
  getCalendars: () => calendars,
  getDefaultEventCalendarId,
  isPapersPanelActive: () => activeSidebarPanel === "papers",
  getOccurrenceDateTimeRange,
  createEventOccurrence,
  makeId,
  getNow,
  setSidebarPanel,
  showToast,
});

const analysisPanel = createAnalysisPanel({
  elements: els,
  getVisibleDateRange,
  getFilteredEventsForDate,
  makeDateRange,
  toDateKey,
  startOfDay,
  startOfWeek,
  addDays,
  getOccurrenceDateTimeRange,
  compactDateFormatter,
  formatTime,
  getHeaderTitle,
  formatHours,
  formatHoursLong,
  escapeHtml,
  activityCategories: ACTIVITY_CATEGORIES,
});

const deadlinesPanel = createDeadlinesPanel({
  elements: els,
  getNow,
  getVisibleCalendars: () => visibleCalendars,
  saveVisibleCalendars,
  renderCalendarToggles,
  renderCalendar: render,
  escapeHtml,
});

const monthCalendar = createMonthCalendar({
  elements: els,
  getCurrentView: () => currentView,
  getVisibleMonth: () => visibleMonth,
  getSelectedDate: () => selectedDate,
  setSelectedDate: (date) => {
    selectedDate = date;
  },
  getToday: () => TODAY,
  getFilteredEventsForDate,
  getMaxVisibleEvents,
  getMonthCalendarDates,
  toDateKey,
  fromDateKey,
  isSameDay,
  ensureDateVisible,
  openEventDialog,
  renderApp: render,
  showToast,
  getCalendar,
  getEventDate,
  formatTime,
  longDateFormatter,
  compactDateFormatter,
  interactionState: calendarInteractionState,
  moveEventOccurrence,
});

const fourWeekCalendar = createFourWeekCalendar({
  elements: els,
  getMainCalendarDates,
  createDayCell: monthCalendar.createDayCell,
});

const weekCalendar = createWeekCalendar({
  elements: els,
  getMainCalendarDates,
  getWeekFit24Hours: () => weekFit24Hours,
  getSelectedDate: () => selectedDate,
  setSelectedDate: (date) => {
    selectedDate = date;
  },
  getToday: () => TODAY,
  getNow,
  getFilteredEventsForDate,
  getCalendar,
  getEventDate,
  getOccurrenceDurationMinutes,
  getHeaderTitle,
  getTimezoneLabel,
  renderApp: render,
  getHourLabel: formatHourLabel,
  getClockTime: formatClockTime,
  getTime: formatTime,
  getTimeToMinutes: timeToMinutes,
  getMinutesInput: formatMinutesInput,
  getMinuteBoundary: formatMinuteBoundary,
  getFormatHours: formatHours,
  getToDateKey: toDateKey,
  getFromDateKey: fromDateKey,
  longDateFormatter,
  shortWeekdayFormatter,
  ensureDateVisible,
  openEventDialog,
  moveEventOccurrence,
  interactionState: calendarInteractionState,
});

const heatmapCalendar = createHeatmapCalendar({
  elements: els,
  getHeatmapRangeMode: () => heatmapRangeMode,
  getSelectedDate: () => selectedDate,
  getHeatmapAnchorDate: () => viewAnchorDate,
  setSelectedDate: (date) => {
    selectedDate = date;
  },
  getToday: () => TODAY,
  getNow,
  getSelectedDeadlineEvents,
  getCalendarEvents,
  isEventVisible,
  getFilteredEventsForDate,
  getWorkedHoursForDate,
  getAllRecordedEventHours,
  makeDateRange,
  toDateKey,
  fromDateKey,
  startOfDay,
  startOfMonth,
  addDays,
  addMonths,
  addYears,
  isSameDay,
  formatDateRange,
  formatHours,
  formatTime,
  getCalendar,
  getOccurrenceDurationHours,
  longDateFormatter,
  shortMonthFormatter,
  escapeHtml,
  weekStartDay: WEEK_START_DAY,
  renderApp: render,
});

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
  void deadlinesPanel.loadDeadlineConferences();
  render();
  syncManager.init();
  setInterval(() => {
    updateNowIndicator();
    if (activeSidebarPanel === "papers") papersPanel.renderPaperTasks();
  }, 60_000);
  setInterval(deadlinesPanel.updateDeadlineTimers, 1_000);
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
    if (currentView !== "heatmap" || !heatmapCalendar.hasDetails()) return;
    if (event.target.closest(".heatmap-details, .heatmap-day")) return;
    heatmapCalendar.clearDetails();
    renderMonthGrid();
  });

  els.sidebarToggle.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");
    refreshFittedWeekTimeline();
  });
  els.sidebarResizer.addEventListener("pointerdown", startSidebarResize);
  window.addEventListener("resize", () => {
    if (currentView === "week" && weekFit24Hours) renderMonthGrid();
  });
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
  els.closeDblpSearchModal.addEventListener("click", papersPanel.closeDblpSearchModal);
  els.dblpLoadMore.addEventListener("click", () => void papersPanel.loadMoreDblpResults());
  els.dblpSearchModal.addEventListener("click", (event) => {
    if (event.target === els.dblpSearchModal) papersPanel.closeDblpSearchModal();
  });
  els.dblpSearchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.isComposing) return;
    event.preventDefault();
    void papersPanel.searchDblp(els.dblpSearchInput.value);
  });

  els.todayButton.addEventListener("click", () => {
    const now = getNow();
    heatmapCalendar.clearDetails();
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
    papersPanel.setFilterQuery(event.target.value.trim().toLowerCase());
    papersPanel.renderPaperTasks();
  });

  els.eventTitle.addEventListener("input", () => {
    papersPanel.renderEventPaperAssignment(papersPanel.getSelectedEventPaperIds());
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
  calendarPanel.bindEvents();
  els.syncAuthButton.addEventListener("click", syncManager.toggleAuth);
  els.syncConflictActions.forEach((button) => {
    button.addEventListener("click", () => syncManager.resolveConflict(button.dataset.syncConflictAction));
  });
  els.paperModalForm.addEventListener("submit", papersPanel.addPaperTasksFromInput);
  els.paperModalInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      els.paperModalForm.requestSubmit();
    }
  });
  els.closePaperModal.addEventListener("click", papersPanel.closePaperModal);
  els.cancelPaperModal.addEventListener("click", papersPanel.closePaperModal);
  els.deletePaper.addEventListener("click", papersPanel.deleteEditingPaperTask);
  els.paperModal.addEventListener("click", (event) => {
    if (event.target === els.paperModal) papersPanel.closePaperModal();
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

    if (event.key === "Escape" && heatmapCalendar.hasDetails()) {
      heatmapCalendar.clearDetails();
      renderMonthGrid();
      return;
    }

    if (event.key === "Escape" && isDblpSearchModalOpen) {
      papersPanel.closeDblpSearchModal();
      return;
    }

    if (event.key === "Escape" && isPaperModalOpen) {
      papersPanel.closePaperModal();
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
      papersPanel.openPaperModal();
    } else if (key === "o") {
      event.preventDefault();
      papersPanel.openDblpSearchModal();
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
        heatmapCalendar.clearDetails();
        setView("heatmap");
      }
    } else if (key === "2") {
      event.preventDefault();
      if (currentView === "week") {
        weekFit24Hours = !weekFit24Hours;
        render();
        showToast(weekFit24Hours ? "Week showing all 24 hours" : "Week showing expanded hours");
      } else {
        setView("week");
      }
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

function refreshFittedWeekTimeline() {
  if (currentView !== "week" || !weekFit24Hours) return;
  requestAnimationFrame(() => {
    if (currentView === "week" && weekFit24Hours) renderMonthGrid();
  });
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
  if (currentView === "week" && weekFit24Hours) renderMonthGrid();
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
  if (panel === "papers") renderPaperTasks();
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
    refreshFittedWeekTimeline();
    return;
  }

  document.body.classList.remove("sidebar-collapsed");
  setSidebarPanel(panel);
  refreshFittedWeekTimeline();
}

function renderSidebarTimeAnalysisIfActive() {
  if (activeSidebarPanel === "analysis") renderSidebarTimeAnalysis();
}

function renderSidebarTimeAnalysis() {
  analysisPanel.renderSidebarTimeAnalysis();
}

function applySyncedState(remoteState) {
  events = Array.isArray(remoteState.events) ? remoteState.events : events;
  customCalendars = normalizeCustomCalendars(remoteState.customCalendars);
  calendarNameOverrides = normalizeCalendarNameOverrides(remoteState.calendarNameOverrides);
  calendarColorOverrides = normalizeCalendarColorOverrides(remoteState.calendarColorOverrides);
  calendarOrderIds = normalizeCalendarOrderIds(remoteState.calendarOrderIds);
  calendars = getCalendars();
  visibleCalendars = normalizeVisibleCalendars(visibleCalendars, customCalendars);
  archivedCalendarIds = normalizeCalendarIdList(remoteState.archivedCalendarIds);
  deletedCalendarIds = normalizeCalendarIdList(remoteState.deletedCalendarIds);
  paperTasks = Array.isArray(remoteState.paperTasks) ? normalizePaperTasks(remoteState.paperTasks) : paperTasks;
  saveEvents({ sync: false, touch: false });
  savePaperTasks({ sync: false, touch: false });
  saveCustomCalendars({ sync: false, touch: false });
  saveCalendarNameOverrides({ sync: false, touch: false });
  saveCalendarColorOverrides({ sync: false, touch: false });
  saveCalendarOrderIds({ sync: false, touch: false });
  saveVisibleCalendars({ sync: false, touch: false });
  saveArchivedCalendarIds({ sync: false, touch: false });
  saveDeletedCalendarIds({ sync: false, touch: false });
}

function applySyncedEvents(nextEvents) {
  events = Array.isArray(nextEvents) ? nextEvents : events;
  saveEvents({ sync: false, touch: false });
}

function renderSyncedState() {
  renderCalendarToggles();
  renderArchivedCalendars();
  renderPaperTasks();
  populateCalendarSelect();
  render();
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
  calendarPanel.renderCalendarToggles();
}

function renderArchivedCalendars() {
  calendarPanel.renderArchivedCalendars();
}

function toggleArchivedCalendars() {
  calendarPanel.toggleArchivedCalendars?.();
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
  calendarPanel.selectAllCalendars();
}

function soloCalendar(index) {
  calendarPanel.soloCalendar(index);
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
  const restoredPapers = removedEvents.flatMap(papersPanel.getAllAssignedPapersInSeries);
  const paperTasksChanged = papersPanel.restorePapersToTasks(restoredPapers);

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
  if (activeSidebarPanel === "papers") renderPaperTasks();
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

function makeCustomCalendarId(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "calendar";
  return `custom-${slug}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
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
  els.weekdayRow.hidden = ["week", "heatmap"].includes(currentView);
  els.monthGrid.className = `month-grid month-grid--${currentView}`;
  els.monthGrid.style.removeProperty("--month-grid-row-count");

  if (currentView === "week") {
    weekCalendar.render();
  } else if (currentView === "heatmap") {
    heatmapCalendar.render();
  } else if (currentView === "month") {
    monthCalendar.render();
  } else {
    fourWeekCalendar.render();
  }
}

async function loadDeadlineConferences() {
  return deadlinesPanel.loadDeadlineConferences();
}

function renderDeadlinePanel() {
  deadlinesPanel.renderDeadlinePanel();
}

function renderPaperTasks(options = {}) {
  papersPanel.renderPaperTasks(options);
}

function getSelectedDeadlineEvents() {
  return deadlinesPanel.getSelectedDeadlineEvents();
}

function getCalendarEvents() {
  return deadlinesPanel.getCalendarEvents(events);
}

function updateDeadlineTimers() {
  deadlinesPanel.updateDeadlineTimers();
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
  const activeEventPaperSnapshots = papersPanel.getExistingEventPaperSnapshots(existingEvent);
  papersPanel.setActiveEventPaperSnapshots(activeEventPaperSnapshots);
  const selectedPaperIds = existingEvent?.paperTaskIds ?? activeEventPaperSnapshots.map((paper) => paper.id);
  papersPanel.renderEventPaperAssignment(selectedPaperIds.length ? selectedPaperIds : papersPanel.inferPaperTaskIdsFromEvent(existingEvent));
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
  let selectedPapers = papersPanel.isReadEventTitle(els.eventTitle.value) ? papersPanel.getSelectedEventPapers() : [];
  if (!selectedPapers.length && papersPanel.isReadEventTitle(els.eventTitle.value)) {
    const matchingIds = new Set(papersPanel.inferPaperTaskIdsFromEvent({ title: els.eventTitle.value }));
    selectedPapers = papersPanel.getEventPaperAssignmentCandidates().filter((paper) => matchingIds.has(paper.id));
  }

  updateEventDurationFromEndTime();
  const repeat = els.eventRepeat.value;
  const assignedTitle = selectedPapers.length ? papersPanel.getReadEventTitleForPapers(els.eventTitle.value, selectedPapers) : els.eventTitle.value.trim();
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
  const paperTasksChanged = selectedPapers.length ? papersPanel.markAssignedPapersAsRead(selectedPapers) : false;
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
    paperTasksChanged = papersPanel.restorePapersToTasks(papersPanel.getAssignedPapersForOccurrence(event, occurrenceDate));
    const excludedDates = new Set(event.excludedDates ?? []);
    excludedDates.add(occurrenceDate);
    events.splice(existingIndex, 1, {
      ...event,
      excludedDates: [...excludedDates].sort(),
    });
    showToast("Event instance deleted");
  } else {
    paperTasksChanged = papersPanel.restorePapersToTasks(papersPanel.getAssignedPapersForOccurrence(event, event.date));
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

  const paperTasksChanged = papersPanel.restorePapersToTasks(papersPanel.getAllAssignedPapersInSeries(events[existingIndex]));
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
  heatmapCalendar.clearDetails();
  viewAnchorDate = new Date(selectedDate);
  visibleMonth = startOfMonth(selectedDate);
  render();
}

function toggleHeatmapRangeMode() {
  heatmapRangeMode = heatmapRangeMode === "events" ? "year" : "events";
  heatmapCalendar.clearDetails();
  render();
  showToast(heatmapRangeMode === "year" ? "Heatmap showing rolling year" : "Heatmap showing event span");
}

function jumpToCurrentTime() {
  const now = getNow();
  heatmapCalendar.clearDetails();
  currentView = "week";
  selectedDate = new Date(now);
  viewAnchorDate = new Date(now);
  visibleMonth = startOfMonth(now);
  render();
  requestAnimationFrame(centerWeekScrollerOnNow);
  showToast("Centered on current time");
}

function navigatePeriod(direction) {
  heatmapCalendar.clearDetails();
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
    const { start, end } = heatmapCalendar.getDateRange();
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
  if (touch) syncManager.touchLocalSyncUpdatedAt();
  if (sync) syncManager.queueCloudSync();
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
  if (touch) syncManager.touchLocalSyncUpdatedAt();
  if (sync) syncManager.queueCloudSync();
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
  if (touch) syncManager.touchLocalSyncUpdatedAt();
  if (sync) syncManager.queueCloudSync();
}

function normalizeCalendarNameOverrides(value, customCalendarList = customCalendars) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const validIds = new Set([...defaultCalendars, ...customCalendarList].map((calendar) => calendar.id));
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
  if (touch) syncManager.touchLocalSyncUpdatedAt();
  if (sync) syncManager.queueCloudSync();
}

function normalizeCalendarColorOverrides(value, customCalendarList = customCalendars) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const validIds = new Set([...defaultCalendars, ...customCalendarList].map((calendar) => calendar.id));
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
  if (touch) syncManager.touchLocalSyncUpdatedAt();
  if (sync) syncManager.queueCloudSync();
}

function normalizeVisibleCalendars(value, customCalendarList = customCalendars) {
  const validIds = [...defaultCalendars, ...customCalendarList].map((calendar) => calendar.id);
  const saved = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(validIds.map((id) => [id, typeof saved[id] === "boolean" ? saved[id] : true]));
}

function loadVisibleCalendars() {
  try {
    return normalizeVisibleCalendars(JSON.parse(localStorage.getItem(STORAGE_VISIBLE_CALENDARS) || "{}"));
  } catch {
    return normalizeVisibleCalendars({});
  }
}

function saveVisibleCalendars({ sync = true, touch = true } = {}) {
  localStorage.setItem(STORAGE_VISIBLE_CALENDARS, JSON.stringify(visibleCalendars));
  if (touch) syncManager.touchLocalSyncUpdatedAt();
  if (sync) syncManager.queueCloudSync();
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
  if (touch) syncManager.touchLocalSyncUpdatedAt();
  if (sync) syncManager.queueCloudSync();
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
  if (touch) syncManager.touchLocalSyncUpdatedAt();
  if (sync) syncManager.queueCloudSync();
}

function normalizePaperTasks(value, fallbackCalendar = getDefaultEventCalendarId()) {
  if (!Array.isArray(value)) return [];
  return value.map((task) => task?.calendar || !fallbackCalendar ? task : { ...task, calendar: fallbackCalendar });
}

function loadPaperTasks() {
  try {
    return normalizePaperTasks(JSON.parse(localStorage.getItem(STORAGE_PAPER_TASKS) || "[]"));
  } catch {
    return [];
  }
}

function savePaperTasks({ sync = true, touch = true } = {}) {
  localStorage.setItem(STORAGE_PAPER_TASKS, JSON.stringify(paperTasks));
  if (touch) syncManager.touchLocalSyncUpdatedAt();
  if (sync) syncManager.queueCloudSync();
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
  return weekCalendar.getNowOffsetPixels(date);
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
