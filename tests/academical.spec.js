const { test, expect } = require('@playwright/test');

const openCreateEventDialog = async (page, date = '2026-07-02') => {
  await page.locator(`.day-cell[data-date="${date}"] .day-add`).click();
};

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-07-03T09:30:00'));
});

test('calendar loads with Firebase sync UI', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#monthTitle')).toBeVisible();
  await expect(page.locator('#accountButton')).toBeVisible();
  await expect(page.locator('#syncStatus')).toBeHidden();
  await expect(page.locator('#createEventButton')).toHaveCount(0);
  await expect(page.locator('.right-rail')).toHaveCount(0);
});

test('today marker follows the actual current date', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#brandDay')).toHaveText('3');
  await expect(page.locator('.day-cell[data-date="2026-07-03"]')).toHaveClass(/day-cell--today/);
  await expect(page.locator('.day-cell[data-date="2026-07-02"]')).not.toHaveClass(/day-cell--today/);
});

test('account avatar opens sync dropdown and uses generic icon', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#accountPopover')).toBeHidden();
  await page.locator('#accountButton').click();
  await expect(page.locator('#accountPopover')).toBeVisible();
  await expect(page.locator('#syncAuthButton')).toBeVisible();
  await expect(page.locator('#userAvatar svg')).toBeVisible();
  await expect(page.locator('#userAvatar')).not.toContainText('DB');
});

test('weeks start on Monday in month and week views', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.weekday-row span').first()).toHaveText('Mon');
  await expect(page.locator('.day-cell')).toHaveCount(35);
  await expect(page.locator('.day-cell').first().locator('.day-number')).toHaveText('29');
  await expect(page.locator('.day-cell[data-date="2026-08-03"]')).toHaveCount(0);
  await page.keyboard.press('2');
  await expect(page.locator('#monthTitle')).toHaveText('Jun 29 – Jul 5, 2026');
  await expect(page.locator('.week-day-header').first().locator('.week-day-header-weekday')).toHaveText('Mon');
});

test('keyboard shortcuts switch views and navigate periods', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('1');
  await expect(page.locator('#viewSelect')).toHaveValue('deadlines');
  await expect(page.locator('#monthTitle')).toHaveText('Deadlines');
  await expect(page.locator('.deadline-view')).toBeVisible();
  await page.keyboard.press('2');
  await expect(page.locator('#viewSelect')).toHaveValue('week');
  await expect(page.locator('#monthTitle')).toHaveText('Jun 29 – Jul 5, 2026');
  await page.keyboard.press('j');
  await expect(page.locator('#monthTitle')).toHaveText('July 6 – 12, 2026');
  await page.keyboard.press('4');
  await expect(page.locator('#viewSelect')).toHaveValue('four-week');
  await page.keyboard.press('5');
  await expect(page.locator('#viewSelect')).toHaveValue('heatmap');
  await expect(page.locator('body')).toHaveClass(/view-heatmap/);
  await expect(page.locator('#monthTitle')).toHaveText('July 1 – 31, 2026');
  await page.keyboard.press('3');
  await expect(page.locator('#viewSelect')).toHaveValue('month');
});

test('four-week range title stays inline beside nav carets on compact header', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto('/');
  await page.locator('.day-cell[data-date="2026-07-06"]').click();
  await page.locator('#viewSelect').selectOption('four-week');

  await expect(page.locator('#monthTitle')).toHaveText('Jul 6 – Aug 2, 2026');
  const navBox = await page.locator('.nav-buttons').boundingBox();
  const titleBox = await page.locator('#monthTitle').boundingBox();
  const titleMetrics = await page.locator('#monthTitle').evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(navBox).not.toBeNull();
  expect(titleBox).not.toBeNull();
  expect(Math.abs(titleBox.y - navBox.y)).toBeLessThan(12);
  expect(titleBox.x).toBeGreaterThanOrEqual(navBox.x + navBox.width - 4);
  expect(titleMetrics.clientWidth).toBeGreaterThanOrEqual(titleMetrics.scrollWidth);
});

test('deadline view internalizes deadlines app entries', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('1');

  await expect(page.locator('#viewSelect')).toHaveValue('deadlines');
  await expect(page.locator('.weekday-row')).toBeHidden();
  await expect(page.locator('.deadline-view-header')).toContainText('Research venue deadlines');
  await expect(page.locator('.deadline-card')).toHaveCount(11);
  await expect(page.locator('.deadline-card').first()).toContainText('ICSE 2027');
  await expect(page.locator('.deadline-card').first()).toContainText('Deadline:');
  await expect(page.locator('.deadline-timezone').first()).toHaveText('AoE / UTC-12');
  await expect(page.locator('input[data-deadline-filter-tag="CO"]')).not.toBeChecked();
  await expect(page.locator('input[data-deadline-filter-tag="RPT"]')).not.toBeChecked();
});

test('deadline view filters by selected tags and persists the selection', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('1');

  await page.locator('input[data-deadline-filter-tag="JO"]').check();
  await expect(page.locator('.deadline-card')).toHaveCount(0);
  await expect(page.locator('.deadline-empty')).toContainText('No deadlines match');

  await page.locator('input[data-deadline-filter-tag="JO"]').uncheck();
  await page.locator('input[data-deadline-filter-tag="CO"]').check();
  await expect(page.locator('.deadline-card')).toHaveCount(11);

  await page.reload();
  await page.keyboard.press('1');
  await expect(page.locator('input[data-deadline-filter-tag="CO"]')).toBeChecked();
  await expect(page.locator('.deadline-card')).toHaveCount(11);
});

test('heatmap view renders one square per day with worked-hour intensity', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('5');

  await expect(page.locator('#viewSelect')).toHaveValue('heatmap');
  await expect(page.locator('.weekday-row')).toBeHidden();
  await expect(page.locator('#monthTitle')).toHaveText('July 1 – 31, 2026');
  await expect(page.locator('.heatmap-day')).toHaveCount(31);
  await expect(page.locator('.heatmap-day[data-date="2026-07-01"]')).toHaveAttribute('data-hours', '1');
  await expect(page.locator('.heatmap-day[data-date="2026-07-01"]')).toHaveAttribute('data-level', '1');
  await expect(page.locator('.heatmap-day[data-date="2026-07-03"]')).toHaveAttribute('data-hours', '0');
  await expect(page.locator('.heatmap-day[data-date="2026-07-03"]')).toHaveAttribute('data-level', '0');

  await expect(page.locator('.heatmap-details')).toHaveCount(0);
  await page.locator('.heatmap-day[data-date="2026-07-01"]').click();
  await expect(page.locator('.heatmap-details')).toHaveClass(/heatmap-details--popover/);
  await expect(page.locator('.heatmap-details')).toHaveCSS('position', 'fixed');
  await expect(page.locator('.heatmap-details')).toContainText('Wednesday, July 1, 2026');
  await expect(page.locator('.heatmap-details')).toContainText('1h worked');
  await expect(page.locator('.heatmap-details')).toContainText('CS seminar prep');
  await expect(page.locator('.heatmap-details')).toContainText('9 AM · Teaching · 1h');
});

test('calendar filter shortcuts select all or solo first four calendars', async ({ page }) => {
  await page.goto('/');

  await page.keyboard.press('q');
  await expect(page.locator('input[data-calendar="teaching"]')).toBeChecked();
  await expect(page.locator('input[data-calendar="research"]')).not.toBeChecked();
  await expect(page.locator('.event-chip').filter({ hasText: 'CS seminar prep' })).toBeVisible();
  await expect(page.locator('.event-chip').filter({ hasText: 'Reading group' })).toHaveCount(0);

  await page.keyboard.press('w');
  await expect(page.locator('input[data-calendar="teaching"]')).not.toBeChecked();
  await expect(page.locator('input[data-calendar="research"]')).toBeChecked();
  await expect(page.locator('.event-chip').filter({ hasText: 'Reading group' })).toBeVisible();

  await page.keyboard.press('e');
  await expect(page.locator('input[data-calendar="deadlines"]')).toBeChecked();
  await expect(page.locator('input[data-calendar="research"]')).not.toBeChecked();
  await expect(page.locator('.event-chip').filter({ hasText: 'Grant draft due' })).toBeVisible();

  await page.keyboard.press('r');
  await expect(page.locator('input[data-calendar="personal"]')).toBeChecked();
  await expect(page.locator('input[data-calendar="deadlines"]')).not.toBeChecked();

  await page.keyboard.press('a');
  await expect(page.locator('#calendarToggles input[type="checkbox"]')).toHaveCount(5);
  for (const id of ['teaching', 'research', 'deadlines', 'personal', 'tasks']) {
    await expect(page.locator(`input[data-calendar="${id}"]`)).toBeChecked();
  }
});

test('hover cross button archives one calendar and collapsed archive section can restore it', async ({ page }) => {
  await page.goto('/');

  const teachingRow = page.locator('.calendar-toggle-row').filter({ hasText: 'Teaching' });
  const archiveTeaching = page.getByRole('button', { name: 'Archive Teaching calendar' });
  await expect(archiveTeaching).toBeHidden();
  await teachingRow.hover();
  await expect(archiveTeaching).toBeVisible();
  await archiveTeaching.click();

  await expect(page.locator('#calendarToggles input[data-calendar="teaching"]')).toHaveCount(0);
  await expect(page.locator('#calendarToggles input[data-calendar="research"]')).toBeChecked();
  await expect(page.locator('#archivedCalendarsSection')).toBeVisible();
  await expect(page.locator('#archivedCalendarList')).toBeHidden();
  await expect(page.locator('.event-chip').filter({ hasText: 'CS seminar prep' })).toHaveCount(0);
  await expect(page.locator('.event-chip').filter({ hasText: 'Reading group' })).toBeVisible();

  await page.locator('#archivedCalendarsToggle').click();
  await expect(page.locator('#archivedCalendarList')).toBeVisible();
  await expect(page.locator('.archived-calendar-item')).toHaveCount(1);
  await expect(page.locator('#archivedCalendarList input[data-calendar="teaching"]')).not.toBeChecked();
  await page.locator('#archivedCalendarList input[data-calendar="teaching"]').check();
  await expect(page.locator('.event-chip').filter({ hasText: 'CS seminar prep' })).toBeVisible();
  await page.locator('#archivedCalendarList input[data-calendar="teaching"]').uncheck();
  await expect(page.locator('.event-chip').filter({ hasText: 'CS seminar prep' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Restore Teaching calendar' }).click();
  await expect(page.locator('input[data-calendar="teaching"]')).toBeChecked();
  await expect(page.locator('#archivedCalendarsSection')).toBeHidden();
  await expect(page.locator('.event-chip').filter({ hasText: 'CS seminar prep' })).toBeVisible();
});

test('trash button in archived calendars permanently deletes the calendar and its events', async ({ page }) => {
  await page.goto('/');

  await page.locator('.calendar-toggle-row').filter({ hasText: 'Teaching' }).hover();
  await page.getByRole('button', { name: 'Archive Teaching calendar' }).click();
  await page.locator('#archivedCalendarsToggle').click();
  await page.getByRole('button', { name: 'Delete Teaching calendar' }).click();

  await expect(page.locator('input[data-calendar="teaching"]')).toHaveCount(0);
  await expect(page.locator('#archivedCalendarsSection')).toBeHidden();
  await expect(page.locator('.event-chip').filter({ hasText: 'CS seminar prep' })).toHaveCount(0);
});

test('plus button opens create calendar modal and imports an ICS file', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#addCalendarButton')).toBeVisible();
  await page.locator('#addCalendarButton').click();
  await expect(page.locator('#calendarDialogTitle')).toHaveText('Create calendar');
  await expect(page.locator('#calendarImportTitle')).toHaveText('Import from ICS');
  await expect(page.locator('#calendarColorPalette .color-swatch')).toHaveCount(18);
  await expect(page.locator('#calendarColorPalette .color-swatch[data-color="rebeccapurple"]')).toBeVisible();

  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nX-WR-CALNAME:Imported Talks\nBEGIN:VEVENT\nUID:talk-1\nDTSTART:20260703T130000\nSUMMARY:Imported seminar\nDESCRIPTION:From ICS\nEND:VEVENT\nEND:VCALENDAR`;
  await page.locator('#calendarFileInput').setInputFiles({
    name: 'talks.ics',
    mimeType: 'text/calendar',
    buffer: Buffer.from(ics),
  });
  await page.locator('#calendarModalForm').getByRole('button', { name: 'Create', exact: true }).click();

  await expect(page.locator('#calendarModal')).not.toHaveClass(/is-open/);
  await expect(page.locator('.calendar-toggle-row').filter({ hasText: 'Imported Talks' })).toBeVisible();
  await expect(page.locator('input[data-calendar^="custom-"]')).toBeChecked();
  await expect(page.locator('.day-cell[data-date="2026-07-03"] .event-chip').filter({ hasText: 'Imported seminar' })).toBeVisible();
});

test('ICS import handles Google recurring UNTIL EXDATE and RECURRENCE-ID overrides', async ({ page }) => {
  await page.goto('/');
  await page.locator('#addCalendarButton').click();

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
X-WR-CALNAME:Recurring Import
BEGIN:VEVENT
UID:series-1@google.com
DTSTART:20260706T140000
DTEND:20260706T150000
RRULE:FREQ=WEEKLY;UNTIL=20260720T235959Z;BYDAY=MO
EXDATE:20260713T140000
SUMMARY:weekly sync
END:VEVENT
BEGIN:VEVENT
UID:series-1@google.com
RECURRENCE-ID:20260720T140000
DTSTART:20260720T150000
DTEND:20260720T160000
SUMMARY:moved sync
DESCRIPTION:Moved by Google Calendar override
END:VEVENT
END:VCALENDAR`;
  await page.locator('#calendarFileInput').setInputFiles({
    name: 'recurring.ics',
    mimeType: 'text/calendar',
    buffer: Buffer.from(ics),
  });
  await page.locator('#calendarModalForm').getByRole('button', { name: 'Create', exact: true }).click();

  await expect(page.locator('.day-cell[data-date="2026-07-06"] .event-chip').filter({ hasText: 'weekly sync' })).toBeVisible();
  await expect(page.locator('.day-cell[data-date="2026-07-13"] .event-chip').filter({ hasText: 'weekly sync' })).toHaveCount(0);
  await expect(page.locator('.day-cell[data-date="2026-07-20"] .event-chip').filter({ hasText: 'moved sync' })).toBeVisible();
  await expect(page.locator('.day-cell[data-date="2026-07-27"] .event-chip').filter({ hasText: /sync/ })).toHaveCount(0);
});

test('heatmap spans first to last visible selected-calendar event', async ({ page }) => {
  await page.goto('/');
  await page.locator('#addCalendarButton').click();

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
X-WR-CALNAME:README Bugs
BEGIN:VEVENT
UID:first
DTSTART:20251013T140000
DTEND:20251013T150000
SUMMARY:first README bug
END:VEVENT
BEGIN:VEVENT
UID:last
DTSTART:20260701T090000
DTEND:20260701T100000
SUMMARY:last README bug
END:VEVENT
END:VCALENDAR`;
  await page.locator('#calendarFileInput').setInputFiles({
    name: 'readme-bugs.ics',
    mimeType: 'text/calendar',
    buffer: Buffer.from(ics),
  });
  await page.locator('#calendarModalForm').getByRole('button', { name: 'Create', exact: true }).click();

  for (const id of ['teaching', 'research', 'deadlines', 'personal', 'tasks']) {
    await page.locator(`#calendarToggles input[data-calendar="${id}"]`).uncheck();
  }
  await page.keyboard.press('5');

  await expect(page.locator('#monthTitle')).toHaveText('Oct 13, 2025 – Jul 1, 2026');
  await expect(page.locator('.heatmap-summary')).toContainText('Event span');
  await expect(page.locator('.heatmap-day').first()).toHaveAttribute('data-date', '2025-10-13');
  await expect(page.locator('.heatmap-day').last()).toHaveAttribute('data-date', '2026-07-01');

  await page.keyboard.press('5');
  await expect(page.locator('#monthTitle')).toHaveText('Jul 3, 2025 – Jul 3, 2026');
  await expect(page.locator('.heatmap-summary')).toContainText('Rolling year');
  await expect(page.locator('.heatmap-day')).toHaveCount(366);
  await expect(page.locator('.heatmap-day').first()).toHaveAttribute('data-date', '2025-07-03');
  await expect(page.locator('.heatmap-day').last()).toHaveAttribute('data-date', '2026-07-03');

  await page.keyboard.press('5');
  await expect(page.locator('#monthTitle')).toHaveText('Oct 13, 2025 – Jul 1, 2026');
});

test('create calendar modal can create a blank calendar', async ({ page }) => {
  await page.goto('/');
  await page.locator('#addCalendarButton').click();
  await page.locator('#calendarNameInput').fill('New Course');
  await page.locator('#calendarModalForm').getByRole('button', { name: 'Create', exact: true }).click();

  await expect(page.locator('.calendar-toggle-row').filter({ hasText: 'New Course' })).toBeVisible();
  await expect(page.locator('input[data-calendar^="custom-"]')).toBeChecked();
});

test('calendar rows can be reordered with drag and drop and shortcuts follow order', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('academical.bottomSidebarHeight.v1', '340');
  });
  await page.goto('/');

  const rows = page.locator('.calendar-toggle-row');
  await expect(rows.nth(0)).toContainText('Teaching');
  await expect(rows.nth(1)).toContainText('Research');

  await rows.nth(0).dragTo(rows.nth(1));
  await expect(rows.nth(0)).toContainText('Research');
  await expect(rows.nth(1)).toContainText('Teaching');

  await page.keyboard.press('q');
  await expect(page.locator('input[data-calendar="research"]')).toBeChecked();
  await expect(page.locator('input[data-calendar="teaching"]')).not.toBeChecked();
});

test('calendar rows can be edited for name and color', async ({ page }) => {
  await page.goto('/');
  const teachingRow = page.locator('.calendar-toggle-row').filter({ hasText: 'Teaching' });
  await teachingRow.hover();
  await page.getByRole('button', { name: 'Rename Teaching calendar' }).click();

  await expect(page.locator('#editCalendarDialogTitle')).toHaveText('Edit calendar');
  await page.locator('#editCalendarNameInput').fill('Lectures');
  await page.locator('#editCalendarColorPalette .color-swatch[data-color="rebeccapurple"]').click();
  await page.locator('#editCalendarForm').getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('#editCalendarModal')).not.toHaveClass(/is-open/);
  await expect(page.locator('.calendar-toggle-row').filter({ hasText: 'Lectures' })).toBeVisible();
  await expect(page.locator('.calendar-toggle-row').filter({ hasText: 'Lectures' }).locator('.calendar-dot')).toHaveCSS('background-color', 'rgb(102, 51, 153)');

  await page.reload();
  await expect(page.locator('.calendar-toggle-row').filter({ hasText: 'Lectures' })).toBeVisible();
  await expect(page.locator('.calendar-toggle-row').filter({ hasText: 'Lectures' }).locator('.calendar-dot')).toHaveCSS('background-color', 'rgb(102, 51, 153)');
});

test('create event modal selects earliest currently visible calendar', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[data-calendar="teaching"]').uncheck();
  await openCreateEventDialog(page);
  await expect(page.locator('#eventCalendar')).toHaveValue('research');
  await page.locator('#cancelEvent').click();

  await page.locator('input[data-calendar="research"]').uncheck();
  await openCreateEventDialog(page);
  await expect(page.locator('#eventCalendar')).toHaveValue('deadlines');
});

test('time analysis panel shows current view events filtered by calendar selection', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('2');
  await page.locator('.sidebar-tab[data-panel="analysis"]').click();

  await expect(page.locator('#eventTimeAnalysis')).toHaveCount(0);
  await expect(page.locator('.sidebar-tab[data-panel="analysis"]')).toHaveClass(/is-active/);
  await expect(page.locator('#sidebarTimeAnalysisRange')).toHaveText('Jun 29 – Jul 5, 2026');
  await expect(page.locator('#sidebarTimeAnalysisSummary')).toHaveText('2 occurrences · 2h');
  await expect(page.locator('#weeklyActivityChartTitle')).toHaveText('Working hours per week');
  await expect(page.locator('.weekly-hours-svg')).toHaveAttribute('data-week-count', '1');
  await expect(page.locator('.weekly-hours-point[data-week="2026-W27"]')).toHaveAttribute('data-hours', '2');
  await expect(page.locator('.weekly-hours-point[data-week="2026-W27"]')).toHaveAttribute('fill', '#188038');
  await expect(page.locator('#sidebarTimeAnalysisList')).toContainText('CS seminar prep · Jul 1, 9 AM, 1 hour');
  await expect(page.locator('#sidebarTimeAnalysisList')).toContainText('Reading group · Jul 2, 2 PM, 1 hour');

  await page.keyboard.press('q');
  await expect(page.locator('#sidebarTimeAnalysisSummary')).toHaveText('1 occurrence · 1h');
  await expect(page.locator('.weekly-hours-point[data-week="2026-W27"]')).toHaveAttribute('data-hours', '1');
  await expect(page.locator('#sidebarTimeAnalysisList')).toContainText('CS seminar prep · Jul 1, 9 AM, 1 hour');
  await expect(page.locator('#sidebarTimeAnalysisList')).not.toContainText('Reading group');
});

test('time analysis ignores all-day events', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('academical.events.v1', JSON.stringify([
      {
        id: 'timed-analysis',
        title: 'Timed analysis block',
        date: '2026-07-01',
        time: '09:00',
        calendar: 'research',
        durationMinutes: 180,
        notes: '',
      },
      {
        id: 'all-day-analysis',
        title: 'All-day conference marker',
        date: '2026-07-01',
        time: '',
        calendar: 'research',
        durationMinutes: 1440,
        notes: '',
      },
    ]));
  });

  await page.goto('/');
  await page.keyboard.press('2');
  await page.locator('.sidebar-tab[data-panel="analysis"]').click();

  await expect(page.locator('#sidebarTimeAnalysisSummary')).toHaveText('1 occurrence · 3h');
  await expect(page.locator('#sidebarTimeAnalysisList')).toContainText('Timed analysis block · Jul 1, 9 AM, 3 hours');
  await expect(page.locator('#sidebarTimeAnalysisList')).not.toContainText('All-day conference marker');
});

test('time analysis uses imported ICS event durations', async ({ page }) => {
  await page.goto('/');
  await page.locator('#addCalendarButton').click();

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
X-WR-CALNAME:Duration Import
BEGIN:VEVENT
UID:duration-1
DTSTART:20260703T090000
DTEND:20260703T113000
SUMMARY:Long seminar
END:VEVENT
END:VCALENDAR`;
  await page.locator('#calendarFileInput').setInputFiles({
    name: 'duration.ics',
    mimeType: 'text/calendar',
    buffer: Buffer.from(ics),
  });
  await page.locator('#calendarModalForm').getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.locator('#calendarModal')).not.toHaveClass(/is-open/);

  await page.keyboard.press('2');
  await page.locator('.sidebar-tab[data-panel="analysis"]').click();

  await expect(page.locator('#sidebarTimeAnalysisSummary')).toHaveText('3 occurrences · 4.5h');
  await expect(page.locator('.weekly-hours-point[data-week="2026-W27"]')).toHaveAttribute('data-hours', '4.5');
  await expect(page.locator('.time-analysis-item').filter({ hasText: 'Long seminar' })).toContainText('Long seminar · Jul 3, 9 AM, 2.5 hours');
});

test('time analysis colors weekly hours dots by workload range', async ({ page }) => {
  await page.goto('/');
  await page.locator('#addCalendarButton').click();

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
X-WR-CALNAME:Workload Colors
BEGIN:VEVENT
UID:blue-range
DTSTART:20260706T000000
DTEND:20260707T130000
SUMMARY:Blue workload filler
END:VEVENT
BEGIN:VEVENT
UID:orange-range
DTSTART:20260713T000000
DTEND:20260714T200000
SUMMARY:Orange workload filler
END:VEVENT
BEGIN:VEVENT
UID:red-range
DTSTART:20260720T000000
DTEND:20260722T000000
SUMMARY:Red workload filler
END:VEVENT
END:VCALENDAR`;
  await page.locator('#calendarFileInput').setInputFiles({
    name: 'workload-colors.ics',
    mimeType: 'text/calendar',
    buffer: Buffer.from(ics),
  });
  await page.locator('#calendarModalForm').getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.locator('#calendarModal')).not.toHaveClass(/is-open/);
  await page.locator('.sidebar-tab[data-panel="analysis"]').click();

  await expect(page.locator('.weekly-hours-point[data-week="2026-W27"]')).toHaveAttribute('fill', '#188038');
  await expect(page.locator('.weekly-hours-point[data-week="2026-W27"]')).toHaveCSS('fill', 'rgb(24, 128, 56)');
  await expect(page.locator('.weekly-hours-point[data-week="2026-W28"]')).toHaveAttribute('data-hours', '40');
  await expect(page.locator('.weekly-hours-point[data-week="2026-W28"]')).toHaveAttribute('fill', '#1a73e8');
  await expect(page.locator('.weekly-hours-point[data-week="2026-W28"]')).toHaveCSS('fill', 'rgb(26, 115, 232)');
  await expect(page.locator('.weekly-hours-point[data-week="2026-W29"]')).toHaveAttribute('data-hours', '45');
  await expect(page.locator('.weekly-hours-point[data-week="2026-W29"]')).toHaveAttribute('fill', '#f29900');
  await expect(page.locator('.weekly-hours-point[data-week="2026-W29"]')).toHaveCSS('fill', 'rgb(242, 153, 0)');
  await expect(page.locator('.weekly-hours-point[data-week="2026-W30"]')).toHaveAttribute('data-hours', '50');
  await expect(page.locator('.weekly-hours-point[data-week="2026-W30"]')).toHaveAttribute('fill', '#d93025');
  await expect(page.locator('.weekly-hours-point[data-week="2026-W30"]')).toHaveCSS('fill', 'rgb(217, 48, 37)');
});

test('time analysis renders weekly cumulative activity chart', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('academical.sidebarLocation.v1', 'bottom');
  });
  await page.goto('/');
  await page.locator('#addCalendarButton').click();

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
X-WR-CALNAME:Activity Import
BEGIN:VEVENT
UID:read-1
DTSTART:20260701T090000
DTEND:20260701T100000
SUMMARY:read: Paper A
END:VEVENT
BEGIN:VEVENT
UID:code-1
DTSTART:20260708T090000
DTEND:20260708T110000
SUMMARY:code: Prototype
END:VEVENT
BEGIN:VEVENT
UID:read-2
DTSTART:20260715T090000
DTEND:20260715T103000
SUMMARY:read: Paper B
END:VEVENT
END:VCALENDAR`;
  await page.locator('#calendarFileInput').setInputFiles({
    name: 'activity.ics',
    mimeType: 'text/calendar',
    buffer: Buffer.from(ics),
  });
  await page.locator('#calendarModalForm').getByRole('button', { name: 'Create', exact: true }).click();

  await page.locator('.sidebar-tab[data-panel="analysis"]').click();

  await expect(page.locator('#weeklyActivityChart')).toBeVisible();
  await expect(page.locator('.time-analysis-chart-panel')).toHaveCount(2);
  const chartPanels = await page.locator('.time-analysis-chart-panel').evaluateAll((panels) => panels.map((panel) => {
    const rect = panel.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width };
  }));
  expect(Math.abs(chartPanels[0].y - chartPanels[1].y)).toBeLessThan(8);
  expect(chartPanels[1].x).toBeGreaterThan(chartPanels[0].x + chartPanels[0].width - 8);
  await expect(page.locator('.weekly-activity-svg')).toHaveAttribute('data-week-count', '3');
  await expect(page.locator('.weekly-activity-legend-item[data-category="read"]')).toHaveText('Read');
  await expect(page.locator('.weekly-activity-legend-item[data-category="code"]')).toHaveText('Code');
  await expect(page.locator('.weekly-activity-line[data-category="read"]')).toHaveCount(1);
  await expect(page.locator('.weekly-activity-line[data-category="code"]')).toHaveCount(1);
  await expect(page.locator('.weekly-activity-point[data-category="read"][data-week="2026-W29"][data-hours="2.5"]')).toHaveCount(1);
  await expect(page.locator('.weekly-activity-point[data-category="code"][data-week="2026-W28"][data-hours="2"]')).toHaveCount(1);

  await page.locator('.weekly-activity-point[data-category="code"][data-week="2026-W28"]').hover();
  await expect(page.locator('.weekly-activity-tooltip')).toBeVisible();
  await expect(page.locator('.weekly-activity-tooltip')).toContainText('2026-W28');
  await expect(page.locator('.weekly-activity-tooltip')).toContainText('Code: 2h cumulative');
});

test('sidebar panels can switch by click and Control-number shortcuts', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.sidebar-tab[data-panel="calendar"]')).toHaveClass(/is-active/);
  await expect(page.locator('.sidebar-tab[data-panel="upcoming"]')).toHaveCount(0);
  await expect(page.locator('.sidebar-panel[data-panel="upcoming"]')).toHaveCount(0);

  await page.keyboard.press('Control+1');
  await expect(page.locator('body')).toHaveClass(/sidebar-collapsed/);
  await page.keyboard.press('Control+1');
  await expect(page.locator('body')).not.toHaveClass(/sidebar-collapsed/);
  await expect(page.locator('.sidebar-panel[data-panel="calendar"]')).toBeVisible();

  await page.locator('.sidebar-tab[data-panel="papers"]').click();
  await expect(page.locator('.sidebar-panel[data-panel="papers"]')).toBeVisible();
  await page.locator('.sidebar-tab[data-panel="analysis"]').click();
  await expect(page.locator('#sidebarTimeAnalysisContent')).toBeVisible();
  await expect(page.locator('#sidebarTimeAnalysisSummary')).toContainText('occurrence');

  await page.keyboard.press('Control+1');
  await expect(page.locator('.sidebar-panel[data-panel="calendar"]')).toBeVisible();
  await page.keyboard.press('Control+2');
  await expect(page.locator('.sidebar-panel[data-panel="papers"]')).toBeVisible();
  await page.keyboard.press('Control+3');
  await expect(page.locator('.sidebar-panel[data-panel="analysis"]')).toBeVisible();
});

test('settings show bottom-only sidebar panel guidance', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/sidebar-location-bottom/);
  await page.locator('#settingsButton').click();
  await expect(page.locator('#settingsDialogTitle')).toHaveText('Settings');
  await expect(page.locator('input[name="sidebarLocation"][value="bottom"]')).toBeChecked();
  await expect(page.locator('input[name="sidebarLocation"][value="left"]')).toHaveCount(0);
  await expect(page.locator('input[name="sidebarLocation"][value="right"]')).toHaveCount(0);
  await expect(page.locator('#settingsForm')).toContainText('Drag the splitter above the panel to resize it.');
  await page.locator('#settingsForm').getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('body')).toHaveClass(/sidebar-location-bottom/);
});

test('bottom sidebar stays below calendar on narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 604, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('academical.sidebarLocation.v1', 'bottom');
  });

  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/sidebar-location-bottom/);

  const calendarBox = await page.locator('.calendar-panel').boundingBox();
  const sidebarBox = await page.locator('#sidebar').boundingBox();
  expect(calendarBox).not.toBeNull();
  expect(sidebarBox).not.toBeNull();
  expect(sidebarBox.y).toBeGreaterThanOrEqual(calendarBox.y + calendarBox.height - 1);
});

test('month and four-week views fill viewport with draggable bottom panel', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('academical.bottomSidebarHeight.v1', '220');
  });

  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/sidebar-location-bottom/);

  const initial = await page.evaluate(() => {
    const workspace = document.querySelector('.workspace').getBoundingClientRect();
    const calendar = document.querySelector('.calendar-panel').getBoundingClientRect();
    const resizer = document.querySelector('#sidebarResizer').getBoundingClientRect();
    const sidebar = document.querySelector('#sidebar').getBoundingClientRect();
    const monthGridStyle = getComputedStyle(document.querySelector('#monthGrid'));
    return {
      workspaceHeight: workspace.height,
      totalHeight: calendar.height + resizer.height + sidebar.height,
      bodyScrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      monthGridOverflowY: monthGridStyle.overflowY,
      sidebarHeight: sidebar.height,
    };
  });
  expect(Math.abs(initial.workspaceHeight - initial.totalHeight)).toBeLessThan(2);
  expect(initial.bodyScrollHeight).toBeLessThanOrEqual(initial.viewportHeight + 1);
  expect(initial.monthGridOverflowY).toBe('hidden');

  const resizerBox = await page.locator('#sidebarResizer').boundingBox();
  expect(resizerBox).not.toBeNull();
  await page.mouse.move(resizerBox.x + resizerBox.width / 2, resizerBox.y + resizerBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(resizerBox.x + resizerBox.width / 2, resizerBox.y - 80, { steps: 5 });
  await page.mouse.up();

  const resizedHeight = await page.locator('#sidebar').evaluate((sidebar) => sidebar.getBoundingClientRect().height);
  expect(resizedHeight).toBeGreaterThan(initial.sidebarHeight + 20);

  await page.keyboard.press('4');
  const fourWeek = await page.evaluate(() => {
    const monthGridStyle = getComputedStyle(document.querySelector('#monthGrid'));
    return {
      bodyScrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      monthGridOverflowY: monthGridStyle.overflowY,
    };
  });
  expect(fourWeek.bodyScrollHeight).toBeLessThanOrEqual(fourWeek.viewportHeight + 1);
  expect(fourWeek.monthGridOverflowY).toBe('hidden');
});

test('week view renders hourly grid and t centers current-time indicator', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('t');
  await expect(page.locator('#viewSelect')).toHaveValue('week');
  await expect(page.locator('.week-timeline')).toBeVisible();
  await expect(page.locator('.week-now-indicator')).toBeVisible();
  await expect(page.locator('.week-now-time')).toBeVisible();
});

test('clicking week view slots creates events at 15 minute granularity', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('2');
  await page.locator('.week-timeline-scroll').evaluate((element) => {
    element.scrollTop = 360;
  });

  const slot = page.locator('.week-slot[data-date="2026-07-02"][data-hour="9"]');
  const slotBox = await slot.boundingBox();
  expect(slotBox).not.toBeNull();
  await page.mouse.move(slotBox.x + 12, slotBox.y + 55);

  const hoverSelection = page.locator('.week-day-column[data-date="2026-07-02"] .week-hover-selection');
  await expect(hoverSelection).toBeVisible();
  await expect(hoverSelection).toHaveAttribute('data-time', '09:45');
  await expect(hoverSelection).toHaveAttribute('data-duration-minutes', '60');
  await expect(hoverSelection).toHaveCSS('height', '70px');

  await slot.click({ position: { x: 12, y: 55 } });

  await expect(page.locator('#eventModal')).toHaveClass(/is-open/);
  await expect(page.locator('#eventTime')).toHaveValue('09:45');
  await expect(page.locator('#eventEndTime')).toHaveValue('10:45');
  await expect(page.locator('#eventDurationMinutes')).toHaveValue('60');
});

test('creating an event in week view preserves the vertical scroll position', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('/');
  await page.keyboard.press('2');

  const scroller = page.locator('.week-timeline-scroll');
  await scroller.evaluate((element) => {
    element.scrollTop = 720;
  });
  await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBe(720);

  await page.locator('.week-slot[data-date="2026-07-02"][data-hour="12"]').click({ position: { x: 12, y: 20 } });
  await page.locator('#eventTitle').fill('Scroll-preserving focus block');
  await page.locator('#eventForm').getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('#eventModal')).not.toHaveClass(/is-open/);
  await expect(page.locator('.week-timed-event').filter({ hasText: 'Scroll-preserving focus block' })).toBeVisible();
  await expect.poll(() => page.locator('.week-timeline-scroll').evaluate((element) => element.scrollTop)).toBe(720);
});

test('dragging hour boxes in week view creates an event with that range', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('2');

  const column = page.locator('.week-day-column[data-date="2026-07-02"]');
  const box = await column.boundingBox();
  expect(box).not.toBeNull();

  const x = box.x + 24;
  await page.mouse.move(x, box.y + (2 * 72) + 20);
  await page.mouse.down();
  await page.mouse.move(x, box.y + (4 * 72) + 45, { steps: 4 });
  await expect(page.locator('.week-drag-selection')).toBeVisible();
  await page.mouse.up();

  await expect(page.locator('#eventModal')).toHaveClass(/is-open/);
  await expect(page.locator('#eventTime')).toHaveValue('02:15');
  await expect(page.locator('#eventEndTime')).toHaveValue('04:45');
  await expect(page.locator('#eventDurationMinutes')).toHaveValue('150');
  await page.locator('#eventTitle').fill('Dragged focus block');
  await page.getByRole('button', { name: 'Save' }).click();

  const created = await page.evaluate(() => JSON.parse(localStorage.getItem('academical.events.v1')).find((event) => event.title === 'Dragged focus block'));
  expect(created.time).toBe('02:15');
  expect(created.durationMinutes).toBe(150);
  await expect(page.locator('.week-timed-event').filter({ hasText: 'Dragged focus block' })).toBeVisible();
});

test('dragging a timed week event moves its date and 15 minute position', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('2');
  await page.locator('.week-timeline-scroll').evaluate((element) => {
    element.scrollTop = 360;
  });

  const eventButton = page.locator('.week-timed-event').filter({ hasText: 'CS seminar prep' });
  const eventBox = await eventButton.boundingBox();
  const targetColumn = page.locator('.week-day-column[data-date="2026-07-03"]');
  const targetBox = await targetColumn.boundingBox();
  expect(eventBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  await page.mouse.move(eventBox.x + 12, eventBox.y + 8);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + 24, targetBox.y + (10.25 * 72) + 8, { steps: 8 });
  await expect(page.locator('.week-event-drag-preview')).toBeVisible();
  await page.mouse.up();

  await expect(page.locator('#eventModal')).not.toHaveClass(/is-open/);
  const moved = await page.evaluate(() => JSON.parse(localStorage.getItem('academical.events.v1')).find((event) => event.title === 'CS seminar prep'));
  expect(moved.date).toBe('2026-07-03');
  expect(moved.time).toBe('10:15');
  await expect(page.locator('.week-day-column[data-date="2026-07-03"] .week-timed-event').filter({ hasText: 'CS seminar prep' })).toBeVisible();
});

test('event dialog end time controls duration and digit shortcuts set hour duration', async ({ page }) => {
  await page.goto('/');

  await page.locator('.event-chip').filter({ hasText: 'Reading group' }).click();
  await expect(page.locator('#eventDialogTitle')).toHaveText('Edit event');
  await expect(page.locator('#eventTime')).toHaveValue('14:00');
  await expect(page.locator('#eventEndTime')).toHaveValue('15:00');

  await page.keyboard.press('2');
  await expect(page.locator('#eventTime')).toHaveValue('14:00');
  await expect(page.locator('#eventEndTime')).toHaveValue('16:00');
  await expect(page.locator('#eventDurationMinutes')).toHaveValue('120');

  await page.locator('#eventEndTime').fill('17:30');
  await expect(page.locator('#eventDurationMinutes')).toHaveValue('210');
  await page.keyboard.press('Enter');

  await expect(page.locator('#eventModal')).not.toHaveClass(/is-open/);
  const updated = await page.evaluate(() => JSON.parse(localStorage.getItem('academical.events.v1')).find((event) => event.title === 'Reading group'));
  expect(updated.durationMinutes).toBe(210);
});

test('month event chips distinguish Google-style all-day bars and timed rows', async ({ page }) => {
  await page.goto('/');

  await openCreateEventDialog(page, '2026-07-07');
  await page.locator('#eventTitle').fill('All-day paper deadline');
  await page.getByRole('button', { name: 'Save' }).click();

  await openCreateEventDialog(page, '2026-07-07');
  await page.locator('#eventTitle').fill('Timed writing block');
  await page.locator('#eventTime').fill('09:00');
  await page.getByRole('button', { name: 'Save' }).click();

  const day = page.locator('.day-cell[data-date="2026-07-07"]');
  const allDay = day.locator('.event-chip').filter({ hasText: 'All-day paper deadline' });
  const timed = day.locator('.event-chip').filter({ hasText: 'Timed writing block' });
  await expect(allDay).toHaveClass(/event-chip--all-day/);
  await expect(timed).toHaveClass(/event-chip--timed/);
  await expect(allDay.locator('.event-dot')).toHaveCount(0);
  await expect(timed.locator('.event-dot')).toHaveCount(1);
  await expect(timed.locator('.event-time')).toHaveText('9 AM');
  await expect(allDay).not.toContainText('All day');

  const order = await day.locator('.event-chip').evaluateAll((chips) => chips.map((chip) => chip.textContent));
  expect(order.findIndex((text) => text.includes('All-day paper deadline'))).toBeLessThan(order.findIndex((text) => text.includes('Timed writing block')));
});

test('month and four-week views fit expanded event counts per day', async ({ page }) => {
  await page.addInitScript(() => {
    const events = Array.from({ length: 8 }, (_, index) => ({
      id: `dense-${index + 1}`,
      title: `Dense event ${index + 1}`,
      date: '2026-07-07',
      time: `${String(8 + index).padStart(2, '0')}:00`,
      calendar: 'research',
      notes: '',
    }));
    localStorage.setItem('academical.events.v1', JSON.stringify(events));
  });

  await page.goto('/');
  const monthDay = page.locator('.day-cell[data-date="2026-07-07"]');
  await expect(monthDay.locator('.event-chip')).toHaveCount(6);
  await expect(monthDay.locator('.more-events')).toHaveText('+2 more');

  await page.keyboard.press('4');
  const fourWeekDay = page.locator('.day-cell[data-date="2026-07-07"]');
  await expect(fourWeekDay.locator('.event-chip')).toHaveCount(8);
  await expect(fourWeekDay.locator('.more-events')).toHaveCount(0);
});

test('p opens Add paper modal and Enter submits', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('p');
  await expect(page.locator('#paperDialogTitle')).toHaveText('Add paper');
  await expect(page.locator('#paperModalInput')).toBeFocused();
  await page.locator('#paperModalInput').fill('A paper title');
  await page.keyboard.press('Enter');
  await expect(page.locator('#paperModal')).not.toHaveClass(/is-open/);
  await expect(page.locator('.paper-task-title')).toHaveText('A paper title');
});

test('paper URLs are stored as static source links without external API calls', async ({ page }) => {
  let externalCalled = false;
  await page.route('https://api.semanticscholar.org/**', async (route) => {
    externalCalled = true;
    await route.abort('failed');
  });
  await page.route('https://export.arxiv.org/**', async (route) => {
    externalCalled = true;
    await route.abort('failed');
  });

  await page.goto('/');
  await page.keyboard.press('p');
  await page.locator('#paperModalInput').fill(
    'https://arxiv.org/pdf/2505.17716\n' +
      'https://www.semanticscholar.org/paper/On-the-Security-of-Research-Artifacts-Rani-Rossow/206e3b192dec3bff1f4d41335ac5399840066f64'
  );
  await page.locator('#paperModalForm').getByRole('button', { name: 'Add papers' }).click();

  await expect(page.locator('.paper-task-title')).toHaveCount(2);
  await expect(page.locator('.paper-task-meta').filter({ hasText: 'arXiv:2505.17716' })).toBeVisible();
  await expect(page.locator('.paper-task-meta').filter({ hasText: 'S2:206e3b19' })).toBeVisible();
  expect(externalCalled).toBe(false);
});

test('creating every weekday recurring event skips weekends', async ({ page }) => {
  await page.goto('/');
  await openCreateEventDialog(page);
  await page.locator('#eventTitle').fill('Weekday standup');
  await page.locator('#eventDate').fill('2026-07-02');
  await page.locator('#eventTime').fill('10:00');
  await page.locator('#eventRepeat').selectOption('weekdays');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.day-cell[data-date="2026-07-02"] .event-chip').filter({ hasText: 'Weekday standup' })).toBeVisible();
  await expect(page.locator('.day-cell[data-date="2026-07-03"] .event-chip').filter({ hasText: 'Weekday standup' })).toBeVisible();
  await expect(page.locator('.day-cell[data-date="2026-07-04"] .event-chip').filter({ hasText: 'Weekday standup' })).toHaveCount(0);
});

test('deleting recurring event removes only selected instance', async ({ page }) => {
  await page.goto('/');
  await openCreateEventDialog(page);
  await page.locator('#eventTitle').fill('Weekday standup');
  await page.locator('#eventDate').fill('2026-07-02');
  await page.locator('#eventTime').fill('10:00');
  await page.locator('#eventRepeat').selectOption('weekdays');
  await page.getByRole('button', { name: 'Save' }).click();

  const thu = page.locator('.day-cell[data-date="2026-07-02"] .event-chip').filter({ hasText: 'Weekday standup' });
  const fri = page.locator('.day-cell[data-date="2026-07-03"] .event-chip').filter({ hasText: 'Weekday standup' });
  const mon = page.locator('.day-cell[data-date="2026-07-06"] .event-chip').filter({ hasText: 'Weekday standup' });

  await fri.click();
  await expect(page.locator('#deleteEvent')).toHaveText('Delete instance');
  await expect(page.locator('#deleteSeriesEvent')).toBeVisible();
  await page.keyboard.press('Backspace');
  await expect(thu).toBeVisible();
  await expect(fri).toHaveCount(0);
  await expect(mon).toBeVisible();
});

test('delete recurring button removes the entire recurring series', async ({ page }) => {
  await page.goto('/');
  await openCreateEventDialog(page);
  await page.locator('#eventTitle').fill('Weekday standup');
  await page.locator('#eventDate').fill('2026-07-02');
  await page.locator('#eventRepeat').selectOption('weekdays');
  await page.getByRole('button', { name: 'Save' }).click();

  await page.locator('.day-cell[data-date="2026-07-03"] .event-chip').filter({ hasText: 'Weekday standup' }).click();
  await expect(page.locator('#deleteSeriesEvent')).toBeVisible();
  await page.locator('#deleteSeriesEvent').click();

  await expect(page.locator('.event-chip').filter({ hasText: 'Weekday standup' })).toHaveCount(0);
});

test('backspace deletes a non-recurring event from edit dialog', async ({ page }) => {
  await page.goto('/');
  const eventChip = page.locator('.event-chip').filter({ hasText: 'Reading group' });
  await expect(eventChip).toBeVisible();
  await eventChip.click();
  await expect(page.locator('#eventDialogTitle')).toHaveText('Edit event');
  await page.keyboard.press('Backspace');
  await expect(page.locator('#eventModal')).not.toHaveClass(/is-open/);
  await expect(page.locator('.event-chip').filter({ hasText: 'Reading group' })).toHaveCount(0);
});

test('read event matching is case-insensitive, colon optional, and preserves casing on assignment', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('p');
  await page.locator('#paperModalInput').fill('Paper A');
  await page.keyboard.press('Enter');

  await openCreateEventDialog(page);
  await page.locator('#eventTitle').fill('READ Paper A');
  await expect(page.locator('#eventPaperAssignment')).toBeVisible();
  await page.locator('.paper-assignment-option').filter({ hasText: 'Paper A' }).locator('input').check();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('.event-chip').filter({ hasText: 'READ: Paper A' })).toBeVisible();
});

test('assigning paper updates non-recurring read event title and removes paper task', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('p');
  await page.locator('#paperModalInput').fill('Paper A');
  await page.keyboard.press('Enter');
  await expect(page.locator('.paper-task-title')).toHaveText('Paper A');

  await openCreateEventDialog(page);
  await page.locator('#eventTitle').fill('read session');
  await page.locator('.paper-assignment-option').filter({ hasText: 'Paper A' }).locator('input').check();
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.event-chip').filter({ hasText: 'read: Paper A' })).toBeVisible();
  await expect(page.locator('.paper-task-title')).toHaveCount(0);

  await page.locator('.event-chip').filter({ hasText: 'read: Paper A' }).click();
  await expect(page.locator('.paper-assignment-option').filter({ hasText: 'Paper A' }).locator('input')).toBeChecked();
});

test('assigning paper to recurring read event updates only selected instance', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('p');
  await page.locator('#paperModalInput').fill('Paper A');
  await page.keyboard.press('Enter');

  await openCreateEventDialog(page);
  await page.locator('#eventTitle').fill('read session');
  await page.locator('#eventDate').fill('2026-07-02');
  await page.locator('#eventRepeat').selectOption('weekdays');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.day-cell[data-date="2026-07-02"] .event-chip').filter({ hasText: 'read session' })).toBeVisible();
  await expect(page.locator('.day-cell[data-date="2026-07-03"] .event-chip').filter({ hasText: 'read session' })).toBeVisible();

  await page.locator('.day-cell[data-date="2026-07-03"] .event-chip').filter({ hasText: 'read session' }).click();
  await page.locator('.paper-assignment-option').filter({ hasText: 'Paper A' }).locator('input').check();
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.locator('.day-cell[data-date="2026-07-02"] .event-chip').filter({ hasText: 'read session' })).toBeVisible();
  await expect(page.locator('.day-cell[data-date="2026-07-03"] .event-chip').filter({ hasText: 'read: Paper A' })).toBeVisible();
  await expect(page.locator('.day-cell[data-date="2026-07-06"] .event-chip').filter({ hasText: 'read session' })).toBeVisible();
  await expect(page.locator('.paper-task-title')).toHaveCount(0);
});

test('deleting assigned read event restores paper task', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('p');
  await page.locator('#paperModalInput').fill('Paper A');
  await page.keyboard.press('Enter');

  await openCreateEventDialog(page);
  await page.locator('#eventTitle').fill('read session');
  await page.locator('.paper-assignment-option').filter({ hasText: 'Paper A' }).locator('input').check();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('.paper-task-title')).toHaveCount(0);

  await page.locator('.event-chip').filter({ hasText: 'read: Paper A' }).click();
  await page.keyboard.press('Backspace');
  await expect(page.locator('.event-chip').filter({ hasText: 'read: Paper A' })).toHaveCount(0);
  await expect(page.locator('.paper-task-title')).toHaveText('Paper A');
});
