const axios = require("axios");
const config = require("../config/config");

async function sendTelegramAlert(message) {
  if (!config.integrations.telegramBotToken || !config.integrations.telegramChatId) {
    return false;
  }

  await axios.post(
    `https://api.telegram.org/bot${config.integrations.telegramBotToken}/sendMessage`,
    {
      chat_id: config.integrations.telegramChatId,
      text: message,
    },
    { timeout: 10000 }
  );

  return true;
}

module.exports = {
  sendTelegramAlert,
};
