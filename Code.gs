/**
 * @typedef {Object} DateRange
 * @property {Date} start
 * @property {Date} end
 */

// Source: https://www.linkedin.com/pulse/automate-color-coding-your-google-calendar-marguerite-thibodeaux-acc?trk=articles_directory
// Todo: get Event Details? Only update related event: https://stackoverflow.com/questions/43242701/google-apps-script-and-trigger-when-new-calendar-event-is-added
// Colors: https://developers.google.com/apps-script/reference/calendar/event-color?hl=de

function ColorEvents() {
  let dateRangeStart = new Date();
  let dateRangeEnd = new Date();
  dateRangeStart.setDate((new Date()).getDate() - 1);
  dateRangeEnd.setDate((new Date()).getDate() + 1);

  dateRange = {
    start: dateRangeStart,
    end: dateRangeEnd
  };

  colorPrivateCal(dateRange);
  handleStudyAndWorkCal(dateRange);
}

/**
 * @param {DateRange} dateRange
 */
function colorPrivateCal(dateRange) {
    Logger.log('Start: ' + dateRange.start + ' End: ' + dateRange.end);

    var calendar = CalendarApp.getCalendarById(Session.getActiveUser().getEmail());
    Logger.log('For calendar: ' + calendar.getName());


    var events = calendar.getEvents(dateRange.start, dateRange.end);
    for (var j=0; j<events.length; j++) {
        let e = events[j];
        let title = e.getTitle();
        if (title.toLocaleLowerCase().startsWith("beispiel 1")) {
            e.setColor(CalendarApp.EventColor.PALE_RED);
          }
        else if (title.toLocaleLowerCase().startsWith("beispiel 2")) {
            e.setColor(CalendarApp.EventColor.RED);
          }
        else if (title.toLocaleLowerCase().startsWith("beispiel 3")) {
            e.setColor(CalendarApp.EventColor.MAUVE);
          }
        }
      Logger.log('Number of updated events: ' + events.length);
}

/**
 * @param {DateRange} dateRange
 */
function handleStudyAndWorkCal(dateRange) {

    const calendarWork = CalendarApp.getCalendarById("ID_HERE");
    const calenderStudy = CalendarApp.getCalendarById("ID_HERE");
    Logger.log('For calendar: ' + calenderStudy.getName());

    let dateRangeStep = new Date(dateRange.start);
    while (dateRangeStep < dateRange.end) {
      checkDayForStudyAndWork(dateRangeStep, calenderStudy, calendarWork)
      dateRangeStep.setDate((dateRangeStep.getDate() + 1))
    }
}

/**
 * @param {Date} date
 * @param {Calendar} calenderStudy
 * @param {Calendar} calendarWork
 */
function checkDayForStudyAndWork(date, calenderStudy, calendarWork) {
    createStudyEventInWork(date, calenderStudy, calendarWork);

    let eventsStudy = calenderStudy.getEventsForDay(date);
    for (var j=0; j<eventsStudy.length; j++) {
        let event = eventsStudy[j];
        let title = event.getTitle();

        if (title.toLocaleLowerCase().startsWith("abgabe:")) {
          event.setColor(CalendarApp.EventColor.BLUE);
        }
    }
}

/**
 * @param {Date} date
 * @param {Calendar} calenderStudy
 * @param {Calendar} calenderWork
 */
function createStudyEventInWork(date, calenderStudy, calendarWork){
  studyEvents = calenderStudy.getEventsForDay(date);
  if (studyEvents.length === 0) {
    return;
  }
  dateRange = getStartDateTimeAndEndDateTimeForEvents(studyEvents);
  dateRange = addBufferToStudyDateRange(dateRange, 1.5);

  let existingStudyEvent = getStudyEventFromWorkEvents(calendarWork.getEventsForDay(date));

  // Create Event if not already exisiting
  if (existingStudyEvent === null) {
    let event = calendarWork.createEvent('AD: Studium', dateRange.start, dateRange.end);
    event.setTag('generator', 'google-calender-automation')
    console.log('Created event', event.getId())
    return;
  }

  updateExistingStudyEvent(existingStudyEvent, dateRange);
}

/**
 * @param {CalendarEvent} event
 * @param {DateRange} dateRange
 */
function updateExistingStudyEvent(event, dateRange) {
  if (
    event.getStartTime().getTime() == dateRange.start.getTime() 
    && event.getEndTime().getTime() == dateRange.end.getTime()
  ) {
    return;
  }

  event.setTime(dateRange.start, dateRange.end);
  Logger.log('Updated  event', event.getId())
}

/**
 * @param {CalendarEvent}[] events
 */
function getStudyEventFromWorkEvents(events) {
  for (var j=0; j < events.length; j++) {
    if (events[j].getTag('generator') === 'google-calender-automation') {
      return events[j];
    }
  }
  return null;
}

/**
 * @param {CalendarEvent}[] events
 * 
 * @return {DateRange}
 */
function getStartDateTimeAndEndDateTimeForEvents(events) {
  let dateRange = {start: null, end: null}

  for (var j=0; j<events.length; j++) {
    if (ignoreEventForStartEndDateCreation(events[j])) {
      continue;
    }
    dateRange.start = getUpdatedStartFirstEventDate(dateRange.start, events[j]);
    dateRange.end = getUpdatedEndLastEventDate(dateRange.end, events[j]);
  }
  return dateRange;
}

/**
 * @param {DateRange} dateRange
 * @param {Number} buffer - in hours. Added before and after dateRange
 * 
 * @return {DateRange}
 */
function addBufferToStudyDateRange(dateRange, buffer) {
  let bufferInMs = (buffer*60*60*1000);

  dateRange.start.setTime(dateRange.start.getTime() - bufferInMs);
  dateRange.end.setTime(dateRange.end.getTime() + bufferInMs);

  return dateRange;
}


/**
 * @param {CalendarEvent} event
 * 
 * return {Boolean}
 */ 
function ignoreEventForStartEndDateCreation(event) {
  let eventTitle = event.getTitle().toLocaleLowerCase();

  if (eventTitle.startsWith("abgabe")) {
    return true;
  }
  if (eventTitle.startsWith("reminder")) {
    return true;
  }

  return false;
}

/**
 * @param {Date} startFirstEvent
 * @param {CalendarEvent} event
 * 
 *  @return {Date}
 */
function getUpdatedStartFirstEventDate(startFirstEvent, event) {
  if (!event.isAllDayEvent() && (event.getStartTime() < startFirstEvent || startFirstEvent === null)) {
    return event.getStartTime();
  }
  return startFirstEvent;
}

/**
 * @param {Date} endLastEvent
 * @param {CalendarEvent} event
 * 
 * @return {Date}
 */
function getUpdatedEndLastEventDate(endLastEvent, event) {
  if (!event.isAllDayEvent() && (event.getEndTime() > endLastEvent || endLastEvent === null)) {
    return event.getEndTime();
  }
  return endLastEvent;
}
