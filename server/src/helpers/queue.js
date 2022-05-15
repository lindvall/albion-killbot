const rabbitMQClient = require("../adapters/rabbitMQClient");

const EVENTS_EXCHANGE = "events";
const BATTLES_EXCHANGE = "battles";
const PREFETCH_COUNT = 1;

async function init() {
  await rabbitMQClient.connect();
}

async function publishEvent(data) {
  return await rabbitMQClient.publish(EVENTS_EXCHANGE, "", data);
}

async function publishBattle(data) {
  return await rabbitMQClient.publish(BATTLES_EXCHANGE, "", data);
}

async function subscribeEventsToQueue(queue, cb) {
  return await rabbitMQClient.subscribe(EVENTS_EXCHANGE, queue, cb, {
    prefetch: PREFETCH_COUNT,
  });
}

async function subscribeBattlesToQueue(queue, cb) {
  return await rabbitMQClient.subscribe(BATTLES_EXCHANGE, queue, cb, {
    prefetch: PREFETCH_COUNT,
  });
}

async function unsubscribeAll() {
  return await rabbitMQClient.unsubscribeAll();
}

module.exports = {
  init,
  publishBattle,
  publishEvent,
  subscribeEventsToQueue,
  subscribeBattlesToQueue,
  unsubscribeAll,
};