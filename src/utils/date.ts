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
 * Robustly parses a date string into a timestamp for sorting purposes.
 * Supports DD/MM/YY, DD/MM/YYYY, multi-date ranges (e.g. "16/07/2026 & 17/07/2026"), and typos (e.g. "28/072026").
 */
export function parseEventDate(dateStr: string): number {
  if (!dateStr) return 0;
  try {
    const trimmed = String(dateStr).trim();
    
    // 1. Check if there are multiple dates or ranges like "16/07/2026 & 17/07/2026" or "16/07/2026 - 17/07/2026"
    // Split by non-alphanumeric/separator symbols to get the first date
    const firstDatePart = trimmed.split(/[\s&\|\-]/)[0].trim();

    // 2. Try to match standard formats like DD/MM/YYYY or DD/MM/YY
    const standardMatch = firstDatePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (standardMatch) {
      const day = parseInt(standardMatch[1], 10);
      const month = parseInt(standardMatch[2], 10) - 1; // 0-based month
      let year = parseInt(standardMatch[3], 10);
      if (year < 100) {
        year += 2000; // assume 20xx for 2-digit years
      }
      return new Date(year, month, day).getTime();
    }

    // 3. Handle weird typos like "28/072026" where a slash might be missing between month and year
    const typoMatch = firstDatePart.match(/^(\d{1,2})\/(\d{1,2})(\d{4})$/);
    if (typoMatch) {
      const day = parseInt(typoMatch[1], 10);
      const month = parseInt(typoMatch[2], 10) - 1;
      const year = parseInt(typoMatch[3], 10);
      return new Date(year, month, day).getTime();
    }

    // 4. Fallback to standard JS Date.parse (e.g. YYYY-MM-DD)
    const parsed = Date.parse(firstDatePart);
    if (!isNaN(parsed)) {
      return parsed;
    }

    // 5. Try extracting any sequences of digits: e.g. "28/072026" or similar
    const digitParts = firstDatePart.match(/\d+/g);
    if (digitParts && digitParts.length >= 2) {
      const day = parseInt(digitParts[0], 10);
      const month = parseInt(digitParts[1], 10) - 1;
      let year = digitParts[2] ? parseInt(digitParts[2], 10) : new Date().getFullYear();
      if (year < 100) year += 2000;
      return new Date(year, month, day).getTime();
    }
  } catch (e) {
    console.warn("Failed to parse date string for sorting:", dateStr, e);
  }
  return 0;
}
