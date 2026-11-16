import { categorise } from "./keywords";
import { addDays, todayIST } from "./dates";

export type ParsedExpense = {
  amountPaise: number; // 0 means "no amount found" — saved for review, never dropped
  item: string;
  category: string;
  paymentMode: string;
  spentOn: string; // YYYY-MM-DD
  rawText: string;
};

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
};
const SCALES: Record<string, number> = {
  hundred: 100, thousand: 1000, hazaar: 1000, hazar: 1000, lakh: 100000, lac: 100000, k: 1000,
};

/** Turns "two hundred fifty" / "one thousand" into digits so the rest of the parser sees numbers. */
function wordsToDigits(text: string): string {
  const tokens = text.split(/\s+/);
  const out: string[] = [];
  let total = 0;
  let current = 0;
  let active = false;
  const flush = () => {
    if (active) out.push(String(total + current));
    total = 0;
    current = 0;
    active = false;
  };
  for (const tok of tokens) {
    const w = tok.replace(/[^a-z]/g, "");
    if (w in UNITS && w === tok) {
      current += UNITS[w];
      active = true;
    } else if (active && (w === "hundred") && w === tok) {
      current = (current || 1) * 100;
    } else if (active && w in SCALES && w !== "k" && w === tok) {
      total += (current || 1) * SCALES[w];
      current = 0;
    } else {
      flush();
      out.push(tok);
    }
  }
  flush();
  return out.join(" ");
}

const CURRENCY = "(?:₹|rs\\.?|inr|rupees?|rupaye|rupay|rupiya|rupaiya|bucks)";
const NUMBER = "(\\d+(?:\\.\\d+)?)(?:\\s*(k|thousand|hazaar|hazar|lakh|lac|hundred)(?![a-z]))?";

type Found = { value: number; start: number; end: number; marked: boolean };

function findAmounts(text: string): Found[] {
  const found: Found[] = [];
  const re = new RegExp(`((?<![a-z])${CURRENCY}\\s*)?${NUMBER}(\\s*${CURRENCY}(?![a-z]))?(?:\\s*\\/-)?`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    // skip numbers glued to letters, like "ps5" or "1mg"
    const before = text[m.index - 1];
    const after = text[m.index + m[0].length];
    if (!m[1] && before && /[a-z]/i.test(before)) continue;
    if (!m[4] && !m[3] && after && /[a-z]/i.test(after)) continue;
    let value = parseFloat(m[2]);
    if (m[3]) value *= SCALES[m[3].toLowerCase()];
    found.push({ value, start: m.index, end: m.index + m[0].length, marked: Boolean(m[1] || m[4]) });
  }
  return found;
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Pulls a date phrase out of the sentence. Returns the date and the sentence without the phrase. */
function extractDate(text: string, today: string): { date: string; rest: string } {
  let m: RegExpMatchArray | null;
  if ((m = text.match(/\b(day before yesterday|parso|parson)\b/))) {
    return { date: addDays(today, -2), rest: text.replace(m[0], " ") };
  }
  if ((m = text.match(/\b(yesterday|kal)\b/))) {
    return { date: addDays(today, -1), rest: text.replace(m[0], " ") };
  }
  if ((m = text.match(/\b(today|aaj)\b/))) {
    return { date: today, rest: text.replace(m[0], " ") };
  }
  if ((m = text.match(/\b(\d+)\s+days?\s+(ago|back|pehle)\b/))) {
    return { date: addDays(today, -Math.min(parseInt(m[1]), 365)), rest: text.replace(m[0], " ") };
  }
  if ((m = text.match(new RegExp(`\\b(?:on\\s+|last\\s+)(${WEEKDAYS.join("|")})\\b`)))) {
    const target = WEEKDAYS.indexOf(m[1]);
    const now = new Date(today + "T00:00:00Z").getUTCDay();
    const back = (now - target + 7) % 7 || 7;
    return { date: addDays(today, -back), rest: text.replace(m[0], " ") };
  }
  // "on 5th", "on the 12th", "5th november", "12 nov"
  const monthRe = `(${MONTHS.join("|")})[a-z]*`;
  if (
    (m = text.match(new RegExp(`\\b(?:on\\s+)?(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${monthRe}\\b`))) ||
    (m = text.match(/\b(?:on\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/))
  ) {
    const day = parseInt(m[1]);
    let year = parseInt(today.slice(0, 4));
    let month = m[2] ? MONTHS.indexOf(m[2]) + 1 : parseInt(today.slice(5, 7));
    if (day >= 1 && day <= 31) {
      const build = () => `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (build() > today) {
        // a date in the future means the person meant the previous month / year
        if (m[2]) year -= 1;
        else if (--month === 0) {
          month = 12;
          year -= 1;
        }
      }
      const candidate = build();
      if (!Number.isNaN(Date.parse(candidate + "T00:00:00Z"))) {
        return { date: candidate, rest: text.replace(m[0], " ") };
      }
    }
  }
  return { date: today, rest: text };
}

const MODES: [RegExp, string][] = [
  [/\b(?:(?:by|via|using|through|in|with|from|on|paid)\s+)?(?:hard\s+)?cash\b/, "Cash"],
  [/\b(?:(?:by|via|using|through|with|from|on)\s+)?(?:upi|gpay|g pay|google pay|phonepe|phone pe|bhim)\b/, "UPI"],
  [/\b(?:by|via|using|through|with|from|on)\s+paytm\b/, "UPI"],
  [/\b(?:(?:by|via|using|through|with|from|on)\s+)?(?:credit|debit)\s+card\b/, "Card"],
  [/\b(?:by|via|using|through|with|from|on)\s+card\b/, "Card"],
  [/\b(?:(?:by|via|using|through|with|from)\s+)?(?:net ?banking|bank transfer|neft|imps)\b/, "Bank"],
];

function extractMode(text: string): { mode: string; rest: string } {
  for (const [re, mode] of MODES) {
    const m = text.match(re);
    if (m) return { mode, rest: text.replace(m[0], " ") };
  }
  return { mode: "", rest: text };
}

const FILLER = new Set([
  "for", "on", "of", "to", "the", "a", "an", "i", "spent", "spend", "paid", "pay", "gave", "give",
  "bought", "buy", "worth", "was", "is", "in", "at", "my", "me", "got", "had", "took", "add", "log",
  "expense", "ka", "ki", "ke", "ko", "liye", "mein", "me", "diya", "diye", "kharcha", "kharch", "hua",
  "and", "aur", "then", "also", "today", "rupees", "rs",
]);

function cleanItem(text: string): string {
  const words = text
    .replace(/[^\p{L}\p{N}&'’.\- ]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  while (words.length && FILLER.has(words[0].toLowerCase())) words.shift();
  while (words.length && FILLER.has(words[words.length - 1].toLowerCase())) words.pop();
  const item = words.join(" ").replace(/^[.\- ]+|[.\- ]+$/g, "");
  return item ? item[0].toUpperCase() + item.slice(1) : "";
}

function parseSegment(segment: string, today: string, rules?: Map<string, string>): ParsedExpense {
  const rawText = segment.trim();
  let text = wordsToDigits(rawText.toLowerCase().replace(/(\d),(?=\d)/g, "$1"));
  const dated = extractDate(text, today);
  text = dated.rest;
  const moded = extractMode(text);
  text = moded.rest;

  const amounts = findAmounts(text);
  let amountPaise = 0;
  if (amounts.length) {
    const marked = amounts.filter((a) => a.marked);
    const pick = (marked.length ? marked : amounts).reduce((a, b) => (b.value > a.value ? b : a));
    amountPaise = Math.round(pick.value * 100);
    text = text.slice(0, pick.start) + " " + text.slice(pick.end);
  }

  const item = cleanItem(text) || (amountPaise ? "Misc" : rawText);
  return {
    amountPaise,
    item,
    category: categorise(item, rules),
    paymentMode: moded.mode,
    spentOn: dated.date,
    rawText,
  };
}

/**
 * Parses what was said into one or more expenses.
 * "50rs for chai and 120 for lunch" gives two; "40 for bread and butter" gives one.
 */
export function parseExpenses(input: string, rules?: Map<string, string>, today = todayIST()): ParsedExpense[] {
  const results: ParsedExpense[] = [];
  for (const line of input.split(/[\n;]+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const pieces = trimmed.split(/\s*,\s+|\s+(?:and|aur|then|plus|also)\s+/i);
    const segments: string[] = [];
    for (const piece of pieces) {
      const hasNumber = findAmounts(wordsToDigits(piece.toLowerCase())).length > 0;
      if (hasNumber || segments.length === 0) segments.push(piece);
      else segments[segments.length - 1] += " and " + piece;
    }
    // a leading piece with no amount ("yesterday, 50 for chai") belongs to the next one
    if (segments.length > 1 && findAmounts(wordsToDigits(segments[0].toLowerCase())).length === 0) {
      segments[1] = segments[0] + " " + segments[1];
      segments.shift();
    }
    for (const segment of segments) results.push(parseSegment(segment, today, rules));
  }
  return results;
}

export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return "₹" + rupees.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
