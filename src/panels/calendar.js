export function createCalendarPanel({
  elements,
  getActiveCalendars,
  getAvailableCalendars,
  getCalendars,
  getArchivedCalendars,
  getVisibleCalendars,
  setVisibleCalendars,
  persistCalendarVisibility,
  openEditCalendarModal,
  archiveCalendar,
  restoreArchivedCalendar,
  deleteArchivedCalendar,
  reorderCalendars,
  escapeHtml,
}) {
  let archivedCalendarsExpanded = false;
  let draggedCalendarId = "";

  function renderCalendarToggles() {
    const activeCalendars = getActiveCalendars();

    if (!activeCalendars.length) {
      const empty = document.createElement("p");
      empty.className = "calendar-empty";
      empty.textContent = "No active calendars.";
      elements.calendarToggles.replaceChildren(empty);
      return;
    }

    elements.calendarToggles.replaceChildren(
      ...activeCalendars.map(createCalendarToggleRow)
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
      <input type="checkbox" ${getVisibleCalendars()[calendar.id] ? "checked" : ""} data-calendar="${calendar.id}" />
      <span class="calendar-dot" style="--calendar-color: ${calendar.color}"></span>
      <span class="calendar-name" title="Double-click to rename">${escapeHtml(calendar.name)}</span>
    `;
    label.querySelector("input").addEventListener("change", (event) => {
      getVisibleCalendars()[calendar.id] = event.target.checked;
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
    elements.archivedCalendarsSection.hidden = archivedCalendars.length === 0;
    elements.archivedCalendarList.hidden = !archivedCalendarsExpanded;
    elements.archivedCalendarsToggle.setAttribute("aria-expanded", String(archivedCalendarsExpanded));
    elements.archivedCalendarsCaret.textContent = archivedCalendarsExpanded ? "⌄" : "›";

    elements.archivedCalendarList.replaceChildren(
      ...archivedCalendars.map((calendar) => {
        const item = document.createElement("div");
        item.className = "archived-calendar-item";

        const label = document.createElement("label");
        label.className = "calendar-toggle archived-calendar-toggle";
        label.innerHTML = `
          <input type="checkbox" ${getVisibleCalendars()[calendar.id] ? "checked" : ""} data-calendar="${calendar.id}" />
          <span class="calendar-dot" style="--calendar-color: ${calendar.color}"></span>
          <span class="calendar-name">${escapeHtml(calendar.name)}</span>
        `;
        label.querySelector("input").addEventListener("change", (event) => {
          getVisibleCalendars()[calendar.id] = event.target.checked;
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
    elements.calendarToggles.querySelectorAll(".calendar-toggle-row").forEach((row) => {
      row.classList.remove("is-dragging", "is-drag-over");
    });
  }

  function selectAllCalendars() {
    const availableIds = new Set(getAvailableCalendars().map((calendar) => calendar.id));
    setVisibleCalendars(Object.fromEntries(getCalendars().map((calendar) => [calendar.id, availableIds.has(calendar.id)])));
    persistCalendarVisibility("All calendars selected");
  }

  function soloCalendar(index) {
    const activeCalendars = getActiveCalendars();
    const calendar = activeCalendars[index];
    if (!calendar) return;
    setVisibleCalendars(Object.fromEntries(getCalendars().map((item) => [item.id, item.id === calendar.id])));
    persistCalendarVisibility(`${calendar.name} calendar selected`);
  }

  function bindEvents() {
    elements.archivedCalendarsToggle.addEventListener("click", toggleArchivedCalendars);
  }

  return {
    bindEvents,
    renderCalendarToggles,
    renderArchivedCalendars,
    toggleArchivedCalendars,
    renderAll() {
      renderCalendarToggles();
      renderArchivedCalendars();
    },
    selectAllCalendars,
    soloCalendar,
  };
}
