const STATES = {
  START: "START",
  SELECT_FROM: "SELECT_FROM",
  SELECT_TO: "SELECT_TO",
  SELECT_DATE: "SELECT_DATE",
  END: "END",
  DONE: "DONE",
};

const CITIES = {
  MALAYER: {
    name: "ملایر",
    code: 75370000,
  },
  TEHRAN: {
    name: "تهران",
    code: 11320000,
  },
  HAMEDAN: {
    name: "همدان",
    code: 75310000,
  },
  ESFAHAN: {
    name: "اصفهان",
    code: 21310000,
  },
  ASALOOIE: {
    name: "عسلویه",
    code: 95410000,
  },
  KERMANSHAH: {
    name: "کرمانشاه",
    code: 71310000,
  },
  SHIRAZ: {
    name: "شیراز",
    code: 41310000,
  },
  RASHT: {
    name: "رشت",
    code: 54310000,
  },
  TABRIZ: {
    name: "تبریز",
    code: 26310000,
  },
  AHVAZ: {
    name: "اهواز",
    code: 36310000,
  },
  MASHHAD: {
    name: "مشهد",
    code: 31310000,
  },
  YAZD: {
    name: "یزد",
    code: 93310000,
  },
};

const BUS_URL = "https://ws.alibaba.ir/api/v2/bus/available?";

module.exports = {
  CITIES,
  STATES,
  BUS_URL,
};
