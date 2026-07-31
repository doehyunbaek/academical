export function createAnalysisPanel({
  elements,
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
  activityCategories,
}) {
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

    const cumulativeTotals = Object.fromEntries(activityCategories.map(({ key }) => [key, 0]));
    return [...byWeek.values()]
      .sort((a, b) => a.week.localeCompare(b.week))
      .map((row) => {
        const cumulativeRow = { week: row.week, label: row.label };
        activityCategories.forEach(({ key }) => {
          cumulativeTotals[key] += row[key] || 0;
          cumulativeRow[key] = cumulativeTotals[key];
        });
        return cumulativeRow;
      });
  }

  function getActivityCategory(title = "") {
    const prefix = title.split(":")[0].trim().toLowerCase();
    return activityCategories.some(({ key }) => key === prefix) ? prefix : "";
  }

  function renderSidebarTimeAnalysis() {
    const analysis = getCurrentViewTimeAnalysis();
    if (!analysis.occurrences.length) {
      elements.sidebarTimeAnalysisEmpty.hidden = false;
      elements.sidebarTimeAnalysisContent.hidden = true;
      elements.sidebarTimeAnalysisList.replaceChildren();
      elements.weeklyActivityChart.hidden = true;
      elements.weeklyActivityChartBody.replaceChildren();
      return;
    }

    elements.sidebarTimeAnalysisEmpty.hidden = true;
    elements.sidebarTimeAnalysisContent.hidden = false;
    elements.sidebarTimeAnalysisRange.textContent = analysis.rangeLabel;
    elements.sidebarTimeAnalysisSummary.textContent = `${analysis.occurrences.length} occurrence${analysis.occurrences.length === 1 ? "" : "s"} · ${formatHours(analysis.totalHours)}`;
    renderWeeklyActivityChart(analysis.weeklyActivity, analysis.weeklyHours);
    elements.sidebarTimeAnalysisList.replaceChildren(
      ...analysis.occurrences.map((occurrence) => {
        const item = document.createElement("div");
        item.className = "time-analysis-item";
        item.innerHTML = `<span>${escapeHtml(occurrence.label)}</span>`;
        return item;
      })
    );
  }

  function renderWeeklyActivityChart(activityData, weeklyHoursData = []) {
    elements.weeklyActivityChart.hidden = false;
    elements.weeklyActivityChartBody.replaceChildren();

    if (!weeklyHoursData.length) {
      const empty = document.createElement("p");
      empty.className = "weekly-activity-chart-empty";
      empty.textContent = "No worked hours in this range.";
      elements.weeklyActivityChartBody.append(empty);
      return;
    }

    const hoursPanel = document.createElement("section");
    hoursPanel.className = "time-analysis-chart-panel";
    hoursPanel.setAttribute("aria-label", "Working hours per week chart");
    hoursPanel.append(createWeeklyHoursChart(weeklyHoursData));
    elements.weeklyActivityChartBody.append(hoursPanel);

    if (activityData.length) {
      const activityPanel = document.createElement("section");
      activityPanel.className = "time-analysis-chart-panel";
      activityPanel.setAttribute("aria-label", "Cumulative activity categories chart");

      const activityHeading = document.createElement("h4");
      activityHeading.className = "weekly-activity-chart-subheading";
      activityHeading.textContent = "Cumulative activity categories";
      activityPanel.append(activityHeading, createWeeklyActivityChart(activityData), createWeeklyActivityLegend());
      elements.weeklyActivityChartBody.append(activityPanel);
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
    const maxHours = Math.max(1, ...data.flatMap((row) => activityCategories.map(({ key }) => row[key] || 0)));
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

    activityCategories.forEach(({ key, label, color }) => {
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
        ${activityCategories.map(({ key, label, color }) => `
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
      ...activityCategories.map(({ key, label, color }) => {
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

  return {
    getCurrentViewTimeAnalysis,
    renderSidebarTimeAnalysis,
  };
}
