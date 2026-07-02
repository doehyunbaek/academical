const TODAY = new Date(2026, 6, 2); // Matches the supplied Google Calendar July 2026 reference.
const STORAGE_EVENTS = "academical.events.v1";
const STORAGE_VISIBLE_CALENDARS = "academical.visibleCalendars.v1";

const calendars = [
  { id: "teaching", name: "Teaching", color: "#1a73e8" },
  { id: "research", name: "Research", color: "#188038" },
  { id: "deadlines", name: "Deadlines", color: "#d93025" },
  { id: "personal", name: "Personal", color: "#9334e6" },
  { id: "tasks", name: "Tasks", color: "#f9ab00" },
];

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
  brandDay: document.querySelector("#brandDay"),
  calendarToggles: document.querySelector("#calendarToggles"),
  cancelEvent: document.querySelector("#cancelEvent"),
  closeModal: document.querySelector("#closeModal"),
  createEventButton: document.querySelector("#createEventButton"),
  deleteEvent: document.querySelector("#deleteEvent"),
  eventCalendar: document.querySelector("#eventCalendar"),
  eventDate: document.querySelector("#eventDate"),
  eventForm: document.querySelector("#eventForm"),
  eventId: document.querySelector("#eventId"),
  eventModal: document.querySelector("#eventModal"),
  eventNotes: document.querySelector("#eventNotes"),
  eventTime: document.querySelector("#eventTime"),
  eventTitle: document.querySelector("#eventTitle"),
  miniCalendar: document.querySelector("#miniCalendar"),
  miniCalendarTitle: document.querySelector("#miniCalendarTitle"),
  miniNext: document.querySelector("#miniNext"),
  miniPrevious: document.querySelector("#miniPrevious"),
  monthGrid: document.querySelector("#monthGrid"),
  monthTitle: document.querySelector("#monthTitle"),
  nextMonth: document.querySelector("#nextMonth"),
  previousMonth: document.querySelector("#previousMonth"),
  searchInput: document.querySelector("#searchInput"),
  sidebarToggle: document.querySelector("#sidebarToggle"),
  todayButton: document.querySelector("#todayButton"),
  toast: document.querySelector("#toast"),
  upcomingList: document.querySelector("#upcomingList"),
  viewSelect: document.querySelector("#viewSelect"),
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

let visibleMonth = startOfMonth(TODAY);
let selectedDate = new Date(TODAY);
let events = loadEvents();
let visibleCalendars = loadVisibleCalendars();
let searchQuery = "";

init();

function init() {
  els.brandDay.textContent = TODAY.getDate();
  populateCalendarSelect();
  renderCalendarToggles();
  bindEvents();
  render();
}

function bindEvents() {
  els.sidebarToggle.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");
  });

  els.todayButton.addEventListener("click", () => {
    selectedDate = new Date(TODAY);
    visibleMonth = startOfMonth(TODAY);
    render();
    showToast("Jumped to today");
  });

  els.previousMonth.addEventListener("click", () => changeMonth(-1));
  els.nextMonth.addEventListener("click", () => changeMonth(1));
  els.miniPrevious.addEventListener("click", () => changeMonth(-1));
  els.miniNext.addEventListener("click", () => changeMonth(1));

  els.createEventButton.addEventListener("click", () => {
    openEventDialog(toDateKey(selectedDate));
  });

  els.searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value.trim().toLowerCase();
    renderMonthGrid();
    renderUpcoming();
  });

  els.viewSelect.addEventListener("change", (event) => {
    if (event.target.value !== "Month") {
      showToast(`${event.target.value} view is coming next. Month view is active for now.`);
      event.target.value = "Month";
    }
  });

  els.closeModal.addEventListener("click", closeEventDialog);
  els.cancelEvent.addEventListener("click", closeEventDialog);
  els.eventModal.addEventListener("click", (event) => {
    if (event.target === els.eventModal) closeEventDialog();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.eventModal.classList.contains("is-open")) {
      closeEventDialog();
    }
  });

  els.eventForm.addEventListener("submit", saveEventFromDialog);
  els.deleteEvent.addEventListener("click", deleteActiveEvent);
}

function render() {
  renderHeader();
  renderMonthGrid();
  renderMiniCalendar();
  renderUpcoming();
}

function renderHeader() {
  els.monthTitle.textContent = monthFormatter.format(visibleMonth);
  els.miniCalendarTitle.textContent = monthFormatter.format(visibleMonth);
  els.todayButton.setAttribute("aria-label", `Today, ${longDateFormatter.format(TODAY)}`);
}

function renderCalendarToggles() {
  els.calendarToggles.replaceChildren(
    ...calendars.map((calendar) => {
      const label = document.createElement("label");
      label.className = "calendar-toggle";
      label.innerHTML = `
        <input type="checkbox" ${visibleCalendars[calendar.id] ? "checked" : ""} data-calendar="${calendar.id}" />
        <span class="calendar-dot" style="--calendar-color: ${calendar.color}"></span>
        <span>${calendar.name}</span>
      `;
      label.querySelector("input").addEventListener("change", (event) => {
        visibleCalendars[calendar.id] = event.target.checked;
        saveVisibleCalendars();
        renderMonthGrid();
        renderUpcoming();
      });
      return label;
    })
  );
}

function populateCalendarSelect() {
  els.eventCalendar.replaceChildren(
    ...calendars.map((calendar) => {
      const option = document.createElement("option");
      option.value = calendar.id;
      option.textContent = calendar.name;
      return option;
    })
  );
}

function renderMonthGrid() {
  els.monthGrid.replaceChildren(
    ...getVisibleMonthDates().map((date) => createDayCell(date))
  );
}

function createDayCell(date) {
  const dateKey = toDateKey(date);
  const dayEvents = getFilteredEventsForDate(dateKey);
  const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
  const isSelected = isSameDay(date, selectedDate);
  const isToday = isSameDay(date, TODAY);
  const maxVisibleEvents = 3;

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
    ensureMonthVisible(date);
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
      showToast(`${dayEvents.length} events on ${compactDateFormatter.format(date)}`);
    });
    eventList.append(moreButton);
  }

  cell.append(eventList);

  cell.addEventListener("click", () => {
    selectedDate = new Date(date);
    ensureMonthVisible(date);
    render();
  });

  cell.addEventListener("dblclick", () => {
    selectedDate = new Date(date);
    openEventDialog(dateKey);
  });

  cell.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      selectedDate = new Date(date);
      ensureMonthVisible(date);
      render();
    }
    if (event.key === " ") {
      event.preventDefault();
      selectedDate = new Date(date);
      openEventDialog(dateKey);
    }
  });

  return cell;
}

function createEventChip(calendarEvent) {
  const calendar = getCalendar(calendarEvent.calendar);
  const chip = document.createElement("button");
  chip.className = "event-chip";
  chip.type = "button";
  chip.style.setProperty("--event-color", calendar.color);
  chip.dataset.eventId = calendarEvent.id;
  chip.setAttribute("aria-label", `${calendarEvent.time ? `${formatTime(calendarEvent.time)} ` : ""}${calendarEvent.title}, ${calendar.name}`);

  const time = document.createElement("span");
  time.className = "event-time";
  time.textContent = calendarEvent.time ? formatTime(calendarEvent.time) : "All day";

  const title = document.createElement("span");
  title.className = "event-title";
  title.textContent = calendarEvent.title;

  chip.append(time, title);
  chip.addEventListener("click", (event) => {
    event.stopPropagation();
    selectedDate = fromDateKey(calendarEvent.date);
    openEventDialog(calendarEvent.date, calendarEvent);
  });

  return chip;
}

function renderMiniCalendar() {
  els.miniCalendar.replaceChildren(
    ...getVisibleMonthDates().map((date) => {
      const button = document.createElement("button");
      button.className = [
        "mini-day",
        date.getMonth() === visibleMonth.getMonth() ? "" : "mini-day--muted",
        isSameDay(date, TODAY) ? "mini-day--today" : "",
        isSameDay(date, selectedDate) ? "mini-day--selected" : "",
      ]
        .filter(Boolean)
        .join(" ");
      button.type = "button";
      button.textContent = date.getDate();
      button.setAttribute("aria-label", longDateFormatter.format(date));
      button.addEventListener("click", () => {
        selectedDate = new Date(date);
        ensureMonthVisible(date);
        render();
      });
      return button;
    })
  );
}

function renderUpcoming() {
  const selectedKey = toDateKey(selectedDate);
  const upcoming = events
    .filter((event) => event.date >= selectedKey)
    .filter((event) => isEventVisible(event))
    .sort(compareEvents)
    .slice(0, 5);

  if (!upcoming.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No upcoming events.";
    els.upcomingList.replaceChildren(empty);
    return;
  }

  els.upcomingList.replaceChildren(
    ...upcoming.map((event) => {
      const calendar = getCalendar(event.calendar);
      const item = document.createElement("button");
      item.className = "upcoming-item";
      item.type = "button";
      item.style.setProperty("--event-color", calendar.color);
      item.innerHTML = `
        <span class="upcoming-date">${compactDateFormatter.format(fromDateKey(event.date))}</span>
        <span class="upcoming-title">${escapeHtml(event.title)}</span>
        <span class="upcoming-meta">${event.time ? formatTime(event.time) : "All day"} · ${calendar.name}</span>
      `;
      item.addEventListener("click", () => {
        selectedDate = fromDateKey(event.date);
        visibleMonth = startOfMonth(selectedDate);
        openEventDialog(event.date, event);
      });
      return item;
    })
  );
}

function openEventDialog(dateKey, existingEvent = null) {
  els.eventForm.reset();
  els.eventId.value = existingEvent?.id ?? "";
  els.eventTitle.value = existingEvent?.title ?? "";
  els.eventDate.value = existingEvent?.date ?? dateKey;
  els.eventTime.value = existingEvent?.time ?? "";
  els.eventCalendar.value = existingEvent?.calendar ?? calendars[0].id;
  els.eventNotes.value = existingEvent?.notes ?? "";
  els.deleteEvent.hidden = !existingEvent;
  document.querySelector("#eventDialogTitle").textContent = existingEvent ? "Edit event" : "Create event";
  els.eventModal.classList.add("is-open");
  els.eventModal.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => els.eventTitle.focus());
}

function closeEventDialog() {
  els.eventModal.classList.remove("is-open");
  els.eventModal.setAttribute("aria-hidden", "true");
}

function saveEventFromDialog(event) {
  event.preventDefault();

  const formEvent = {
    id: els.eventId.value || makeId(),
    title: els.eventTitle.value.trim(),
    date: els.eventDate.value,
    time: els.eventTime.value,
    calendar: els.eventCalendar.value,
    notes: els.eventNotes.value.trim(),
  };

  if (!formEvent.title || !formEvent.date) return;

  const existingIndex = events.findIndex((item) => item.id === formEvent.id);
  if (existingIndex >= 0) {
    events.splice(existingIndex, 1, formEvent);
    showToast("Event updated");
  } else {
    events.push(formEvent);
    showToast("Event created");
  }

  selectedDate = fromDateKey(formEvent.date);
  visibleMonth = startOfMonth(selectedDate);
  saveEvents();
  closeEventDialog();
  render();
}

function deleteActiveEvent() {
  const id = els.eventId.value;
  if (!id) return;
  events = events.filter((event) => event.id !== id);
  saveEvents();
  closeEventDialog();
  render();
  showToast("Event deleted");
}

function changeMonth(direction) {
  visibleMonth = addMonths(visibleMonth, direction);
  selectedDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), Math.min(selectedDate.getDate(), daysInMonth(visibleMonth)));
  render();
}

function ensureMonthVisible(date) {
  if (date.getMonth() !== visibleMonth.getMonth() || date.getFullYear() !== visibleMonth.getFullYear()) {
    visibleMonth = startOfMonth(date);
  }
}

function getVisibleMonthDates() {
  const firstDay = startOfMonth(visibleMonth);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function getFilteredEventsForDate(dateKey) {
  return events
    .filter((event) => event.date === dateKey)
    .filter((event) => isEventVisible(event))
    .sort(compareEvents);
}

function isEventVisible(event) {
  if (!visibleCalendars[event.calendar]) return false;
  if (!searchQuery) return true;
  const haystack = `${event.title} ${event.notes ?? ""} ${getCalendar(event.calendar).name}`.toLowerCase();
  return haystack.includes(searchQuery);
}

function compareEvents(a, b) {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return (a.time || "24:00").localeCompare(b.time || "24:00");
}

function getCalendar(id) {
  return calendars.find((calendar) => calendar.id === id) ?? calendars[0];
}

function loadEvents() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_EVENTS) || "null");
    return Array.isArray(saved) ? saved : seedEvents;
  } catch {
    return seedEvents;
  }
}

function saveEvents() {
  localStorage.setItem(STORAGE_EVENTS, JSON.stringify(events));
}

function loadVisibleCalendars() {
  const defaults = Object.fromEntries(calendars.map((calendar) => [calendar.id, true]));
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_VISIBLE_CALENDARS) || "{}") };
  } catch {
    return defaults;
  }
}

function saveVisibleCalendars() {
  localStorage.setItem(STORAGE_VISIBLE_CALENDARS, JSON.stringify(visibleCalendars));
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
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

function formatTime(time) {
  if (!time) return "";
  const [hour, minute] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: minute ? "2-digit" : undefined,
  }).format(new Date(2026, 0, 1, hour, minute));
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
