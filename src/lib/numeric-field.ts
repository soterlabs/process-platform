/**
 * Form UX for template `number` / `decimal_string` text inputs (keystroke cleanup only).
 */

/**
 * UI filter: only optional leading `-`, digits, and at most one `.` (decimal templates).
 * Strips letters and other symbols so paste/typing cannot produce invalid numeric text.
 */
export function sanitizeNumericFormInput(raw: string): string {
  if (raw === "") return "";
  let start = 0;
  let out = "";
  if (raw[0] === "-") {
    out = "-";
    start = 1;
  }
  let dotSeen = false;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i]!;
    if (c >= "0" && c <= "9") {
      out += c;
    } else if (c === "." && !dotSeen) {
      out += c;
      dotSeen = true;
    }
  }
  return out;
}
