import { useEffect, useMemo, useState } from "react";
import { flagEmoji } from "@/constants/countries";
import { DEFAULT_REGION, type RegionId, REGIONS, regionalFee, regionForCountry, regionForTimezone } from "./locale/regions";
import { defaultPhoneCountry } from "./phone";
import { getPricing } from "./services/misc";

// Consultation prices by region, the same way as the webapp: the doctor's
// UK fee times the region's multiplier from Fees & Commission (admin
// dashboard). The region comes from the phone's time zone, or its location
// once detected at payment.

let multipliers: Partial<Record<RegionId, number>> | null = null;
let loadingMultipliers: Promise<Partial<Record<RegionId, number>>> | null = null;
let detectedRegion: RegionId | null = null;
const listeners = new Set<() => void>();

/** Called when the location gives a more exact region. */
export function rememberRegion(region: RegionId) {
  detectedRegion = region;
  listeners.forEach((listener) => listener());
}

function timezoneRegion(): RegionId {
  try {
    return regionForTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone) ?? DEFAULT_REGION;
  } catch {
    return DEFAULT_REGION;
  }
}

const REGION_GLOBE: Record<RegionId, string> = {
  europe: "🌍", africa: "🌍", middle_east: "🌍",
  north_america: "🌎", latin_america: "🌎",
  south_asia: "🌏", asia_pacific: "🌏",
};

/** The phone's country flag when it's in the region, else the region's globe. */
function regionFlag(regionId: RegionId): string {
  const country = defaultPhoneCountry();
  return regionForCountry(country.iso2) === regionId ? flagEmoji(country.iso2) : REGION_GLOBE[regionId];
}

/** The current region and a fee function that uses the live prices. */
export function useRegionalPricing() {
  const [live, setLive] = useState(multipliers);
  const [, bump] = useState(0);

  useEffect(() => {
    const listener = () => bump((n) => n + 1);
    listeners.add(listener);
    if (!multipliers) {
      loadingMultipliers ??= getPricing().then((m) => (multipliers = m ?? {}));
      void loadingMultipliers.then(setLive);
    }
    return () => void listeners.delete(listener);
  }, []);

  const regionId = detectedRegion ?? timezoneRegion();
  return useMemo(
    () => ({
      regionId,
      region: REGIONS[regionId],
      /** e.g. "🇧🇩", shown next to prices. */
      flag: regionFlag(regionId),
      /** e.g. { amount: 45, currency: "GBP", label: "£45" }; label "Free" for 0. */
      fee: (baseFeeGBP: number, forRegion: RegionId = regionId) => regionalFee(baseFeeGBP, forRegion, live?.[forRegion]),
    }),
    [regionId, live],
  );
}
