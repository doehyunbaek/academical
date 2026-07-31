export function createFourWeekCalendar({ elements, getMainCalendarDates, createDayCell }) {
  function render() {
    elements.monthGrid.replaceChildren(...getMainCalendarDates().map(createDayCell));
  }

  return { render };
}
