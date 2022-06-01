const axios = require("axios");
const logger = require("../helpers/logger");
const { sleep } = require("../helpers/utils");

const PRICES_ENDPOINT = "prices";
const HISTORY_ENDPOINT = "history";
const CHARTS_ENDPOINT = "charts";
const GOLD_ENDPOINT = "gold";

const albionDataClient = axios.create({
  baseURL: "https://www.albion-online-data.com/api/v2/stats/",
});

// Setup timeouts for crawler axios client because sometimes server just hangs indefinetly
albionDataClient.interceptors.request.use((config) => {
  const source = axios.CancelToken.source();
  setTimeout(() => {
    source.cancel("Client timeout");
  }, 60000);
  config.cancelToken = source.token;
  return config;
});

// Also, setup an automatic retry mechanism since API throws a lot of 504 errors
albionDataClient.interceptors.response.use(null, async (error) => {
  const { config, response } = error;

  if (config && response && response.status == 504) {
    logger.warn(`Albion Data API request to ${config.url} returned ${response.status}. Retrying...`);
    await sleep(5000);
    return albionDataClient.request(config);
  }

  return Promise.reject(error);
});

async function getValueData(itemsQuery) {
  const res = await albionDataClient.get(`${PRICES_ENDPOINT}/${itemsQuery}.json`);
  return res.data;
}

module.exports = {
  getValueData,
};