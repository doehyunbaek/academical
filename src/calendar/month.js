function isCopyDrag(event) {
  return event.metaKey || event.ctrlKey;
}

export function createMonthCalendar({
  elements,
  getCurrentView,
  getVisibleMonth,
  getSelectedDate,
  setSelectedDate,
  getToday,
  getFilteredEventsForDate,
  getMaxVisibleEvents,
  getMonthCalendarDates,
  toDateKey,
  fromDateKey,
  isSameDay,
  ensureDateVisible,
  openEventDialog,
  renderApp,
  showToast,
  getCalendar,
  getDefaultEventCalendarId,
  getEventDate,
  formatTime,
  longDateFormatter,
  compactDateFormatter,
  interactionState,
  moveEventOccurrence,
  copyEventOccurrence,
}) {
  function render() {
    const dates = getMonthCalendarDates();
    elements.monthGrid.style.setProperty("--month-grid-row-count", Math.max(1, dates.length / 7));
    elements.monthGrid.replaceChildren(...dates.map(createDayCell));
  }

  function createDayCell(date) {
    const dateKey = toDateKey(date);
    const dayEvents = getFilteredEventsForDate(dateKey);
    const isCurrentMonth = getCurrentView() !== "month" || date.getMonth() === getVisibleMonth().getMonth();
    const isSelected = isSameDay(date, getSelectedDate());
    const isToday = isSameDay(date, getToday());
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
      setSelectedDate(new Date(date));
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
        setSelectedDate(new Date(date));
        ensureDateVisible(date);
        showToast(`${dayEvents.length} events on ${compactDateFormatter.format(date)}`);
      });
      eventList.append(moreButton);
    }

    cell.append(eventList);

    cell.addEventListener("pointerdown", (event) => startMonthRangeDrag(event, date));

    cell.addEventListener("click", (event) => {
      if (interactionState.suppressNextMonthCellClick) {
        event.preventDefault();
        interactionState.suppressNextMonthCellClick = false;
        return;
      }
      setSelectedDate(new Date(date));
      ensureDateVisible(date);
      renderApp();
    });

    cell.addEventListener("dblclick", () => {
      setSelectedDate(new Date(date));
      ensureDateVisible(date);
      openEventDialog(dateKey);
    });

    cell.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        setSelectedDate(new Date(date));
        ensureDateVisible(date);
        renderApp();
      }
      if (event.key === " ") {
        event.preventDefault();
        setSelectedDate(new Date(date));
        ensureDateVisible(date);
        openEventDialog(dateKey);
      }
    });

    return cell;
  }

  function startMonthRangeDrag(event, date) {
    if (
      event.button !== 0
      || event.target.closest("button, a, input, select, textarea")
      || interactionState.activeMonthRangeDrag
      || interactionState.activeMonthEventDrag
      || interactionState.activeWeekEventDrag
      || interactionState.activeWeekRangeDrag
    ) return;
    if (!["month", "four-week"].includes(getCurrentView())) return;

    interactionState.activeMonthRangeDrag = {
      startDateKey: toDateKey(date),
      endDateKey: toDateKey(date),
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      previewElements: [],
    };
    window.addEventListener("pointermove", handleMonthRangeDragMove);
    window.addEventListener("pointerup", handleMonthRangeDragEnd);
    window.addEventListener("pointercancel", cancelMonthRangeDrag);
  }

  function handleMonthRangeDragMove(event) {
    const drag = interactionState.activeMonthRangeDrag;
    if (!drag) return;
    drag.moved = drag.moved || Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4;
    if (!drag.moved) return;
    event.preventDefault();
    const targetCell = getMonthDayCellAtPoint(event.clientX, event.clientY);
    if (targetCell?.dataset.date) drag.endDateKey = targetCell.dataset.date;
    renderMonthRangePreview(drag);
  }

  function handleMonthRangeDragEnd(event) {
    const drag = interactionState.activeMonthRangeDrag;
    if (!drag) return;
    if (drag.moved) {
      const targetCell = getMonthDayCellAtPoint(event.clientX, event.clientY);
      if (targetCell?.dataset.date) drag.endDateKey = targetCell.dataset.date;
    }
    cleanupMonthRangeDrag();
    if (!drag.moved) return;

    const [startDateKey, endDateKey] = [drag.startDateKey, drag.endDateKey].sort();
    const durationDays = Math.round((fromDateKey(endDateKey) - fromDateKey(startDateKey)) / 86_400_000) + 1;
    interactionState.suppressNextMonthCellClick = true;
    setTimeout(() => { interactionState.suppressNextMonthCellClick = false; }, 0);
    setSelectedDate(fromDateKey(startDateKey));
    ensureDateVisible(fromDateKey(startDateKey));
    openEventDialog(startDateKey, null, { endDate: endDateKey, durationDays });
  }

  function cancelMonthRangeDrag() {
    cleanupMonthRangeDrag();
  }

  function cleanupMonthRangeDrag() {
    interactionState.activeMonthRangeDrag?.previewElements?.forEach((preview) => preview.remove());
    interactionState.activeMonthRangeDrag = null;
    window.removeEventListener("pointermove", handleMonthRangeDragMove);
    window.removeEventListener("pointerup", handleMonthRangeDragEnd);
    window.removeEventListener("pointercancel", cancelMonthRangeDrag);
  }

  function renderMonthRangePreview(drag) {
    drag.previewElements.forEach((preview) => preview.remove());
    drag.previewElements = [];

    const [startDateKey, endDateKey] = [drag.startDateKey, drag.endDateKey].sort();
    const selectedCells = [...elements.monthGrid.querySelectorAll(".day-cell[data-date]")]
      .filter((cell) => cell.dataset.date >= startDateKey && cell.dataset.date <= endDateKey)
      .sort((a, b) => a.dataset.date.localeCompare(b.dataset.date));
    const rows = new Map();
    selectedCells.forEach((cell) => {
      const rect = cell.getBoundingClientRect();
      const rowKey = Math.round(rect.top);
      if (!rows.has(rowKey)) rows.set(rowKey, []);
      rows.get(rowKey).push({ cell, rect });
    });

    [...rows.values()].forEach((row, rowIndex) => {
      const first = row[0];
      const last = row.at(-1);
      const eventListTop = first.cell.querySelector(".event-list")?.getBoundingClientRect().top ?? first.rect.top + 36;
      const preview = document.createElement("div");
      preview.className = "month-range-drag-preview";
      preview.style.setProperty("--event-color", getCalendar(getDefaultEventCalendarId()).color);
      preview.textContent = rowIndex === 0 ? "(No title)" : "";
      preview.setAttribute("aria-hidden", "true");
      preview.style.left = `${first.rect.left + 8}px`;
      preview.style.top = `${eventListTop + 2}px`;
      preview.style.width = `${Math.max(20, last.rect.right - first.rect.left - 16)}px`;
      document.body.append(preview);
      drag.previewElements.push(preview);
    });
  }

  function createEventChip(calendarEvent) {
    const calendar = getCalendar(calendarEvent.calendar);
    const chip = document.createElement("button");
    chip.className = `event-chip ${calendarEvent.time ? "event-chip--timed" : "event-chip--all-day"}`;
    const multiDaySegment = getMultiDaySegment(calendarEvent);
    if (multiDaySegment) {
      chip.classList.add("event-chip--multi-day");
      if (multiDaySegment.startsSegment) chip.classList.add("event-chip--multi-day-start");
      if (multiDaySegment.endsSegment) chip.classList.add("event-chip--multi-day-end");
      if (!multiDaySegment.startsSegment) chip.classList.add("event-chip--multi-day-continuation");
    }
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
    title.textContent = multiDaySegment && !multiDaySegment.startsSegment ? "" : calendarEvent.title;

    chip.append(title);
    if (calendarEvent.readOnlyDeadline) {
      chip.classList.add("event-chip--deadline");
      chip.addEventListener("click", (event) => event.stopPropagation());
      return chip;
    }

    chip.addEventListener("pointerdown", (event) => startMonthEventDrag(event, calendarEvent));
    chip.addEventListener("click", (event) => {
      event.stopPropagation();
      if (interactionState.suppressNextMonthEventClick) {
        event.preventDefault();
        interactionState.suppressNextMonthEventClick = false;
        return;
      }
      setSelectedDate(fromDateKey(getEventDate(calendarEvent)));
      openEventDialog(getEventDate(calendarEvent), calendarEvent);
    });

    return chip;
  }

  function getMultiDaySegment(calendarEvent) {
    const durationDays = Number(calendarEvent.durationDays);
    if (calendarEvent.time || !Number.isInteger(durationDays) || durationDays <= 1) return null;

    const occurrenceDate = getEventDate(calendarEvent);
    const renderedDate = calendarEvent.renderedDate || occurrenceDate;
    const occurrenceEnd = shiftDateKey(occurrenceDate, durationDays - 1);
    const dayOfWeek = fromDateKey(renderedDate).getDay();
    return {
      startsSegment: renderedDate === occurrenceDate || dayOfWeek === 1,
      endsSegment: renderedDate === occurrenceEnd || dayOfWeek === 0,
    };
  }

  function shiftDateKey(dateKey, amount) {
    const date = fromDateKey(dateKey);
    date.setDate(date.getDate() + amount);
    return toDateKey(date);
  }

  function startMonthEventDrag(event, calendarEvent) {
    if (
      event.button !== 0
      || interactionState.activeMonthEventDrag
      || interactionState.activeMonthRangeDrag
      || interactionState.activeWeekEventDrag
      || interactionState.activeWeekRangeDrag
    ) return;
    if (!["month", "four-week"].includes(getCurrentView())) return;

    const sourceButton = event.currentTarget;
    const preview = document.createElement("div");
    preview.className = "month-event-drag-preview";
    preview.style.setProperty("--event-color", getCalendar(calendarEvent.calendar).color);
    const previewText = `${calendarEvent.time ? `${formatTime(calendarEvent.time)} · ` : ""}${calendarEvent.title}`;
    preview.textContent = previewText;
    preview.hidden = true;
    document.body.append(preview);

    interactionState.activeMonthEventDrag = {
      event: calendarEvent,
      sourceButton,
      preview,
      previewText,
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
    if (!interactionState.activeMonthEventDrag) return;

    const drag = interactionState.activeMonthEventDrag;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    drag.moved = drag.moved || distance > 4;
    if (!drag.moved) return;

    event.preventDefault();
    drag.sourceButton.classList.add("is-dragging");
    updateMonthEventDragPreview(drag, event);
  }

  function handleMonthEventDragEnd(event) {
    if (!interactionState.activeMonthEventDrag) return;

    const drag = interactionState.activeMonthEventDrag;
    if (drag.moved) updateMonthEventDragPreview(drag, event);
    const targetDateKey = drag.targetCell?.dataset.date || "";
    cleanupMonthEventDrag();

    if (!drag.moved) return;

    interactionState.suppressNextMonthEventClick = true;
    setTimeout(() => {
      interactionState.suppressNextMonthEventClick = false;
    }, 0);

    if (targetDateKey) {
      const updateEvent = isCopyDrag(event) ? copyEventOccurrence : moveEventOccurrence;
      updateEvent(drag.event, targetDateKey, drag.sourceTime);
    }
  }

  function cancelMonthEventDrag() {
    cleanupMonthEventDrag();
  }

  function cleanupMonthEventDrag() {
    if (interactionState.activeMonthEventDrag?.preview) interactionState.activeMonthEventDrag.preview.remove();
    if (interactionState.activeMonthEventDrag?.sourceButton) interactionState.activeMonthEventDrag.sourceButton.classList.remove("is-dragging");
    if (interactionState.activeMonthEventDrag?.targetCell) interactionState.activeMonthEventDrag.targetCell.classList.remove("day-cell--drag-over");
    interactionState.activeMonthEventDrag = null;
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
    drag.preview.textContent = `${isCopyDrag(event) ? "Copy · " : ""}${drag.previewText}`;
    drag.preview.style.left = `${event.clientX + 12}px`;
    drag.preview.style.top = `${event.clientY + 12}px`;
  }

  function getMonthDayCellAtPoint(clientX, clientY) {
    return document.elementFromPoint(clientX, clientY)?.closest?.(".day-cell[data-date]") ?? null;
  }

  return {
    render,
    createDayCell,
  };
}
