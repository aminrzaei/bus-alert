require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const moment = require("jalali-moment");
const cron = require("node-cron");
const axios = require("axios");

const { CITIES, STATES, BUS_URL } = require("./constants");

const PORT = process.env.PORT || 3000;
const INTERVAL = process.env.INTERVAL || "*/5 * * * *"; // every 5 minutes;
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const app = express();

const users = {};
cron.schedule(INTERVAL, async () => {
  for (const key in users) {
    const user = users[key];
    if (user.state !== STATES.DONE || !user.active) return;
    const userFromCityCode = getCityByName(user.from);
    const userToCityCode = getCityByName(user.to);
    const userDate = convertDateToGregorian(user.date);
    const busList = await getAvailableBuses(
      userFromCityCode,
      userToCityCode,
      userDate
    );
    const availableToBuy = getAvailableToBuy(busList);
    if (availableToBuy.length === 0) {
      // bot.sendMessage(key, "هیچ اتوبوسی موجود نمیباشد 😥");
      return;
    }
    const report = createReport(availableToBuy);
    const report_header = `لیست اتوبوس های ${user.from} به ${user.to} در تاریخ ${user.date}:\n\n`;
    let fullReport = report_header + report;
    if (fullReport.length > 4096) {
      fullReport = fullReport.slice(0, 4096);
    }
    bot.sendMessage(key, fullReport);
  }
});

function getCityByName(cityName) {
  for (let city in CITIES) {
    if (CITIES[city].name === cityName) {
      return CITIES[city].code;
    }
  }
}

async function getAvailableBuses(from, to, date) {
  try {
    const res = await axios.get(
      `${BUS_URL}orginCityCode=${from}&destinationCityCode=${to}&requestDate=${date}&passengerCount=1`
    );
    const availableBuses = res.data.result.availableList;
    return availableBuses;
  } catch (err) {
    console.log(err);
  }
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getAvailableToBuy(busList) {
  const availableToBuy = [];
  busList.forEach((bus) => {
    if (bus.availableSeats > 0) {
      availableToBuy.push(`⏰ساعت حرکت: ${bus.departureTime}
🪑صندلی موجود: ${bus.availableSeats}
💰قیمت: ${formatNumber(bus.price / 10)} تومان
🚌نام تعاونی: ${bus.companyName}
🥇نوع اتوبوس: ${bus.busType}
📍پایانه مبدا: ${bus.orginTerminal}
🧭پایانه مقصد: ${bus.destinationTerminal}`);
    }
  });
  return availableToBuy;
}

function createReport(list) {
  return list.join(
    "\n ---------------- ---------------- ----------------  ---------------- \n"
  );
}

function convertDateToJalali(dateToConvert) {
  const m = moment(dateToConvert);
  return m.locale("fa").format("YYYY/MM/DD");
}

function convertDateToGregorian(date) {
  return moment.from(date, "fa", "YYYY/MM/DD").format("YYYY/MM/DD");
}

function createCitiesKeyBoard(toFilterCity = null) {
  const keyBoard = [];
  for (const key in CITIES) {
    if (toFilterCity && toFilterCity === CITIES[key].name) continue;
    keyBoard.push([
      {
        text: CITIES[key].name,
      },
    ]);
  }
  return keyBoard;
}

function createDatesKeyboard(currentDate) {
  const keyBoard = [];
  const days = [];
  const dayInMiliSeconds = 86400 * 1000;

  for (let i = 0; i < 5; i++) {
    const day = dayInMiliSeconds * i + currentDate * 1000;
    const jalalied = convertDateToJalali(day);
    days.push(jalalied);
  }

  days.forEach((day) => {
    keyBoard.push([
      {
        text: day,
      },
    ]);
  });
  return keyBoard;
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  users[chatId] = {
    active: true,
    state: STATES.SELECT_TO,
    from: null,
    to: null,
    date: null,
  };
  const fromCitiesKeyBoard = createCitiesKeyBoard();
  bot.sendMessage(chatId, "شهر مبدا را انتخاب کنید:", {
    reply_markup: {
      keyboard: fromCitiesKeyBoard,
    },
  });
});

bot.onText(/\/stop/, (msg) => {
  const chatId = msg.chat.id;
  users[chatId] = {
    active: false,
    state: null,
    from: null,
    to: null,
    date: null,
  };
});

bot.on("text", (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;
  const user = users[chatId];
  if (!user) return;
  const user_state = user.state;
  switch (user_state) {
    case STATES.SELECT_TO:
      const selectedFrom = text;
      users[chatId] = {
        ...users[chatId],
        state: STATES.SELECT_DATE,
        from: selectedFrom,
      };
      const toCitiesKeyBoard = createCitiesKeyBoard(selectedFrom);
      bot.sendMessage(chatId, "شهر مقصد را انتخاب کنید:", {
        reply_markup: {
          keyboard: toCitiesKeyBoard,
        },
      });
      break;
    case STATES.SELECT_DATE:
      const selectedTo = text;
      const currentDate = msg.date;
      users[chatId] = {
        ...users[chatId],
        state: STATES.END,
        to: selectedTo,
      };
      const datesKeyBoard = createDatesKeyboard(currentDate);
      bot.sendMessage(chatId, "تاریخ مورد نظر را انتخاب کنید:", {
        reply_markup: {
          keyboard: datesKeyBoard,
        },
      });
      break;
    case STATES.END:
      const selectedDate = text;
      users[chatId] = {
        ...users[chatId],
        state: STATES.DONE,
        date: selectedDate,
      };
      bot.sendMessage(
        chatId,
        `پیگیری شما اضافه شد 🙌/n
به محض موجود شدن اتوبوس به شما اطلاع رسانی می‌شود`,
        {
          reply_markup: {
            remove_keyboard: true,
          },
        }
      );
      break;
    default:
      break;
  }
});

app.get("/", (req, res) => {
  res.send("Bot server running...");
});

app.listen(PORT, () => {
  console.log(`BusAlert is running on port ${PORT}`);
});
