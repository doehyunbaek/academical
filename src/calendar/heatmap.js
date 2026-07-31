export function createHeatmapCalendar({
  elements,
  getHeatmapRangeMode,
  getSelectedDate,
  getHeatmapAnchorDate,
  setSelectedDate,
  getToday,
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
  weekStartDay = 1,
  renderApp,
}) {
  let detailsAnchor = null;

  function getDateRange() {
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

    const rangeMode = getHeatmapRangeMode();
    if (rangeMode === "year") {
      const rangeEnd = startOfDay(getHeatmapAnchorDate());
      return {
        start: addYears(rangeEnd, -1),
        end: rangeEnd,
        hasEvents: true,
        mode: rangeMode,
      };
    }

    const visibleEventDates = getCalendarEvents()
      .filter((event) => isEventVisible(event))
      .flatMap((event) => [event.date, getEventRangeEndDateKey(event)]);

    if (!visibleEventDates.length) {
      const selectedDate = startOfDay(getSelectedDate());
      return { start: selectedDate, end: selectedDate, hasEvents: false, mode: rangeMode };
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

    const selectedDate = startOfDay(getSelectedDate());
    return firstEventDate
      ? { start: firstEventDate, end: lastEventDate, hasEvents: true, mode: rangeMode }
      : { start: selectedDate, end: selectedDate, hasEvents: false, mode: rangeMode };
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

  function render() {
    const { start: rangeStart, end: rangeEnd, hasEvents, mode } = getDateRange();
    const dayCount = Math.max(1, Math.round((startOfDay(rangeEnd) - startOfDay(rangeStart)) / 86_400_000) + 1);
    const leadingBlankDays = (rangeStart.getDay() - weekStartDay + 7) % 7;
    const weekCount = Math.max(1, Math.ceil((leadingBlankDays + dayCount) / 7));
    const dates = makeDateRange(rangeStart, dayCount);
    const hoursByDate = new Map(dates.map((date) => {
      const dateKey = toDateKey(date);
      return [dateKey, hasEvents ? getWorkedHoursForDate(dateKey) : 0];
    }));
    const totalHours = [...hoursByDate.values()].reduce((total, hours) => total + hours, 0);
    const activeDays = [...hoursByDate.values()].filter(Boolean).length;
    const maxHours = Math.max(0, ...hoursByDate.values());
    const selectedDay = startOfDay(getSelectedDate());
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
        isSameDay(date, getToday()) ? "heatmap-day--today" : "",
      ].filter(Boolean).join(" ");
      day.type = "button";
      day.dataset.date = dateKey;
      day.dataset.level = String(getHeatmapIntensityLevel(hours));
      day.dataset.hours = String(hours);
      day.title = `${longDateFormatter.format(date)} · ${formatHours(hours)} worked`;
      day.setAttribute("aria-label", day.title);
      day.addEventListener("click", (event) => {
        setSelectedDate(new Date(date));
        detailsAnchor = getDetailsAnchor(event);
        renderApp();
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

    if (detailsAnchor) {
      const details = createDetails(selectedHeatmapDate, { popover: true });
      heatmap.append(details);
      positionDetails(details, detailsAnchor);
    }

    elements.monthGrid.replaceChildren(heatmap);
  }

  function getDetailsAnchor(event) {
    const targetRect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX || targetRect.left + targetRect.width / 2;
    const y = event.clientY || targetRect.top + targetRect.height / 2;
    return { x, y };
  }

  function positionDetails(details, anchor) {
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

  function createDetails(date, { popover = false } = {}) {
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

  return {
    render,
    getDateRange,
    clearDetails() {
      detailsAnchor = null;
    },
    hasDetails() {
      return Boolean(detailsAnchor);
    },
  };
}
