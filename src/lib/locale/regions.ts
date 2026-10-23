// Region-based pricing. A doctor's base fee is set in GBP (the Europe price) and each
// region applies its own multiplier and display currency. The multipliers below are the
// defaults; the live ones come from the backend (Fees & Commission, see lib/store/pricing.ts).

export type RegionId =
  | "europe"
  | "north_america"
  | "latin_america"
  | "middle_east"
  | "africa"
  | "south_asia"
  | "asia_pacific";

export interface Region {
  id: RegionId;
  name: string;
  currency: "GBP" | "USD";
  /** Multiplier applied to the doctor's base (Europe) fee. */
  multiplier: number;
}

export const REGIONS: Record<RegionId, Region> = {
  europe: { id: "europe", name: "Europe & UK", currency: "GBP", multiplier: 1 },
  north_america: { id: "north_america", name: "North America", currency: "USD", multiplier: 1 },
  middle_east: { id: "middle_east", name: "Middle East", currency: "USD", multiplier: 0.8 },
  asia_pacific: { id: "asia_pacific", name: "East Asia & Pacific", currency: "USD", multiplier: 0.6 },
  latin_america: { id: "latin_america", name: "Latin America", currency: "USD", multiplier: 0.45 },
  africa: { id: "africa", name: "Africa", currency: "USD", multiplier: 0.35 },
  south_asia: { id: "south_asia", name: "South Asia", currency: "USD", multiplier: 0.25 },
};

export const REGION_LIST = Object.values(REGIONS);

export const DEFAULT_REGION: RegionId = "europe";

/** Fixed rate used to express the base fee in USD. Not a live exchange rate. */
export const GBP_TO_USD = 1.3;

const COUNTRY_REGION: Record<RegionId, string[]> = {
  europe: [
    "GB", "IE", "FR", "DE", "ES", "PT", "IT", "NL", "BE", "LU", "CH", "AT", "DK", "SE", "NO",
    "FI", "IS", "PL", "CZ", "SK", "HU", "SI", "HR", "RO", "BG", "GR", "CY", "MT", "EE", "LV",
    "LT", "RS", "BA", "ME", "MK", "AL", "XK", "MD", "UA", "BY", "RU", "MC", "LI", "AD", "SM",
    "VA", "GI", "IM", "JE", "GG",
  ],
  north_america: ["US", "CA", "PR", "BM", "GL"],
  latin_america: [
    "MX", "GT", "BZ", "SV", "HN", "NI", "CR", "PA", "CU", "DO", "HT", "JM", "TT", "BS", "BB",
    "CO", "VE", "EC", "PE", "BO", "BR", "PY", "UY", "AR", "CL", "GY", "SR",
  ],
  middle_east: [
    "AE", "SA", "QA", "KW", "BH", "OM", "YE", "IQ", "IR", "JO", "LB", "SY", "IL", "PS", "TR",
    "EG",
  ],
  africa: [
    "NG", "GH", "KE", "UG", "TZ", "RW", "ET", "SO", "SD", "SS", "ZA", "ZW", "ZM", "MW", "MZ",
    "BW", "NA", "AO", "CD", "CG", "CM", "CI", "SN", "ML", "BF", "NE", "TD", "GN", "SL", "LR",
    "TG", "BJ", "GA", "MG", "MU", "MA", "DZ", "TN", "LY", "ER", "DJ", "LS", "SZ", "GM", "CV",
  ],
  south_asia: ["BD", "IN", "PK", "LK", "NP", "BT", "MV", "AF"],
  asia_pacific: [
    "CN", "HK", "MO", "TW", "JP", "KR", "MN", "SG", "MY", "TH", "VN", "PH", "ID", "KH", "LA",
    "MM", "BN", "TL", "AU", "NZ", "FJ", "PG", "KZ", "UZ", "KG", "TJ", "TM", "AZ", "GE", "AM",
  ],
};

const REGION_BY_COUNTRY = new Map<string, RegionId>(
  Object.entries(COUNTRY_REGION).flatMap(([region, codes]) =>
    codes.map((code) => [code, region as RegionId] as const),
  ),
);

export function regionForCountry(countryCode: string | undefined): RegionId {
  return REGION_BY_COUNTRY.get(countryCode?.toUpperCase() ?? "") ?? DEFAULT_REGION;
}

// Device time zone → region, used only when IP lookup fails.
const TIMEZONE_REGION: Record<string, RegionId> = {
  "Asia/Dhaka": "south_asia",
  "Asia/Kolkata": "south_asia",
  "Asia/Calcutta": "south_asia",
  "Asia/Karachi": "south_asia",
  "Asia/Colombo": "south_asia",
  "Asia/Kathmandu": "south_asia",
  "Asia/Thimphu": "south_asia",
  "Asia/Kabul": "south_asia",
  "Indian/Maldives": "south_asia",
  "Asia/Dubai": "middle_east",
  "Asia/Riyadh": "middle_east",
  "Asia/Qatar": "middle_east",
  "Asia/Kuwait": "middle_east",
  "Asia/Bahrain": "middle_east",
  "Asia/Muscat": "middle_east",
  "Asia/Baghdad": "middle_east",
  "Asia/Tehran": "middle_east",
  "Asia/Amman": "middle_east",
  "Asia/Beirut": "middle_east",
  "Asia/Jerusalem": "middle_east",
  "Europe/Istanbul": "middle_east",
  "Africa/Cairo": "middle_east",
};

export function regionForTimezone(timeZone: string): RegionId | null {
  if (TIMEZONE_REGION[timeZone]) return TIMEZONE_REGION[timeZone];
  const [area, city = ""] = timeZone.split("/");
  switch (area) {
    case "Europe":
      return "europe";
    case "Africa":
      return "africa";
    case "Asia":
    case "Australia":
    case "Pacific":
      return "asia_pacific";
    case "America":
      return /New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Detroit|Indiana|Boise/.test(
        city,
      )
        ? "north_america"
        : "latin_america";
    default:
      return null;
  }
}

/**
 * Consultation fee for a region, rounded to a whole number in that region's currency.
 * Pass the live multiplier (usePricing does); without it the default is used.
 */
export function regionalFee(baseFeeGBP: number, regionId: RegionId, multiplier = REGIONS[regionId].multiplier) {
  const region = REGIONS[regionId];
  if (baseFeeGBP <= 0) return { amount: 0, currency: region.currency, label: "Free" };
  const inCurrency =
    region.currency === "GBP"
      ? baseFeeGBP * multiplier
      : baseFeeGBP * GBP_TO_USD * multiplier;
  const amount = Math.max(1, Math.round(inCurrency));
  return { amount, currency: region.currency, label: formatMoney(amount, region.currency) };
}

export function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(currency === "GBP" ? "en-GB" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function flagEmoji(countryCode: string) {
  if (!/^[A-Z]{2}$/i.test(countryCode)) return "🌍";
  return String.fromCodePoint(
    ...countryCode
      .toUpperCase()
      .split("")
      .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65),
  );
}
