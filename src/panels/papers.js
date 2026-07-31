const STORAGE_DBLP_SEARCH_ENDPOINT = "academical.dblpSearchEndpoint.v1";
const DBLP_SEARCH_ENDPOINTS = [
  "https://dblp.uni-trier.de/search/publ/api",
  "https://dblp.org/search/publ/api",
];
const DBLP_REQUEST_TIMEOUT_MS = 15_000;
const PAPER_TAG_COLORS = ["blue", "green", "rebeccapurple", "darkorange", "teal", "crimson", "deeppink", "olive", "navy", "maroon"];

export function createPapersPanel({
  elements,
  getPaperTasks,
  setPaperTasks,
  savePaperTasks,
  getEvents,
  getVisibleCalendars,
  getActiveCalendars,
  getCalendars,
  getDefaultEventCalendarId,
  isPapersPanelActive,
  getOccurrenceDateTimeRange,
  createEventOccurrence,
  makeId,
  getNow,
  setSidebarPanel,
  showToast,
}) {
  let paperFilterQuery = "";
  let calendarReadAtByPaperId = new Map();
  let editingPaperTaskId = "";
  let activeEventPaperSnapshots = [];
  let activeDblpSearchController = null;
  let dblpSearchRequestId = 0;
  let dblpSearchState = null;

  function setFilterQuery(query) {
    paperFilterQuery = query;
  }

  function renderPaperTasks({ recalculateCalendar = isPapersPanelActive() } = {}) {
    if (recalculateCalendar) calendarReadAtByPaperId = getCalendarReadAtByPaperId();
    const isRead = (task) => task.done || calendarReadAtByPaperId.has(task.id);
    const isReadCalendarVisible = (task) => {
      const calendarRead = calendarReadAtByPaperId.get(task.id);
      return calendarRead ? Boolean(getVisibleCalendars()[calendarRead.calendar]) : isPaperTaskCalendarVisible(task);
    };
    const activeTasks = getPaperTasks()
      .filter((task) => isPaperTaskCalendarVisible(task) && !isRead(task) && paperMatchesFilter(task))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const readPapers = getPaperTasks()
      .filter((task) => isRead(task) && isReadCalendarVisible(task) && paperMatchesFilter(task))
      .sort((a, b) => {
        const readAtA = calendarReadAtByPaperId.get(a.id)?.readAt || a.readAt || a.createdAt;
        const readAtB = calendarReadAtByPaperId.get(b.id)?.readAt || b.readAt || b.createdAt;
        return readAtB.localeCompare(readAtA);
      });

    elements.paperTaskCount.textContent = activeTasks.length;
    elements.readPaperCount.textContent = readPapers.length;
    const activeEmptyText = paperFilterQuery ? "No matching paper tasks." : "No papers queued.";
    const readEmptyText = paperFilterQuery ? "No matching read papers." : "No papers read yet.";
    renderPaperTaskGroup(elements.paperTaskList, activeTasks, activeEmptyText);
    renderPaperTaskGroup(elements.readPaperList, readPapers, readEmptyText);
  }

  function isPaperTaskCalendarVisible(task) {
    return !task.calendar || Boolean(getVisibleCalendars()[task.calendar]);
  }

  function getCalendarReadAtByPaperId() {
    const assignmentByPaperId = new Map();

    getEvents().forEach((event) => {
      recordCalendarPaperAssignment(assignmentByPaperId, event, event.date);
      Object.entries(event.instanceOverrides ?? {}).forEach(([date, override]) => {
        recordCalendarPaperAssignment(assignmentByPaperId, { ...event, ...override }, date);
      });
    });

    return assignmentByPaperId;
  }

  function recordCalendarPaperAssignment(assignments, event, date) {
    const paperIds = new Set([
      ...(event.paperTaskIds ?? []),
      ...(event.papers ?? []).map((paper) => paper?.id),
    ]);
    const { start } = getOccurrenceDateTimeRange({ ...event, date, occurrenceDate: date });
    const readAt = start.toISOString();
    paperIds.forEach((paperId) => {
      if (!paperId) return;
      if (readAt > (assignments.get(paperId)?.readAt || "")) {
        assignments.set(paperId, { readAt, calendar: event.calendar });
      }
    });
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

    if (task.metadata?.absUrl) actions.append(createPaperLink("Abs", task.metadata.absUrl));
    if (task.metadata?.pdfUrl) actions.append(createPaperLink("PDF", task.metadata.pdfUrl));

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

  function openPaperModal(task = null) {
    editingPaperTaskId = task?.id ?? "";
    document.querySelector("#paperDialogTitle").textContent = task ? "Edit paper" : "Add paper";
    elements.paperModalFieldLabel.textContent = "Paper titles, arXiv URLs, or ACM DL URLs";
    elements.paperModalSubmit.textContent = task ? "Save" : "Add papers";
    elements.deletePaper.hidden = !task;
    elements.paperModalInput.value = "";
    elements.paperModalInputField.hidden = Boolean(task);
    elements.paperEditIdentity.hidden = !task;
    elements.paperEditTitle.textContent = task?.title ?? "";
    const sourceUrl = task?.metadata?.absUrl ?? "";
    elements.paperEditSource.hidden = !sourceUrl;
    elements.paperEditSource.href = sourceUrl;
    elements.paperEditSource.textContent = sourceUrl;
    elements.paperEditFields.hidden = !task;
    populatePaperCalendarSelect(task?.calendar);
    elements.paperNoteInput.value = task?.note ?? "";
    elements.paperTagsInput.value = Array.isArray(task?.tags) ? task.tags.join(", ") : "";
    renderPaperTagSuggestions();
    elements.paperModal.classList.add("is-open");
    elements.paperModal.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => (task ? elements.paperNoteInput : elements.paperModalInput).focus());
  }

  function closePaperModal() {
    editingPaperTaskId = "";
    elements.paperModal.classList.remove("is-open");
    elements.paperModal.setAttribute("aria-hidden", "true");
    elements.paperModalInput.value = "";
    elements.paperCalendarInput.replaceChildren();
    elements.paperNoteInput.value = "";
    elements.paperTagsInput.value = "";
    elements.paperEditFields.hidden = true;
    elements.paperEditIdentity.hidden = true;
    elements.paperEditSource.hidden = true;
    elements.paperTagSuggestions.hidden = true;
    elements.paperTagSuggestionList.replaceChildren();
    elements.paperModalInputField.hidden = false;
    elements.deletePaper.hidden = true;
  }

  function populatePaperCalendarSelect(selectedCalendarId = "") {
    const activeCalendars = getActiveCalendars();
    const selectedCalendar = getCalendars().find((calendar) => calendar.id === selectedCalendarId);
    const options = selectedCalendar && !activeCalendars.some((calendar) => calendar.id === selectedCalendar.id)
      ? [...activeCalendars, selectedCalendar]
      : activeCalendars;
    elements.paperCalendarInput.replaceChildren(...options.map((calendar) => {
      const option = document.createElement("option");
      option.value = calendar.id;
      option.textContent = calendar.name;
      return option;
    }));
    elements.paperCalendarInput.disabled = options.length === 0;
    elements.paperCalendarInput.value = options.some((calendar) => calendar.id === selectedCalendarId)
      ? selectedCalendarId
      : getDefaultEventCalendarId();
  }

  function renderPaperTagSuggestions() {
    const seen = new Set();
    const tags = getPaperTasks()
      .flatMap((task) => (Array.isArray(task.tags) ? task.tags : []))
      .filter((tag) => {
        const key = tag.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b));

    elements.paperTagSuggestions.hidden = !editingPaperTaskId || !tags.length;
    elements.paperTagSuggestionList.replaceChildren(...tags.map(createPaperTagSuggestion));
  }

  function createPaperTagSuggestion(tag) {
    const button = document.createElement("button");
    button.className = "paper-tag-suggestion";
    button.type = "button";
    button.textContent = tag;
    button.style.setProperty("--paper-tag-color", getPaperTagColor(tag));
    button.addEventListener("click", () => {
      const tags = parsePaperTags(elements.paperTagsInput.value);
      if (!tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) tags.push(tag);
      elements.paperTagsInput.value = tags.join(", ");
      elements.paperTagsInput.focus();
    });
    return button;
  }

  function deleteEditingPaperTask() {
    if (!editingPaperTaskId) return;
    setPaperTasks(getPaperTasks().filter((task) => task.id !== editingPaperTaskId));
    savePaperTasks();
    renderPaperTasks();
    closePaperModal();
    showToast("Paper deleted");
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

    const existingKeys = new Set(getPaperTasks().map((task) => getPaperTaskKey(task)));
    const createdAt = new Date().toISOString();
    const calendar = getDefaultEventCalendarId();
    const newTasks = [];

    let resolvedPapers;
    try {
      resolvedPapers = await Promise.all(inputs.map(resolvePaperMetadata));
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = "Add papers";
      if (error?.status === 429) {
        showToast("arXiv is rate limiting requests. Paper not added; try again later.");
        return;
      }
      throw error;
    }

    for (const [index, paperInput] of inputs.entries()) {
      const metadata = resolvedPapers[index];
      const title = metadata?.title ?? paperInput;
      const task = {
        id: makeId(),
        title,
        done: false,
        calendar,
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

    setPaperTasks([...getPaperTasks(), ...newTasks]);
    input.value = "";
    if (form === elements.paperModalForm) closePaperModal();
    savePaperTasks();
    renderPaperTasks();
    setSidebarPanel("papers");
    showToast(`${newTasks.length} paper${newTasks.length === 1 ? "" : "s"} added`);
  }

  async function saveEditedPaperTask(form) {
    const taskIndex = getPaperTasks().findIndex((task) => task.id === editingPaperTaskId);
    if (taskIndex < 0) return;

    const submitButton = form.querySelector("button[type='submit']");
    submitButton.disabled = true;
    submitButton.textContent = "Saving...";

    const nextTasks = [...getPaperTasks()];
    nextTasks[taskIndex] = {
      ...nextTasks[taskIndex],
      calendar: elements.paperCalendarInput.value,
      note: elements.paperNoteInput.value.trim(),
      tags: parsePaperTags(elements.paperTagsInput.value),
    };
    setPaperTasks(nextTasks);
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
        if (!response.ok) {
          const error = new Error(`Metadata request failed (${response.status})`);
          error.status = response.status;
          throw error;
        }
        return parseArxivMetadata(await response.text(), fallback);
      }

      url.searchParams.set("doi", fallback.doi);
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Metadata request failed (${response.status})`);
      return parseAcmMetadata(await response.json(), fallback);
    } catch (error) {
      const identifier = fallback.arxivId || fallback.doi;
      console.warn(`Could not load paper metadata for ${identifier}:`, error);
      if (fallback.arxivId && error?.status === 429) throw error;
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
    return getPaperTasks()
      .filter((task) => !task.done && task.title.trim().toLowerCase() === readTitle)
      .map((task) => task.id);
  }

  function getPaperSnapshot(task) {
    return {
      id: task.id,
      title: task.title,
      calendar: task.calendar ?? getDefaultEventCalendarId(),
      metadata: task.metadata ?? null,
    };
  }

  function getExistingEventPaperSnapshots(event) {
    const snapshots = Array.isArray(event?.papers) ? event.papers : [];
    const snapshotIds = new Set(snapshots.map((paper) => paper.id));
    const idMatches = (event?.paperTaskIds ?? [])
      .filter((id) => !snapshotIds.has(id))
      .map((id) => getPaperTasks().find((task) => task.id === id))
      .filter(Boolean)
      .map(getPaperSnapshot);
    return [...snapshots, ...idMatches];
  }

  function setActiveEventPaperSnapshots(snapshots) {
    activeEventPaperSnapshots = Array.isArray(snapshots) ? snapshots : [];
  }

  function getEventPaperAssignmentCandidates() {
    const candidatesById = new Map(
      activeEventPaperSnapshots
        .filter((paper) => paper?.id)
        .map((paper) => [paper.id, paper]),
    );
    getPaperTasks()
      .filter((task) => !task.done)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(getPaperSnapshot)
      .forEach((paper) => candidatesById.set(paper.id, paper));
    return [...candidatesById.values()];
  }

  function renderEventPaperAssignment(selectedIds = []) {
    const selectedSet = new Set(selectedIds);
    const showAssignment = isReadEventTitle(elements.eventTitle.value);
    elements.eventPaperAssignment.hidden = !showAssignment;

    if (!showAssignment) {
      elements.eventPaperAssignmentList.replaceChildren();
      elements.eventPaperAssignmentCount.textContent = "0 selected";
      return;
    }

    const candidates = getEventPaperAssignmentCandidates();
    if (!candidates.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No paper tasks yet. Press P to add papers.";
      elements.eventPaperAssignmentList.replaceChildren(empty);
      elements.eventPaperAssignmentCount.textContent = "0 selected";
      return;
    }

    elements.eventPaperAssignmentList.replaceChildren(
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
    return [...elements.eventPaperAssignmentList.querySelectorAll("input[type='checkbox']:checked")].map((input) => input.value);
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
    const nextTasks = getPaperTasks().map((task) => {
      if (!selectedById.has(task.id) || task.done) return task;
      changed = true;
      return { ...task, done: true, readAt };
    });
    setPaperTasks(nextTasks);

    const existingIds = new Set(nextTasks.map((task) => task.id));
    const added = [...selectedById.values()]
      .filter((paper) => !existingIds.has(paper.id))
      .map((paper, index) => ({
        id: paper.id,
        title: paper.title,
        calendar: paper.calendar ?? getDefaultEventCalendarId(),
        metadata: paper.metadata ?? null,
        done: true,
        readAt,
        createdAt: `${readAt}-assigned-${index}`,
      }));

    if (added.length) {
      setPaperTasks([...nextTasks, ...added]);
      changed = true;
    }
    return changed;
  }

  function restorePapersToTasks(papers) {
    const restoredIds = new Set(papers.filter((paper) => paper?.id).map((paper) => paper.id));
    let changed = false;
    const nextTasks = getPaperTasks().map((task) => {
      if (!restoredIds.has(task.id) || !task.done) return task;
      changed = true;
      const { readAt, ...restoredTask } = task;
      return { ...restoredTask, done: false };
    });
    setPaperTasks(nextTasks);

    const existingIds = new Set(nextTasks.map((task) => task.id));
    const added = papers
      .filter((paper) => paper?.id && !existingIds.has(paper.id))
      .map((paper, index) => ({
        id: paper.id,
        title: paper.title,
        calendar: paper.calendar ?? getDefaultEventCalendarId(),
        metadata: paper.metadata ?? null,
        done: false,
        createdAt: `${new Date().toISOString()}-restored-${index}`,
      }));

    if (added.length) {
      setPaperTasks([...nextTasks, ...added]);
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
    elements.eventPaperAssignmentCount.textContent = `${count} selected`;
  }

  function getPaperTagColor(label) {
    const hash = [...label.toLowerCase()].reduce((value, character) => ((value * 31) + character.codePointAt(0)) >>> 0, 0);
    return PAPER_TAG_COLORS[hash % PAPER_TAG_COLORS.length];
  }

  function openDblpSearchModal() {
    elements.dblpSearchModal.classList.add("is-open");
    elements.dblpSearchModal.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => elements.dblpSearchInput.focus());
  }

  function closeDblpSearchModal() {
    activeDblpSearchController?.abort();
    activeDblpSearchController = null;
    dblpSearchRequestId += 1;
    elements.dblpSearchModal.classList.remove("is-open");
    elements.dblpSearchModal.setAttribute("aria-hidden", "true");
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
    elements.dblpLoadMore.disabled = true;
    elements.dblpLoadMore.textContent = "Loading…";

    try {
      const { query, years, hits } = dblpSearchState;
      const result = await fetchDblpPage(query, years, hits.length, controller.signal);
      if (requestId !== dblpSearchRequestId) return;
      dblpSearchState.hits.push(...result.hits);
      dblpSearchState.totalMatches = result.totalMatches;
      renderDblpSearchResults(dblpSearchState.hits, result.totalMatches, years.at(-1), years[0]);
    } catch (error) {
      if (error.name === "AbortError" || requestId !== dblpSearchRequestId) return;
      console.warn("Could not load more DBLP results:", error);
      elements.dblpLoadMore.textContent = "Retry load more";
    } finally {
      if (requestId === dblpSearchRequestId) {
        activeDblpSearchController = null;
        elements.dblpLoadMore.disabled = false;
        if (elements.dblpLoadMore.textContent === "Loading…") elements.dblpLoadMore.textContent = "Load more";
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
    elements.dblpSearchCount.hidden = false;
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
    elements.dblpSearchCount.textContent = `${loadedLabel}${preferredLabel}${matchesLabel}${yearLabel}`;
    elements.dblpLoadMore.hidden = hits.length >= totalMatches;
    elements.dblpLoadMore.disabled = false;
    elements.dblpLoadMore.textContent = "Load more";
    if (!hits.length) {
      renderDblpSearchMessage("No matching publications.", false, true);
      return;
    }

    elements.dblpSearchResults.replaceChildren(
      ...preferredHits.map(({ hit }) => createDblpSearchResult(hit, true)),
      ...otherHits.map(({ hit }) => createDblpSearchResult(hit)),
    );
    elements.dblpSearchResults.setAttribute("aria-busy", "false");
  }

  function renderDblpSearchMessage(text, busy = false, keepCount = false) {
    if (!keepCount) {
      elements.dblpSearchCount.hidden = true;
      elements.dblpSearchCount.textContent = "";
    }
    const message = document.createElement("p");
    message.className = "empty-state";
    message.textContent = text;
    elements.dblpSearchResults.replaceChildren(message);
    elements.dblpSearchResults.setAttribute("aria-busy", String(busy));
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
    return elements.dblpPreferredVenuesInput.value
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
    if (preferredVenue === "FSE" && /^(ESEC\/)?SIGSOFT FSE$/.test(venue)) return true;
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

  return {
    renderPaperTasks,
    setFilterQuery,
    openPaperModal,
    closePaperModal,
    addPaperTasksFromInput,
    deleteEditingPaperTask,
    openDblpSearchModal,
    closeDblpSearchModal,
    searchDblp,
    loadMoreDblpResults,
    setActiveEventPaperSnapshots,
    getExistingEventPaperSnapshots,
    isReadEventTitle,
    inferPaperTaskIdsFromEvent,
    getEventPaperAssignmentCandidates,
    renderEventPaperAssignment,
    getSelectedEventPaperIds,
    getSelectedEventPapers,
    getReadEventTitleForPapers,
    markAssignedPapersAsRead,
    restorePapersToTasks,
    getAssignedPapersForOccurrence,
    getAllAssignedPapersInSeries,
  };
}
