const { getCollection } = require("../ports/database");
const albion = require("../ports/albion");
const { publish, subscribe } = require("../ports/queue");
const logger = require("../helpers/logger");
const database = require("../database");
const { sleep } = require("../helpers/utils");

const EVENTS_EXCHANGE = "events";
const EVENTS_QUEUE_PREFIX = "events";

const EVENT_COLLECTION = "eventInfo";

async function fetchEventsTo(latestEvent, { offset = 0 } = {}, events = []) {
  // Maximum offset reached, just return what we have
  if (offset >= 1000) {
    logger.warn(`Events API too slow. Reached offset ${offset} and bailed with ${events.length} events.`);
    return events;
  }

  const collection = getCollection(EVENT_COLLECTION);
  if (!collection) throw new Error("Not connected to the database.");

  try {
    // If not latestEvent, just fetch a single one to create a reference
    if (!latestEvent) {
      latestEvent = await collection.findOne()

      if (!latestEvent) latestEvent = { EventId: 0 };
      if (latestEvent && latestEvent.EventId) {
        logger.info(`Stored latest event found. Retrieving up to event ${latestEvent.EventId}.`);
        return await latestEvent;
      } else {
        logger.info(`No latest event found. Retrieving first events.`);
      }
      return await albion.getEvents({
        limit: 1,
      });
    } else {
      logger.info(`Fetching Albion Online events from API up to event ${latestEvent.EventId}.`);
      try {
        await collection.updateOne(
          {},
          {
            $set: {
              EventId: latestEvent.EventId,
            },
          },
          {
            upsert: true,
          },
        );
      } catch (e) {
        return logger.error(`Failed to update last event ID "${latestEvent.EventId}". (${e})"`);
      }
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
