const STORAGE_DEADLINE_FILTER_TAGS = "academical.deadlineFilterTags.v1";
const STORAGE_SELECTED_DEADLINES = "academical.selectedDeadlines.v1";
const STORAGE_DEADLINE_UPDATE_PREFIX = "academical.deadlineUpdate.v1";
const DEADLINE_UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DEADLINE_TYPES = [
  { name: "ICSE", tag: "ICSE", type: "venue" },
  { name: "FSE", tag: "FSE", type: "venue" },
  { name: "ASE", tag: "ASE", type: "venue" },
  { name: "ISSTA", tag: "ISSTA", type: "venue" },
  { name: "OOPSLA", tag: "OOPSLA", type: "venue" },
];

export function createDeadlinesPanel({
  elements,
  getNow,
  getVisibleCalendars,
  saveVisibleCalendars,
  renderCalendarToggles,
  renderCalendar,
  escapeHtml,
}) {
  let deadlineConferences = [];
  let deadlineFilterTags = loadDeadlineFilterTags();
  let selectedDeadlineIds = loadSelectedDeadlineIds();

  async function loadDeadlineConferences() {
    try {
      const response = await fetch("./deadlines.json");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      deadlineConferences = Array.isArray(data) ? data : [];
      renderDeadlinePanel();
      renderCalendar();
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
      renderCalendar();
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
    if (!elements.deadlinePanel) return;
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
    elements.deadlinePanel.replaceChildren(view);
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
      getVisibleCalendars().deadlines = true;
      saveVisibleCalendars();
      renderCalendarToggles();
    } else {
      selected.delete(id);
    }
    selectedDeadlineIds = [...selected];
    saveSelectedDeadlineIds();
    renderCalendar();
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

  function getCalendarEvents(events) {
    return [...events, ...getSelectedDeadlineEvents()];
  }

  function updateDeadlineTimers() {
    elements.deadlinePanel?.querySelectorAll(".deadline-countdown[data-deadline-at]").forEach((item) => {
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

  function saveSelectedDeadlineIds() {
    localStorage.setItem(STORAGE_SELECTED_DEADLINES, JSON.stringify(selectedDeadlineIds));
  }

  function loadSelectedDeadlineIds() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_SELECTED_DEADLINES) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }

  function saveDeadlineFilterTags() {
    localStorage.setItem(STORAGE_DEADLINE_FILTER_TAGS, JSON.stringify(deadlineFilterTags));
  }

  function loadDeadlineFilterTags() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_DEADLINE_FILTER_TAGS) || "[]");
      return Array.isArray(saved) ? saved.filter(isValidDeadlineFilterTag) : [];
    } catch {
      return [];
    }
  }

  function isValidDeadlineFilterTag(tag) {
    return DEADLINE_TYPES.some((type) => type.tag === tag);
  }

  return {
    loadDeadlineConferences,
    renderDeadlinePanel,
    getSelectedDeadlineEvents,
    getCalendarEvents,
    updateDeadlineTimers,
  };
}
