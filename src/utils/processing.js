import { cleanText } from "./text.js";
import { formatDateToString } from "./dates.js";
import { getColumn } from "./columns.js";
import { findMasterAgent, findRegularAgent, findSupportAgent } from "./agents.js";
import { getScheduleForAgent, isEligibleSchedule } from "./schedule.js";
import { getEffectiveAgentMaster } from "./agentStore.js";
import { normalizeKey } from "./text.js";

/**
 * Core processing - ported VERBATIM from ownership_digital_checker_v6.html.
 *
 * LOCKED ALGORITHM (do not change):
 *  1. Creator WCT is checked against Agent Utama first, then Support.
 *  2. Creator with schedule 05-14 keeps ownership -> Checker = that agent.
 *  3. Creator with schedule 15+, X, OFF, etc. -> redistribution pool.
 *  4. Support (schedule shown as "Support") -> redistribution pool.
 *  5. Unknown creator is dropped (never silently reassigned).
 *  6. Redistribution pool is split evenly (round-robin) over agents duty 05-14.
 *  7. Creator is never rewritten.
 */

export const CHECKER_TYPE = {
  PENDING: "pending",
  SUPPORT: "support",
  OWNERSHIP: "ownership",
  REDISTRIBUTION: "redistribution",
  UNMAPPED: "unmapped",
};

/**
 * Legacy `prosesSemuaData()` computation.
 * Returns the merged rows plus the Biasa/WCT counters.
 */
export function computeMergedData({
  rawDataBiasa,
  rawDataWCT,
  scheduleJakarta,
  scheduleJogja,
  date1,
  date2,
}) {
  const filterDates = [date1];
  if (date2) filterDates.push(date2);

  const finalMergedData = [];
  let cBiasaGlobal = 0;
  let cWCTGlobal = 0;

  // LOG BIASA
  if (rawDataBiasa.length > 0) {
    rawDataBiasa.forEach((row) => {
      const agentRaw = cleanText(getColumn(row, ["AGENT", "Agent", "Agent Name"], ""));
      const createDate = formatDateToString(
        getColumn(row, ["CREATE DATE", "Create Date", "DAY", "Day"], "")
      );
      if (!agentRaw || !filterDates.includes(createDate)) return;

      const master = findMasterAgent(agentRaw);
      if (!master) return;

      const scheduleInfo = getScheduleForAgent(master.name, scheduleJakarta, scheduleJogja);
      cBiasaGlobal++;

      finalMergedData.push({
        kategori: "BIASA",
        caseId: getColumn(row, ["CASE ID", "Case ID"], "-") || "-",
        createDate,
        creator: agentRaw,
        creatorCanonical: master.name,
        schedule: scheduleInfo ? scheduleInfo.schedule : "-",
        scheduleLocation: scheduleInfo ? scheduleInfo.location : "-",
        checker: "-",
        checkerType: CHECKER_TYPE.PENDING,
        loginId: getColumn(row, ["LOG IN ID", "Log In ID"], "-") || "-",
        msisdn: getColumn(row, ["MSISDN"], "-") || "-",
        id1: getColumn(row, ["ID 1", "ID1"], "-") || "-",
      });
    });
  }

  // LOG WCT
  if (rawDataWCT.length > 0) {
    rawDataWCT.forEach((row) => {
      const creatorRaw = cleanText(getColumn(row, ["Creator"], ""));
      const createDate = formatDateToString(
        getColumn(row, ["Case Creation Time", "CREATE DATE", "Create Date"], "")
      );
      if (!creatorRaw || !filterDates.includes(createDate)) return;

      // Creator WCT boleh berasal dari:
      // 1) 234 master agent utama, atau
      // 2) daftar Support tambahan.
      // Creator di luar kedua daftar langsung diabaikan.
      const master = findRegularAgent(creatorRaw);
      const support = findSupportAgent(creatorRaw);
      if (!master && !support) return;

      const scheduleInfo = master
        ? getScheduleForAgent(master.name, scheduleJakarta, scheduleJogja)
        : null;
      const isSupport = !master && !!support;
      const canonicalName = master ? master.name : support.name;

      cWCTGlobal++;

      finalMergedData.push({
        kategori: "WCT",
        caseId: getColumn(row, ["Case Code", "CASE ID", "Case ID"], "-") || "-",
        createDate,
        creator: creatorRaw,
        creatorCanonical: canonicalName,
        schedule: isSupport ? "Support" : scheduleInfo ? scheduleInfo.schedule : "-",
        scheduleLocation: isSupport
          ? "SUPPORT"
          : scheduleInfo
            ? scheduleInfo.location
            : "-",
        checker: "-",
        checkerType: isSupport ? CHECKER_TYPE.SUPPORT : CHECKER_TYPE.PENDING,
        loginId: getColumn(row, ["LOG IN ID ", "LOG IN ID", "Log In ID"], "-") || "-",
        msisdn: getColumn(row, ["Service Number", "MSISDN"], "-") || "-",
        id1: getColumn(row, ["ID1", "ID 1"], "-") || "-",
      });
    });
  }

  return { finalMergedData, cBiasaGlobal, cWCTGlobal };
}

/**
 * Legacy `bagiCheckerOtomatis()` computation.
 * Returns { ok:false, message } when no eligible agent exists, otherwise the
 * updated rows plus the redistribution count.
 */
export function distributeCheckers(finalMergedData, scheduleJakarta, scheduleJogja) {
  const allSchedule = {};
  Object.values(scheduleJakarta).forEach(
    (x) => (allSchedule[normalizeKey(x.agentName)] = x)
  );
  Object.values(scheduleJogja).forEach((x) => {
    if (!allSchedule[normalizeKey(x.agentName)]) allSchedule[normalizeKey(x.agentName)] = x;
  });

  // Eligible receiver list: schedule starts from 05:00 up to before 15:00.
  // This includes 5a, 5b, 5:30, 6, ..., 14a, etc.
  // Urutan penerima mengikuti daftar Agent Utama efektif (termasuk tambahan admin).
  const eligibleAgents = getEffectiveAgentMaster()
    .map((agent) => allSchedule[normalizeKey(agent.name)])
    .filter(Boolean)
    .filter((info) => isEligibleSchedule(info.schedule));

  if (eligibleAgents.length === 0) {
    return {
      ok: false,
      message: "Tidak ada agent dengan schedule 05-14 yang ditemukan.",
    };
  }

  // Reset all assignments.
  finalMergedData.forEach((item) => {
    if (item.checkerType !== CHECKER_TYPE.UNMAPPED) {
      item.checker = "-";
      item.checkerType = CHECKER_TYPE.PENDING;
    }
  });

  // 1) Creator with schedule 05-14 keeps ownership.
  // 2) Creator with schedule 15+, X, OFF, etc. enters redistribution pool.
  // 3) Unknown creator remains unmapped and is not silently reassigned.
  const redistributionPool = [];

  finalMergedData.forEach((item) => {
    if (item.checkerType === CHECKER_TYPE.UNMAPPED) return;

    // Support tetap dikerjakan. Karena Support tidak punya schedule 05-14,
    // case Support masuk ke pool redistribusi dan dibagi rata ke agent
    // yang duty 05-14. Schedule asli tetap ditampilkan sebagai "Support".
    if (item.checkerType === CHECKER_TYPE.SUPPORT) {
      item.checker = "-";
      item.checkerType = CHECKER_TYPE.REDISTRIBUTION;
      redistributionPool.push(item);
      return;
    }

    const master = findRegularAgent(item.creatorCanonical || item.creator);
    const scheduleInfo = master
      ? getScheduleForAgent(master.name, scheduleJakarta, scheduleJogja)
      : null;

    if (master && scheduleInfo && isEligibleSchedule(scheduleInfo.schedule)) {
      item.creatorCanonical = master.name;
      item.schedule = scheduleInfo.schedule;
      item.scheduleLocation = scheduleInfo.location;
      item.checker = master.name;
      item.checkerType = CHECKER_TYPE.OWNERSHIP;
    } else {
      item.checker = "-";
      item.checkerType = CHECKER_TYPE.REDISTRIBUTION;
      redistributionPool.push(item);
    }
  });

  // Equal additional distribution. This intentionally does NOT balance total
  // workload; each eligible agent receives approximately the same number of
  // redistribution cases on top of their own cases.
  redistributionPool.forEach((item, index) => {
    const target = eligibleAgents[index % eligibleAgents.length];
    item.checker = target.agentName;
    item.checkerType = CHECKER_TYPE.REDISTRIBUTION;
    item.checkerSchedule = target.schedule;
  });

  return {
    ok: true,
    finalMergedData,
    redisCount: redistributionPool.length,
    eligibleAgentsCount: eligibleAgents.length,
  };
}
