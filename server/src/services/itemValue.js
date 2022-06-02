const albionData = require("../ports/albionData");
const logger = require("../helpers/logger");

const MAX_DIFF_BUY_SELL = 0.50;

const getAvg = (itemList) => {
  if (Array.isArray(itemList)) {
    return Math.round(itemList.reduce(((a, b) => b !== null && b.Type != '' && !isNaN(b.Value) ? a + b.Value : a), 0));
  } else {
    return Math.round(Object.values(itemList).reduce(((a, b) => b !== null && b.Type != '' && !isNaN(b.Value) ? a + b.Value : a), 0));
  }
};

const calculateValue = (itemValues, item) => {
  // Filter result for specific item.
  const ret = {Value: 0, UncertainValue: false};
  if (!item) return ret;

  let cheapestItem;
  const itemArray = itemValues.filter(
    x => x.item_id == item.Type && x.sell_price_min != 0 && (x.buy_price_max / x.sell_price_min > MAX_DIFF_BUY_SELL)
    );
  // If insufficient data, then use cheapest sell order ignoring quality.
  if (!itemArray.length) {
    cheapestItem = itemValues.filter(
      x => x.item_id == item.Type && x.sell_price_min != 0
      ).sort((a, b) => a.sell_price_min - b.sell_price_min).shift();
  }
  // Check if exact quality exist in result, else use all for average.
  const exactQuality = itemArray.filter(x => x.quality == item.Quality || item.Quality == 0);

  // Use best available data.
  const valArray = (exactQuality.length && exactQuality) || (itemArray.length && itemArray) || (cheapestItem && [cheapestItem]) || [];
  // Get average of available cities.
  ret.Value = valArray.map(x => x.sell_price_min).reduce(((a, b) => a + b), 0) / valArray.length * item.Count;

  // This may need some work.. what is considered uncertain?
  ret.UncertainValue = !(exactQuality.length || itemArray.length || item.Count == 0)
  // if (item.origin == 'victim') console.log(item, exactQuality.length, itemArray.length);

  return ret
};

async function getValueData(event) {
  const itemValues = await albionData.getValues(event);

  if (!itemValues) {
    logger.error(`No item value data available.`);
    return event;
  }

  logger.debug(`Found item value data of length: ${itemValues.length}`);

  // Killer
  Object.keys(event.Killer.Equipment).filter(key => event.Killer.Equipment[key] !== null).forEach(itemSlot => {
    Object.assign(event.Killer.Equipment[itemSlot], calculateValue(itemValues, event.Killer.Equipment[itemSlot]));
  });
  event.Killer.Value = getAvg(event.Killer.Equipment);

  // Victim
  Object.keys(event.Victim.Equipment).filter(key => event.Victim.Equipment[key] !== null).forEach(itemSlot => {
    Object.assign(event.Victim.Equipment[itemSlot], calculateValue(itemValues, event.Victim.Equipment[itemSlot]));
  });
  event.Victim.Value = getAvg(event.Victim.Equipment);

  // Victim inventory
  const inventoryItemValue = (item, index, arr) => {
    if (!item) return;
    arr[index] = Object.assign(item, calculateValue(itemValues, item));
  };
  event.Victim.Inventory.forEach(inventoryItemValue);
  event.Victim.InventoryValue = getAvg(event.Victim.Inventory);

  // We need to create a new object here so we don't change the original event
  return Object.assign({}, event);
}

module.exports = {
  getValueData,
};