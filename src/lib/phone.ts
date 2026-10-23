import {
  AsYouType,
  getExampleNumber,
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/mobile";
import examples from "libphonenumber-js/mobile/examples";
import { COUNTRIES, type Country } from "@/constants/countries";

// Phone helpers built on libphonenumber (Google's numbering rules), using the
// mobile-only metadata: OTP goes by SMS, so landlines don't count as valid.

const digitsOf = (text: string) => text.replace(/\D/g, "");

const supported = (iso2: string): iso2 is CountryCode => isSupportedCountry(iso2);

export function countryByIso(iso2: string | undefined): Country | undefined {
  if (!iso2) return undefined;
  return COUNTRIES.find(c => c.iso2 === iso2.toUpperCase());
}

/** A sample mobile number for the country in its local format, e.g. "07400 123456". */
export function phonePlaceholder(iso2: string): string {
  if (!supported(iso2)) return "Phone number";
  return getExampleNumber(iso2, examples)?.formatNational() ?? "Phone number";
}

/**
 * Formats what the user typed as they type it.
 * A full international number ("+44…" or "0044…", e.g. pasted or AutoFilled)
 * switches the country and is shown in that country's local format.
 * Deleting only a space or dash also removes the digit before it, so
 * backspace never gets stuck on formatting.
 */
export function formatPhoneInput(
  next: string,
  prev: string,
  iso2: string,
): { text: string; country?: Country } {
  let raw = next.trim();
  if (raw.startsWith("00")) raw = `+${raw.slice(2)}`;

  if (raw.startsWith("+")) {
    const parsed = parsePhoneNumberFromString(raw);
    const country = countryByIso(parsed?.country);
    if (parsed && country) {
      return { text: new AsYouType(parsed.country).input(parsed.formatNational()), country };
    }
    // Still typing the country code: keep it international for now.
    return { text: new AsYouType().input(`+${digitsOf(raw)}`) };
  }

  let digits = digitsOf(raw);
  if (next.length < prev.length && digits === digitsOf(prev)) digits = digits.slice(0, -1);
  if (!digits) return { text: "" };
  return { text: supported(iso2) ? new AsYouType(iso2).input(digits) : digits };
}

/** Whether the text is a valid mobile number for the country, and its E.164 form. */
export function checkMobile(text: string, iso2: string): { valid: boolean; e164?: string } {
  if (!digitsOf(text)) return { valid: false };
  const parsed = parsePhoneNumberFromString(text, supported(iso2) ? iso2 : undefined);
  if (!parsed?.isValid()) return { valid: false };
  return { valid: true, e164: parsed.number };
}

// Common time zones → country, a better hint than the language setting
// (many phones run en-US anywhere in the world).
const TIMEZONE_COUNTRY: Record<string, string> = {
  "Europe/London": "GB", "Europe/Dublin": "IE", "Asia/Dhaka": "BD", "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN", "Asia/Karachi": "PK", "Asia/Dubai": "AE", "Asia/Riyadh": "SA",
  "Asia/Qatar": "QA", "Asia/Kuwait": "KW", "Asia/Singapore": "SG", "Asia/Kuala_Lumpur": "MY",
  "Africa/Lagos": "NG", "Africa/Nairobi": "KE", "Africa/Johannesburg": "ZA", "Africa/Cairo": "EG",
  "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Pacific/Auckland": "NZ",
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US",
  "America/Los_Angeles": "US", "America/Phoenix": "US", "America/Toronto": "CA", "America/Vancouver": "CA",
  "Europe/Paris": "FR", "Europe/Berlin": "DE", "Europe/Madrid": "ES", "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
};

/** The country to preselect: from the time zone, then the locale, else the UK. */
export function defaultPhoneCountry(): Country {
  const fallback = countryByIso("GB") ?? COUNTRIES[0]!;
  try {
    const { timeZone, locale } = Intl.DateTimeFormat().resolvedOptions();
    const byZone = countryByIso(TIMEZONE_COUNTRY[timeZone]);
    if (byZone) return byZone;
    const region = locale?.split("-").find(part => /^[A-Z]{2}$/.test(part));
    return countryByIso(region) ?? fallback;
  } catch {
    return fallback;
  }
}
