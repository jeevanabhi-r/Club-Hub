/**
 * Formats any input date string/object to DD/MM/YY format.
 * E.g., "2026-10-15" -> "15/10/26"
 * E.g., "2026-07-06T08:25:44Z" -> "06/07/26"
 */
export function formatToDDMMYY(dateInput: any): string {
  if (!dateInput) return "";
  try {
    const str = String(dateInput).trim();
    
    // Check if it's already in DD/MM/YY or DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str)) {
      const parts = str.split("/");
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      let year = parts[2];
      if (year.length === 4) {
        year = year.slice(2);
      }
      return `${day}/${month}/${year}`;
    }

    let dateObj: Date;
    
    // If dateInput is like YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split("-").map(Number);
      dateObj = new Date(y, m - 1, d);
    } else {
      dateObj = new Date(dateInput);
    }

    if (isNaN(dateObj.getTime())) {
      // Fallback: If it's a string like MM/DD/YYYY
      const matches = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (matches) {
        const month = matches[1].padStart(2, "0");
        const day = matches[2].padStart(2, "0");
        let year = matches[3];
        if (year.length === 4) year = year.slice(2);
        return `${day}/${month}/${year}`;
      }
      return str; // can't parse, return as is
    }

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = String(dateObj.getFullYear()).slice(-2); // yy format

    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(dateInput);
  }
}

/**
 * Robustly parses a single date token into year, month (0-indexed), day.
 */
export function parseSingleDatePart(partStr: string, fallbackYear: number): { year: number; month: number; day: number } | null {
  if (!partStr) return null;
  const trimmed = partStr.trim();
  if (!trimmed) return null;

  // 1. ISO YYYY-MM-DD or YYYY/MM/DD
  let m = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    if (mo >= 0 && mo <= 11 && d >= 1 && d <= 31) {
      return { year: y, month: mo, day: d };
    }
  }

  // 2. Standard DD/MM/YYYY or DD/MM/YY or DD-MM-YYYY or DD-MM-YY
  m = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    if (mo >= 0 && mo <= 11 && d >= 1 && d <= 31) {
      return { year: y, month: mo, day: d };
    }
  }

  // 3. Typo DD/MMYYYY e.g. 28/072026
  m = trimmed.match(/^(\d{1,2})\/(\d{1,2})(\d{4})$/);
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const y = parseInt(m[3], 10);
    if (mo >= 0 && mo <= 11 && d >= 1 && d <= 31) {
      return { year: y, month: mo, day: d };
    }
  }

  // 4. Partial DD/MM or DD-MM without year
  m = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    if (mo >= 0 && mo <= 11 && d >= 1 && d <= 31) {
      return { year: fallbackYear, month: mo, day: d };
    }
  }

  // 5. Fallback Date.parse
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    const dt = new Date(parsed);
    return { year: dt.getFullYear(), month: dt.getMonth(), day: dt.getDate() };
  }

  return null;
}

/**
 * Robustly parses a date string into a timestamp for sorting purposes (takes start date).
 * Supports DD/MM/YY, DD/MM/YYYY, multi-date ranges (e.g. "16/07/2026 & 17/07/2026"), and typos (e.g. "28/072026").
 */
export function parseEventDate(dateStr: string): number {
  if (!dateStr) return 0;
  try {
    const str = String(dateStr).trim();
    const yearMatches = str.match(/\b(20\d{2})\b/g);
    const fallbackYear = yearMatches ? parseInt(yearMatches[yearMatches.length - 1], 10) : new Date().getFullYear();

    const parts = str.split(/[\s&\|,;]+|\s+to\s+|\s+and\s+|\s+[\-–—]\s+/i);

    for (const p of parts) {
      const parsed = parseSingleDatePart(p, fallbackYear);
      if (parsed) {
        return new Date(parsed.year, parsed.month, parsed.day).getTime();
      }
    }

    const fallbackParsed = parseSingleDatePart(str, fallbackYear);
    if (fallbackParsed) {
      return new Date(fallbackParsed.year, fallbackParsed.month, fallbackParsed.day).getTime();
    }
  } catch (e) {
    console.warn("Failed to parse date string for sorting:", dateStr, e);
  }
  return 0;
}

/**
 * Computes the timestamp (in ms) for the END date and time of an event.
 * Supports single-day (e.g. "23/07/2026"), multi-day (e.g. "22/07/2026 & 23/07/2026", "22/07/2026 - 25/07/2026"),
 * ISO dates ("2026-07-23"), typos ("28/072026"), and time strings (e.g. "4:00 PM", "10:00 AM - 5:00 PM").
 */
export function getEventEndTimestamp(dateStr: string, timeStr?: string): number {
  if (!dateStr) return 0;
  try {
    const str = String(dateStr).trim();
    const yearMatches = str.match(/\b(20\d{2})\b/g);
    const fallbackYear = yearMatches ? parseInt(yearMatches[yearMatches.length - 1], 10) : new Date().getFullYear();

    // Split multi-day date strings safely
    const parts = str.split(/[\s&\|,;]+|\s+to\s+|\s+and\s+|\s+[\-–—]\s+/i);
    const candidates: { year: number; month: number; day: number }[] = [];

    for (const p of parts) {
      const parsed = parseSingleDatePart(p, fallbackYear);
      if (parsed) candidates.push(parsed);
    }

    if (candidates.length === 0) {
      const fallbackParsed = parseSingleDatePart(str, fallbackYear);
      if (fallbackParsed) candidates.push(fallbackParsed);
    }

    if (candidates.length === 0) return 0;

    // Get latest date
    let maxCand = candidates[0];
    let maxVal = new Date(maxCand.year, maxCand.month, maxCand.day).getTime();
    for (let i = 1; i < candidates.length; i++) {
      const c = candidates[i];
      const val = new Date(c.year, c.month, c.day).getTime();
      if (val > maxVal) {
        maxVal = val;
        maxCand = c;
      }
    }

    let hours = 23;
    let minutes = 59;
    let seconds = 59;

    if (timeStr && String(timeStr).trim()) {
      const tStr = String(timeStr).trim();
      const timeParts = tStr.split(/[-–—to]/i);
      const lastPart = timeParts[timeParts.length - 1].trim();

      const tm = lastPart.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/);
      if (tm) {
        let h = parseInt(tm[1], 10);
        const m = tm[2] ? parseInt(tm[2], 10) : 0;
        const ampm = tm[3] ? tm[3].toUpperCase() : null;

        if (ampm === "PM" && h < 12) h += 12;
        if (ampm === "AM" && h === 12) h = 0;

        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
          hours = h;
          minutes = m;
          seconds = 0;
        }
      }
    }

    const endDate = new Date(maxCand.year, maxCand.month, maxCand.day, hours, minutes, seconds);
    return endDate.getTime();
  } catch (e) {
    return 0;
  }
}

/**
 * Checks if an event has passed based on its date string and optional time string.
 * Compares with local user current date & time.
 */
export function isPastEvent(dateStr: string, timeStr?: string): boolean {
  const endTimestamp = getEventEndTimestamp(dateStr, timeStr);
  if (endTimestamp === 0) return false;
  return Date.now() > endTimestamp;
}
