const albionDataClient = require("../adapters/albionDataClient");
const logger = require("../helpers/logger");

const formatItemList = (event) => {
  const formatItem = (item, origin) => {
    if (item) {
      return {name: item.Type, count: item.Count, quality: item.Quality, origin: origin};
    } else {
      return {name: '', count: 0, quality: 0, origin: origin};
    }
  }

  const {Killer: {Equipment: kItems}, Victim: {Equipment: vItems, Inventory: vInventory}} = event;
  const killer = Object.values(kItems).map(item => formatItem(item, 'killer')),
    victim = Object.values(vItems).map(item => formatItem(item, 'victim')),
    inventory = vInventory.map(item => formatItem(item, 'inventory'));

  return [].concat(killer, victim, inventory);
}

async function getValues(event) {
  const itemsQuery = formatItemList(event).map(item => item.name).join(',')
  try {
    logger.debug(`Fetching item values`);
    return await albionDataClient.getValueData(itemsQuery);
  } catch (e) {
    logger.error(`Unable to fetch value data from API [${e}].`);
    return null;
  }
}

module.exports = {
  formatItemList,
  getValues,
};