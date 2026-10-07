/**
 * Date helpers - ported verbatim from ownership_digital_checker_v6.html.
 * LOCKED: the Excel-serial handling and the date filtering rules must not change.
 */

export function getCleanDateString(dObj) {
  return `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, "0")}-${String(
    dObj.getDate()
  ).padStart(2, "0")}`;
}

export function formatDateToString(dateInput) {
  if (dateInput === null || dateInput === undefined || dateInput === "") return "";
  let inputStr = String(dateInput).trim();
  if (inputStr.includes(" ")) inputStr = inputStr.split(" ")[0];

  if (!isNaN(dateInput) && inputStr.length >= 5 && !inputStr.includes("-") && !inputStr.includes("/")) {
    const d = new Date(Math.floor(parseFloat(dateInput) - 25569) * 86400 * 1000);
    return getCleanDateString(d);
  }

  const d = new Date(inputStr);
  if (!isNaN(d.getTime())) return getCleanDateString(d);
  return inputStr;
}
