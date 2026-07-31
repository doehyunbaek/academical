const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const DEFAULT_WEEK_HOUR_HEIGHT = 72;
const WEEK_SLOT_GRANULARITY_MINUTES = 15;

export function createWeekCalendar({
  elements,
  getMainCalendarDates,
  getWeekFit24Hours,
  getSelectedDate,
  setSelectedDate,
  getToday,
  getNow,
  getFilteredEventsForDate,
  getCalendar,
  getEventDate,
  getOccurrenceDurationMinutes,
  getHeaderTitle,
  getTimezoneLabel,
  renderApp,
  getHourLabel,
  getClockTime,
  getTime,
  getTimeToMinutes,
  getMinutesInput,
  getMinuteBoundary,
  getFormatHours,
  getToDateKey,
  getFromDateKey,
  longDateFormatter,
  shortWeekdayFormatter,
  ensureDateVisible,
  openEventDialog,
  moveEventOccurrence,
  interactionState,
}) {
  function render(scrollPosition = null) {
    const previousScrollPosition = scrollPosition ?? getWeekScrollPosition();
    const weekDates = getMainCalendarDates();
    const timeline = document.createElement("section");
    timeline.className = `week-timeline${getWeekFit24Hours() ? " week-timeline--fit" : ""}`;
    timeline.dataset.hourMode = getWeekFit24Hours() ? "fit" : "expanded";
    timeline.setAttribute("aria-label", `${getHeaderTitle(weekDates[0], weekDates[6])} weekly schedule${getWeekFit24Hours() ? ", all 24 hours visible" : ""}`);

    const header = document.createElement("header");
    header.className = "week-timeline-header";

    const timezone = document.createElement("div");
    timezone.className = "week-timezone";
    timezone.textContent = getTimezoneLabel();
    header.append(timezone, ...weekDates.map(createWeekHeaderDay));

    const scroller = document.createElement("div");
    scroller.className = "week-timeline-scroll";
    timeline.append(header, scroller);
    elements.monthGrid.replaceChildren(timeline);

    const hourHeight = getWeekFit24Hours()
      ? Math.max(1, scroller.clientHeight / 24)
      : DEFAULT_WEEK_HOUR_HEIGHT;
    scroller.style.setProperty("--hour-height", `${hourHeight}px`);

    const timeColumn = document.createElement("div");
    timeColumn.className = "week-time-column";
    HOURS.forEach((hour) => {
      const label = document.createElement("div");
      label.className = "week-time-label";
      label.textContent = hour === 0 ? "" : getHourLabel(hour);
      timeColumn.append(label);
    });

    const daysGrid = document.createElement("div");
    daysGrid.className = "week-days-grid";
    weekDates.forEach((date) => daysGrid.append(createWeekDayColumn(date)));

    scroller.append(timeColumn, daysGrid);
    if (!getWeekFit24Hours()) restoreWeekScrollPosition(previousScrollPosition);
  }

  function getWeekScrollPosition() {
    const scroller = elements.monthGrid.querySelector(".week-timeline-scroll");
    return scroller
      ? { top: scroller.scrollTop, left: scroller.scrollLeft }
      : null;
  }

  function restoreWeekScrollPosition(position) {
    if (!position) return;
    const scroller = elements.monthGrid.querySelector(".week-timeline-scroll");
    if (!scroller) return;
    scroller.scrollTo({ top: position.top, left: position.left, behavior: "auto" });
  }

  function getHourHeight(element = null) {
    const scroller = element?.closest?.(".week-timeline-scroll") || elements.monthGrid.querySelector(".week-timeline-scroll");
    const value = Number.parseFloat(scroller?.style.getPropertyValue("--hour-height"));
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_WEEK_HOUR_HEIGHT;
  }

  function createWeekHeaderDay(date) {
    const dateKey = getToDateKey(date);
    const dayEvents = getFilteredEventsForDate(dateKey).filter((event) => !event.time);
    const headerButton = document.createElement("button");
    headerButton.className = [
      "week-day-header",
      isSameDay(date, getToday()) ? "week-day-header--today" : "",
      isSameDay(date, getSelectedDate()) ? "week-day-header--selected" : "",
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
          setSelectedDate(getFromDateKey(getEventDate(calendarEvent)));
          ensureDateVisible(getSelectedDate());
          openEventDialog(getEventDate(calendarEvent), calendarEvent);
        });
        allDayList.append(chip);
      });
      headerButton.append(allDayList);
    }

    headerButton.addEventListener("click", () => {
      setSelectedDate(new Date(date));
      ensureDateVisible(date);
      getRenderApp()();
    });

    return headerButton;
  }

  function createWeekDayColumn(date) {
    const dateKey = getToDateKey(date);
    const column = document.createElement("div");
    column.className = [
      "week-day-column",
      isSameDay(date, getSelectedDate()) ? "week-day-column--selected" : "",
      isSameDay(date, getToday()) ? "week-day-column--today" : "",
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
    if (interactionState.activeWeekRangeDrag || interactionState.activeWeekEventDrag || !(column instanceof Element)) return;
    if (!(event.target instanceof Element) || !event.target.closest(".week-slot")) {
      hideWeekHoverSelection(column);
      return;
    }

    const minutes = getWeekMinutesAtClientY(column, event.clientY);
    const hoverSelection = column.querySelector(".week-hover-selection");
    if (!hoverSelection) return;

    const durationMinutes = Math.min(60, 24 * 60 - minutes);
    hoverSelection.hidden = false;
    hoverSelection.dataset.time = getMinutesInput(minutes);
    hoverSelection.dataset.durationMinutes = String(durationMinutes);
    const hourHeight = getHourHeight(column);
    hoverSelection.style.top = `${(minutes / 60) * hourHeight + 1}px`;
    hoverSelection.style.height = `${Math.max(getWeekFit24Hours() ? 4 : 18, ((durationMinutes / 60) * hourHeight) - 2)}px`;
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
    indicator.dataset.date = getToDateKey(now);
    indicator.style.top = `${getNowOffsetPixels(now)}px`;
    indicator.setAttribute("aria-label", `Current time ${getClockTime(now)}`);

    const dot = document.createElement("span");
    dot.className = "week-now-dot";

    const label = document.createElement("span");
    label.className = "week-now-time";
    label.textContent = getClockTime(now);

    indicator.append(dot, label);
    return indicator;
  }

  function createWeekSlot(date, hour) {
    const dateKey = getToDateKey(date);
    const slot = document.createElement("button");
    slot.className = "week-slot";
    slot.type = "button";
    slot.dataset.date = dateKey;
    slot.dataset.hour = String(hour);
    slot.style.top = `${hour * getHourHeight()}px`;
    slot.setAttribute("aria-label", `Create event on ${longDateFormatter.format(date)} at ${getHourLabel(hour) || "12 AM"}`);
    slot.addEventListener("pointerdown", (event) => startWeekRangeDrag(event, date));
    slot.addEventListener("click", (event) => {
      if (interactionState.suppressNextWeekSlotClick) {
        event.preventDefault();
        interactionState.suppressNextWeekSlotClick = false;
        return;
      }
      const startMinutes = getWeekPointerMinutes(event);
      setSelectedDate(new Date(date));
      ensureDateVisible(date);
      openEventDialog(dateKey, null, { time: getMinutesInput(startMinutes), durationMinutes: 60 });
    });
    return slot;
  }

  function startWeekRangeDrag(event, date) {
    if (event.button !== 0 || interactionState.activeWeekRangeDrag || interactionState.activeMonthEventDrag) return;

    const column = event.currentTarget.closest(".week-day-column");
    if (!column) return;

    const startMinutes = getWeekPointerMinutes(event);
    hideWeekHoverSelection(column);
    const selection = document.createElement("div");
    selection.className = "week-drag-selection";
    selection.hidden = true;
    column.append(selection);

    interactionState.activeWeekRangeDrag = {
      date: new Date(date),
      dateKey: getToDateKey(date),
      column,
      selection,
      startMinutes,
      endMinutes: startMinutes,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    updateWeekRangeDragSelection(interactionState.activeWeekRangeDrag);

    window.addEventListener("pointermove", handleWeekRangeDragMove);
    window.addEventListener("pointerup", handleWeekRangeDragEnd);
    window.addEventListener("pointercancel", cancelWeekRangeDrag);
  }

  function handleWeekRangeDragMove(event) {
    if (!interactionState.activeWeekRangeDrag) return;

    const nextMinutes = getWeekRangeDragMinutes(interactionState.activeWeekRangeDrag, event);
    const distance = Math.hypot(event.clientX - interactionState.activeWeekRangeDrag.startX, event.clientY - interactionState.activeWeekRangeDrag.startY);
    interactionState.activeWeekRangeDrag.moved = interactionState.activeWeekRangeDrag.moved || distance > 4 || nextMinutes !== interactionState.activeWeekRangeDrag.startMinutes;
    interactionState.activeWeekRangeDrag.endMinutes = nextMinutes;
    interactionState.activeWeekRangeDrag.selection.hidden = !interactionState.activeWeekRangeDrag.moved;
    updateWeekRangeDragSelection(interactionState.activeWeekRangeDrag);
  }

  function handleWeekRangeDragEnd() {
    if (!interactionState.activeWeekRangeDrag) return;

    const drag = interactionState.activeWeekRangeDrag;
    cleanupWeekRangeDrag();

    if (!drag.moved) return;

    interactionState.suppressNextWeekSlotClick = true;
    setTimeout(() => {
      interactionState.suppressNextWeekSlotClick = false;
    }, 0);

    const range = getWeekRangeDragRange(drag);
    setSelectedDate(new Date(drag.date));
    ensureDateVisible(drag.date);
    openEventDialog(drag.dateKey, null, {
      time: getMinutesInput(range.startMinutes),
      durationMinutes: range.durationMinutes,
    });
  }

  function cancelWeekRangeDrag() {
    cleanupWeekRangeDrag();
  }

  function cleanupWeekRangeDrag() {
    if (interactionState.activeWeekRangeDrag?.selection) interactionState.activeWeekRangeDrag.selection.remove();
    interactionState.activeWeekRangeDrag = null;
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
    const rawMinutes = ((y / getHourHeight(column)) * 60) - offsetMinutes;
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
    const hourHeight = getHourHeight(drag.column);
    drag.selection.style.top = `${(range.startMinutes / 60) * hourHeight + 2}px`;
    drag.selection.style.height = `${Math.max(getWeekFit24Hours() ? 4 : 18, ((range.durationMinutes / 60) * hourHeight) - 4)}px`;
    drag.selection.textContent = `${getMinuteBoundary(range.startMinutes)} – ${getMinuteBoundary(range.endMinutes)} · ${getFormatHours(range.durationMinutes / 60)}`;
  }

  function createWeekTimedEvent(calendarEvent) {
    const calendar = getCalendar(calendarEvent.calendar);
    const [hour, minute] = calendarEvent.time.split(":").map(Number);
    const startMinutes = hour * 60 + minute;
    const hourHeight = getHourHeight();
    const top = (startMinutes / 60) * hourHeight;
    const height = (getOccurrenceDurationMinutes(calendarEvent) / 60) * hourHeight;

    const eventButton = document.createElement("button");
    eventButton.className = "week-timed-event";
    eventButton.type = "button";
    eventButton.style.setProperty("--event-color", calendar.color);
    eventButton.style.top = `${top + 2}px`;
    eventButton.style.height = `${Math.max(getWeekFit24Hours() ? 4 : 34, height - 4)}px`;
    eventButton.setAttribute("aria-label", `${getTime(calendarEvent.time)} ${calendarEvent.title}, ${calendar.name}`);

    const time = document.createElement("span");
    time.className = "week-timed-event-time";
    time.textContent = getTime(calendarEvent.time);

    const title = document.createElement("span");
    title.className = "week-timed-event-title";
    title.textContent = calendarEvent.title;

    eventButton.append(title, time);
    eventButton.addEventListener("pointerdown", (event) => startWeekEventDrag(event, calendarEvent));
    eventButton.addEventListener("click", (event) => {
      event.stopPropagation();
      if (interactionState.suppressNextWeekEventClick) {
        event.preventDefault();
        interactionState.suppressNextWeekEventClick = false;
        return;
      }
      setSelectedDate(getFromDateKey(getEventDate(calendarEvent)));
      ensureDateVisible(getSelectedDate());
      openEventDialog(getEventDate(calendarEvent), calendarEvent);
    });

    return eventButton;
  }

  function startWeekEventDrag(event, calendarEvent) {
    if (
      event.button !== 0
      || interactionState.activeWeekEventDrag
      || interactionState.activeWeekRangeDrag
      || interactionState.activeMonthEventDrag
    ) return;

    const sourceButton = event.currentTarget;
    const sourceColumn = sourceButton.closest(".week-day-column");
    if (!sourceColumn) return;

    const sourceRect = sourceButton.getBoundingClientRect();
    const durationMinutes = getOccurrenceDurationMinutes(calendarEvent);
    const offsetMinutes = Math.min(
      Math.max(0, durationMinutes - WEEK_SLOT_GRANULARITY_MINUTES),
      Math.max(0, ((event.clientY - sourceRect.top) / getHourHeight(sourceColumn)) * 60)
    );
    const preview = document.createElement("div");
    preview.className = "week-event-drag-preview";
    preview.style.setProperty("--event-color", getCalendar(calendarEvent.calendar).color);
    preview.hidden = true;

    interactionState.activeWeekEventDrag = {
      event: calendarEvent,
      sourceButton,
      sourceColumn,
      preview,
      durationMinutes,
      offsetMinutes,
      targetDateKey: getEventDate(calendarEvent),
      targetMinutes: getTimeToMinutes(calendarEvent.time),
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };

    window.addEventListener("pointermove", handleWeekEventDragMove);
    window.addEventListener("pointerup", handleWeekEventDragEnd);
    window.addEventListener("pointercancel", cancelWeekEventDrag);
  }

  function handleWeekEventDragMove(event) {
    if (!interactionState.activeWeekEventDrag) return;

    const drag = interactionState.activeWeekEventDrag;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    drag.moved = drag.moved || distance > 4;
    if (!drag.moved) return;

    event.preventDefault();
    drag.sourceButton.classList.add("is-dragging");
    updateWeekEventDragPreview(drag, event);
  }

  function handleWeekEventDragEnd(event) {
    if (!interactionState.activeWeekEventDrag) return;

    const drag = interactionState.activeWeekEventDrag;
    if (drag.moved) updateWeekEventDragPreview(drag, event);
    cleanupWeekEventDrag();

    if (!drag.moved) return;

    interactionState.suppressNextWeekEventClick = true;
    setTimeout(() => {
      interactionState.suppressNextWeekEventClick = false;
    }, 0);

    moveEventOccurrence(drag.event, drag.targetDateKey, getMinutesInput(drag.targetMinutes));
  }

  function cancelWeekEventDrag() {
    cleanupWeekEventDrag();
  }

  function cleanupWeekEventDrag() {
    if (interactionState.activeWeekEventDrag?.preview) interactionState.activeWeekEventDrag.preview.remove();
    if (interactionState.activeWeekEventDrag?.sourceButton) interactionState.activeWeekEventDrag.sourceButton.classList.remove("is-dragging");
    interactionState.activeWeekEventDrag = null;
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
    const hourHeight = getHourHeight(targetColumn);
    drag.preview.style.top = `${(targetMinutes / 60) * hourHeight + 2}px`;
    drag.preview.style.height = `${Math.max(getWeekFit24Hours() ? 4 : 34, ((drag.durationMinutes / 60) * hourHeight) - 4)}px`;
    drag.preview.textContent = `${getMinuteBoundary(targetMinutes)} · ${drag.event.title}`;
    if (drag.preview.parentElement !== targetColumn) targetColumn.append(drag.preview);
  }

  function getWeekColumnAtPoint(clientX) {
    return [...elements.monthGrid.querySelectorAll(".week-day-column")].find((column) => {
      const rect = column.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right;
    });
  }

  function getNowOffsetPixels(date) {
    return ((date.getHours() * 60 + date.getMinutes()) / 60) * getHourHeight();
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  return {
    render,
    getHourHeight,
    getNowOffsetPixels,
    isDragging() {
      return Boolean(interactionState.activeWeekRangeDrag || interactionState.activeWeekEventDrag);
    },
  };
}
