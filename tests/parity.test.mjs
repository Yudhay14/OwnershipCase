import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { cleanText, normalizeKey } from "../src/utils/text.js";
import { formatDateToString } from "../src/utils/dates.js";
import {
  scheduleHour,
  isEligibleSchedule,
  scheduleStatus,
} from "../src/utils/schedule.js";
import { getColumn } from "../src/utils/columns.js";

/**
 * Parity test: the ported helpers must behave exactly like the functions that
 * still live in the legacy HTML file. We extract those functions by name
 * (dependency-free) and compare outputs over a battery of inputs.
 */

const here = dirname(fileURLToPath(import.meta.url));
const legacyHtml = readFileSync(resolve(here, "../ownership_digital_checker_v6.html"), "utf8");

function extractFunction(name) {
  const start = legacyHtml.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `legacy function ${name} not found`);
  const open = legacyHtml.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < legacyHtml.length; i += 1) {
    const ch = legacyHtml[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return legacyHtml.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

const HELPERS = [
  "cleanText",
  "normalizeKey",
  "getCleanDateString",
  "formatDateToString",
  "scheduleHour",
  "isEligibleSchedule",
  "scheduleStatus",
  "getColumn",
];

const legacySource = HELPERS.map(extractFunction).join("\n") + `\nreturn { ${HELPERS.join(", ")} };`;
// eslint-disable-next-line no-new-func
const legacy = new Function(legacySource)();

const ported = {
  cleanText,
  normalizeKey,
  formatDateToString,
  scheduleHour,
  isEligibleSchedule,
  scheduleStatus,
  getColumn,
};

const TEXT_CASES = [
  "",
  "   ",
  "hello",
  "  hello   world  ",
  "\u200Bzero\u200Bwidth\uFEFF",
  "line\nbreak\ttab",
  null,
  undefined,
  "  2026-10-07  ",
];

const DATE_CASES = [
  "",
  null,
  undefined,
  45123,
  45123.75,
  "45123",
  "2026-10-07",
  "2026-10-07 10:00:00",
  "10/7/2026",
  "07-10-2026",
  "not a date",
  "13:45",
];

const SCHEDULE_CASES = [
  "",
  "5",
  "5a",
  "5b",
  "5:30",
  "05:00",
  "6",
  "12:30",
  "14",
  "14:59",
  " 14a ",
  "15",
  "15:30",
  "X",
  "OFF",
  "L",
  "AL",
  "ML",
  "-",
  "SL",
  "0.2083333",
  "23:59",
  "24:00",
  "abs",
];

test("text helpers match the legacy implementation", () => {
  for (const value of TEXT_CASES) {
    assert.equal(cleanText(value), legacy.cleanText(value), `cleanText(${String(value)})`);
    assert.equal(normalizeKey(value), legacy.normalizeKey(value), `normalizeKey(${String(value)})`);
  }
});

test("formatDateToString matches the legacy implementation", () => {
  for (const value of DATE_CASES) {
    assert.equal(
      formatDateToString(value),
      legacy.formatDateToString(value),
      `formatDateToString(${String(value)})`
    );
  }
});

test("schedule helpers match the legacy implementation", () => {
  for (const value of SCHEDULE_CASES) {
    assert.equal(scheduleHour(value), legacy.scheduleHour(value), `scheduleHour(${value})`);
    assert.equal(
      isEligibleSchedule(value),
      legacy.isEligibleSchedule(value),
      `isEligibleSchedule(${value})`
    );
    assert.equal(scheduleStatus(value), legacy.scheduleStatus(value), `scheduleStatus(${value})`);
  }
});

test("getColumn matches the legacy implementation", () => {
  const rows = [
    { "CASE ID": "C-1", AGENT: "Yulia Prihatini", MSISDN: "" },
    { "case id": "C-2", "Agent Name": "Arpin", "Log In ID": "VADS.X" },
    { "CASE_ID_EXTRA": "C-3", DAY: "2026-10-07" },
    {},
  ];

  const candidateSets = [
    ["CASE ID", "Case ID"],
    ["AGENT", "Agent", "Agent Name"],
    ["LOG IN ID", "Log In ID"],
    ["MSISDN"],
    ["ID 1", "ID1"],
    ["CREATE DATE", "Create Date", "DAY", "Day"],
  ];

  for (const row of rows) {
    for (const candidates of candidateSets) {
      assert.equal(
        getColumn(row, candidates, "-"),
        legacy.getColumn(row, candidates, "-"),
        `getColumn(${JSON.stringify(row)}, ${candidates.join("|")})`
      );
    }
  }
});

test("eligibility window is 05:00 inclusive to 15:00 exclusive", () => {
  assert.equal(isEligibleSchedule("5"), true);
  assert.equal(isEligibleSchedule("5a"), true);
  assert.equal(isEligibleSchedule("14:59"), true);
  assert.equal(isEligibleSchedule("14a"), true);
  assert.equal(isEligibleSchedule("15"), false);
  assert.equal(isEligibleSchedule("14:59:59"), true);
  assert.equal(isEligibleSchedule("4"), false);
  assert.equal(isEligibleSchedule("OFF"), false);
  assert.equal(isEligibleSchedule("X"), false);
});
