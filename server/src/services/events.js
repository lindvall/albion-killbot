const albion = require("../ports/albion");
const { publish, subscribe } = require("../ports/queue");
const logger = require("../helpers/logger");
const { sleep } = require("../helpers/utils");

const EVENTS_EXCHANGE = "events";
const EVENTS_QUEUE_PREFIX = "events";

async function fetchEventsTo(latestEvent, { offset = 0 } = {}, events = []) {
  // Maximum offset reached, just return what we have
  if (offset >= 1000) {
    logger.warn(`Events API too slow. Reached offset ${offset} and bailed with ${events.length} events.`);
    return events;
  }

  try {
    // If not latestEvent, just fetch a single one to create a reference
    if (!latestEvent) {
      return await albion.getEvents({
        limit: 1,
      });
    }

    logger.verbose(`Fetching events with offset: ${offset}`);
    const albionEvents = await albion.getEvents({
      offset,
    });

    const foundLatest = !albionEvents.every((evt) => {
      if (evt.EventId <= latestEvent.EventId) return false;
      // Ignore items already on the queue
      if (events.findIndex((e) => e.EventId === evt.EventId) >= 0) return true;
      events.push(evt);
      return true;
    });

    return foundLatest
      ? events.sort((a, b) => a.EventId - b.EventId)
      : fetchEventsTo(latestEvent, { offset: offset + albionEvents.length }, events);
  } catch (err) {
    logger.error(`Unable to fetch event data from API [${err}]. Retrying...`);
    await sleep(5000);
    return fetchEventsTo(latestEvent, { offset }, events);
  }
}

async function publishEvent(event) {
  return await publish(EVENTS_EXCHANGE, event);
}

async function subscribeEvents(queue_suffix, callback) {
  const queue = `${EVENTS_QUEUE_PREFIX}-${queue_suffix}`;
  return await subscribe(EVENTS_EXCHANGE, queue, callback);
}

async function getEvent(eventId) {
  return await albion.getEvent(eventId);
}

module.exports = {
  fetchEventsTo,
  publishEvent,
  subscribeEvents,
  getEvent,
};
