export type CheckoutValidationError = {
  request_id: string;
  error_type: string;
  error_codes: string[];
};

export const CHECKOUT_VALIDATION_ERROR_HTTP_CODE = 422;

// From CKO Reason Code Sheet
// https://docs.google.com/spreadsheets/d/1oKId5tkrMd3kX1gc5bQHgEpdresXG42ZNm317NSP6hc/edit#gid=1564688138

// Approved: 10*
// Soft declined: 20*
// Hard declined: 30*
// Risk: 40*

export const REASON_CODE_SOFT_DECLINE_CARD_ERROR: string[] = [
  "20014",
  "20030",
  "20068",
  "20087",
  "20091",
  "20096",
  "20104",
  "20105",
  "20152",
  "20153",
  "20154",
];

export const REASON_CODE_SOFT_DECLINE_NO_CRYPTO: string[] = ["20057", "20058", "20182"];

export const REASON_CODE_SOFT_DECLINE_BANK_ERROR: string[] = [
  "20001",
  "20002",
  "20003",
  "20005",
  "20006",
  "20009",
  "20010",
  "20012",
  "20021",
  "20023",
  "20024",
  "20025",
  "20026",
  "20027",
  "20028",
  "20029",
  "20031",
  "20032",
  "20038",
  "20039",
  "20040",
  "20042",
  "20044",
  "20046",
  "20051",
  "20052",
  "20053",
  "20054",
  "20055",
  "20056",
  "20059",
  "20060",
  "20061",
  "20062",
  "20063",
  "20064",
  "20065",
  "20066",
  "20067",
  "20075",
  "20078",
  "20082",
  "20083",
  "20084",
  "20085",
  "20086",
  "20088",
  "20089",
  "20090",
  "20092",
  "20093",
  "20094",
  "20095",
  "20097",
  "20098",
  "2006P",
  "200N0",
  "200N7",
  "200O5",
  "200P1",
  "200P9",
  "200R1",
  "200R3",
  "200S4",
  "200T2",
  "200T3",
  "200T5",
  "20100",
  "20102",
  "20103",
  "20106",
  "20107",
  "20108",
  "20109",
  "20110",
  "20111",
  "20112",
  "20113",
  "20115",
  "20116",
  "20121",
  "20123",
  "20124",
  "20150",
  "20151",
  "20155",
  "20179",
  "20183",
];

export const REASON_CODE_SOFT_DECLINE_BANK_ERROR_ALERT_NOBA: string[] = [
  "20117",
  "20118",
  "20119",
  "20120",
  "20099",
  "20013",
];
