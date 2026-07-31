const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTES_PER_DAY = 24 * 60;
const DEFAULT_WEEK_HOUR_HEIGHT = 72;
const WEEK_SLOT_GRANULARITY_MINUTES = 15;

function isCopyDrag(event) {
  return event.metaKey || event.ctrlKey;
}

export function createWeekCalendar({
  elements,
  getMainCalendarDates,
  getWeekFit24Hours,
  getHiddenWeekHours,
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
  copyEventOccurrence,
  interactionState,
}) {
  function render(scrollPosition = null) {
    const previousScrollPosition = scrollPosition ?? getWeekScrollPosition();
    const weekDates = getMainCalendarDates();
    const fit24Hours = getWeekFit24Hours();
    const visibleHours = getVisibleHours(fit24Hours);
    const visibleMinutes = getVisibleTimelineMinutes(fit24Hours);
    const timeline = document.createElement("section");
    timeline.className = `week-timeline${fit24Hours ? " week-timeline--fit" : ""}`;
    timeline.dataset.hourMode = fit24Hours ? "fit" : "expanded";
    timeline.setAttribute("aria-label", `${getHeaderTitle(weekDates[0], weekDates[6])} weekly schedule${fit24Hours ? ", all 24 hours visible" : ""}`);

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

    const hourHeight = fit24Hours
      ? Math.max(1, scroller.clientHeight / 24)
      : DEFAULT_WEEK_HOUR_HEIGHT;
    scroller.style.setProperty("--hour-height", `${hourHeight}px`);
    scroller.style.setProperty("--week-visible-hours", String(visibleMinutes / 60));

    const timeColumn = document.createElement("div");
    timeColumn.className = "week-time-column";
    visibleHours.forEach((hour, index) => {
      const label = document.createElement("div");
      label.className = `week-time-label${index === 0 ? " week-time-label--first" : ""}`;
      label.textContent = hour === 0 ? "" : getHourLabel(hour);
      timeColumn.append(label);
    });

    const daysGrid = document.createElement("div");
    daysGrid.className = "week-days-grid";
    weekDates.forEach((date) => daysGrid.append(createWeekDayColumn(date, fit24Hours)));

    scroller.append(timeColumn, daysGrid);
    if (!fit24Hours) restoreWeekScrollPosition(previousScrollPosition);
  }

  function getHiddenRange() {
    const configured = getHiddenWeekHours?.();
    if (configured?.enabled !== true) return null;
    const start = getTimeToMinutes(configured?.start ?? "00:00");
    const end = getTimeToMinutes(configured?.end ?? "00:00");
    if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) return null;
    const wrapsMidnight = end < start;
    const hiddenMinutes = wrapsMidnight
      ? MINUTES_PER_DAY - start + end
      : end - start;
    return { start, end, wrapsMidnight, hiddenMinutes };
  }

  function getVisibleHours(fit24Hours = getWeekFit24Hours()) {
    if (fit24Hours) return HOURS;
    return HOURS.filter((hour) => getDisplayedMinutesAtActual(hour * 60, fit24Hours) !== null);
  }

  function getVisibleTimelineMinutes(fit24Hours = getWeekFit24Hours()) {
    if (fit24Hours) return MINUTES_PER_DAY;
    const hidden = getHiddenRange();
    return hidden ? MINUTES_PER_DAY - hidden.hiddenMinutes : MINUTES_PER_DAY;
  }

  function getDisplayedMinutesAtActual(actualMinutes, fit24Hours = getWeekFit24Hours()) {
    const clamped = Math.min(MINUTES_PER_DAY, Math.max(0, actualMinutes));
    if (fit24Hours) return clamped;
    const hidden = getHiddenRange();
    if (!hidden) return clamped;
    if (hidden.wrapsMidnight) {
      if (clamped < hidden.end || clamped >= hidden.start) return null;
      return clamped - hidden.end;
    }
    if (clamped < hidden.start) return clamped;
    if (clamped < hidden.end) return null;
    return clamped - hidden.hiddenMinutes;
  }

  function getActualMinutesAtDisplayed(displayedMinutes, fit24Hours = getWeekFit24Hours()) {
    const clamped = Math.min(getVisibleTimelineMinutes(fit24Hours), Math.max(0, displayedMinutes));
    if (fit24Hours) return clamped;
    const hidden = getHiddenRange();
    if (!hidden) return clamped;
    if (hidden.wrapsMidnight) return clamped + hidden.end;
    return clamped < hidden.start ? clamped : clamped + hidden.hiddenMinutes;
  }

  function getDisplayedDurationMinutes(startMinutes, durationMinutes, fit24Hours = getWeekFit24Hours()) {
    const start = getDisplayedMinutesAtActual(startMinutes, fit24Hours);
    if (start === null) return null;
    const endActual = Math.min(MINUTES_PER_DAY, startMinutes + Math.max(0, durationMinutes));
    let end = getDisplayedMinutesAtActual(endActual, fit24Hours);
    if (end === null) {
      const hidden = getHiddenRange();
      end = hidden
        ? (hidden.wrapsMidnight ? getVisibleTimelineMinutes(fit24Hours) : hidden.start)
        : start;
    }
    return Math.max(0, end - start);
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
      const [calendarEvent] = dayEvents;
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

      if (dayEvents.length > 1) {
        const more = document.createElement("span");
        more.className = "week-all-day-more";
        more.textContent = `... ${dayEvents.length - 1} more`;
        more.title = `${dayEvents.length - 1} more all-day event${dayEvents.length === 2 ? "" : "s"}`;
        allDayList.append(more);
      }
      headerButton.append(allDayList);
    }

    headerButton.addEventListener("click", () => {
      setSelectedDate(new Date(date));
      ensureDateVisible(date);
      renderApp();
    });

    return headerButton;
  }

  function createWeekDayColumn(date, fit24Hours = getWeekFit24Hours()) {
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

    getVisibleHours(fit24Hours)
      .map((hour) => createWeekSlot(date, hour, fit24Hours))
      .filter(Boolean)
      .forEach((slot) => column.append(slot));

    getFilteredEventsForDate(dateKey)
      .filter((calendarEvent) => calendarEvent.time)
      .map((calendarEvent) => createWeekTimedEvent(calendarEvent, fit24Hours))
      .filter(Boolean)
      .forEach((calendarEvent) => column.append(calendarEvent));

    if (isSameDay(date, getNow())) {
      const nowIndicator = createNowIndicator(fit24Hours);
      if (nowIndicator) column.append(nowIndicator);
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

    const durationMinutes = Math.min(60, MINUTES_PER_DAY - minutes);
    hoverSelection.hidden = false;
    hoverSelection.dataset.time = getMinutesInput(minutes);
    hoverSelection.dataset.durationMinutes = String(durationMinutes);
    const hourHeight = getHourHeight(column);
    const displayedMinutes = getDisplayedMinutesAtActual(minutes);
    const displayedDuration = getDisplayedDurationMinutes(minutes, durationMinutes);
    if (displayedMinutes === null || displayedDuration === null) {
      hoverSelection.hidden = true;
      return;
    }
    hoverSelection.style.top = `${(displayedMinutes / 60) * hourHeight + 1}px`;
    hoverSelection.style.height = `${Math.max(getWeekFit24Hours() ? 4 : 18, ((displayedDuration / 60) * hourHeight) - 2)}px`;
  }

  function handleWeekColumnPointerLeave(event) {
    hideWeekHoverSelection(event.currentTarget);
  }

  function hideWeekHoverSelection(column) {
    if (!(column instanceof Element)) return;
    const hoverSelection = column.querySelector(".week-hover-selection");
    if (hoverSelection) hoverSelection.hidden = true;
  }

  function createNowIndicator(fit24Hours = getWeekFit24Hours()) {
    const now = getNow();
    const displayedMinutes = getDisplayedMinutesAtActual(now.getHours() * 60 + now.getMinutes(), fit24Hours);
    if (displayedMinutes === null) return null;
    const indicator = document.createElement("div");
    indicator.className = "week-now-indicator";
    indicator.dataset.date = getToDateKey(now);
    indicator.style.top = `${(displayedMinutes / 60) * getHourHeight()}px`;
    indicator.setAttribute("aria-label", `Current time ${getClockTime(now)}`);

    const dot = document.createElement("span");
    dot.className = "week-now-dot";

    const label = document.createElement("span");
    label.className = "week-now-time";
    label.textContent = getClockTime(now);

    indicator.append(dot, label);
    return indicator;
  }

  function createWeekSlot(date, hour, fit24Hours = getWeekFit24Hours()) {
    const dateKey = getToDateKey(date);
    const slot = document.createElement("button");
    slot.className = "week-slot";
    slot.type = "button";
    slot.dataset.date = dateKey;
    slot.dataset.hour = String(hour);
    const displayedMinutes = getDisplayedMinutesAtActual(hour * 60, fit24Hours);
    if (displayedMinutes === null) return null;
    slot.style.top = `${(displayedMinutes / 60) * getHourHeight()}px`;
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

  function getWeekMinutesAtClientY(column, clientY, { offsetMinutes = 0, maxMinutes = MINUTES_PER_DAY - WEEK_SLOT_GRANULARITY_MINUTES } = {}) {
    const rect = column.getBoundingClientRect();
    const y = Math.min(Math.max(clientY - rect.top, 0), rect.height - 1);
    const rawDisplayedMinutes = ((y / getHourHeight(column)) * 60) - offsetMinutes;
    const snappedDisplayedMinutes = Math.floor(rawDisplayedMinutes / WEEK_SLOT_GRANULARITY_MINUTES) * WEEK_SLOT_GRANULARITY_MINUTES;
    const actualMinutes = getActualMinutesAtDisplayed(snappedDisplayedMinutes);
    return Math.min(maxMinutes, Math.max(0, actualMinutes));
  }

  function getWeekRangeDragRange(drag) {
    const startMinutes = Math.min(drag.startMinutes, drag.endMinutes);
    const endMinutes = Math.min(MINUTES_PER_DAY, Math.max(drag.startMinutes, drag.endMinutes) + WEEK_SLOT_GRANULARITY_MINUTES);
    return {
      startMinutes,
      endMinutes,
      durationMinutes: endMinutes - startMinutes,
    };
  }

  function updateWeekRangeDragSelection(drag) {
    const range = getWeekRangeDragRange(drag);
    const hourHeight = getHourHeight(drag.column);
    const displayedStart = getDisplayedMinutesAtActual(range.startMinutes);
    const displayedDuration = getDisplayedDurationMinutes(range.startMinutes, range.durationMinutes);
    if (displayedStart === null || displayedDuration === null) return;
    drag.selection.style.top = `${(displayedStart / 60) * hourHeight + 2}px`;
    drag.selection.style.height = `${Math.max(getWeekFit24Hours() ? 4 : 18, ((displayedDuration / 60) * hourHeight) - 4)}px`;
    drag.selection.textContent = `${getMinuteBoundary(range.startMinutes)} – ${getMinuteBoundary(range.endMinutes)} · ${getFormatHours(range.durationMinutes / 60)}`;
  }

  function createWeekTimedEvent(calendarEvent, fit24Hours = getWeekFit24Hours()) {
    const calendar = getCalendar(calendarEvent.calendar);
    const [hour, minute] = calendarEvent.time.split(":").map(Number);
    const startMinutes = hour * 60 + minute;
    const displayedStart = getDisplayedMinutesAtActual(startMinutes, fit24Hours);
    const displayedDuration = getDisplayedDurationMinutes(startMinutes, getOccurrenceDurationMinutes(calendarEvent), fit24Hours);
    if (displayedStart === null || displayedDuration === null || displayedDuration <= 0) return null;
    const hourHeight = getHourHeight();
    const top = (displayedStart / 60) * hourHeight;
    const height = (displayedDuration / 60) * hourHeight;

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

    const updateEvent = isCopyDrag(event) ? copyEventOccurrence : moveEventOccurrence;
    updateEvent(drag.event, drag.targetDateKey, getMinutesInput(drag.targetMinutes));
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
    const displayedStart = getDisplayedMinutesAtActual(targetMinutes);
    const displayedDuration = getDisplayedDurationMinutes(targetMinutes, drag.durationMinutes);
    if (displayedStart === null || displayedDuration === null) {
      drag.preview.hidden = true;
      return;
    }
    drag.preview.style.top = `${(displayedStart / 60) * hourHeight + 2}px`;
    drag.preview.style.height = `${Math.max(getWeekFit24Hours() ? 4 : 34, ((displayedDuration / 60) * hourHeight) - 4)}px`;
    drag.preview.textContent = `${isCopyDrag(event) ? "Copy · " : ""}${getMinuteBoundary(targetMinutes)} · ${drag.event.title}`;
    if (drag.preview.parentElement !== targetColumn) targetColumn.append(drag.preview);
  }

  function getWeekColumnAtPoint(clientX) {
    return [...elements.monthGrid.querySelectorAll(".week-day-column")].find((column) => {
      const rect = column.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right;
    });
  }

  function getNowOffsetPixels(date) {
    const displayedMinutes = getDisplayedMinutesAtActual(date.getHours() * 60 + date.getMinutes());
    return displayedMinutes === null ? null : (displayedMinutes / 60) * getHourHeight();
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
