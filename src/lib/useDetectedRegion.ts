import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { type RegionId, regionForCountry } from "./locale/regions";
import { rememberRegion } from "./pricing";

export type RegionDetectionStatus = "idle" | "detecting" | "detected" | "denied" | "unavailable";

// Cached at module scope so re-opening the payment sheet doesn't re-prompt for
// permission or re-hit the GPS every time within the same app session.
let cachedStatus: RegionDetectionStatus | null = null;
let cachedRegion: RegionId | undefined;

/** The pricing region from the phone's location (asked only when paying). */
export function useDetectedRegion(active: boolean) {
  const [status, setStatus] = useState<RegionDetectionStatus>(cachedStatus ?? "idle");
  const [region, setRegion] = useState<RegionId | undefined>(cachedRegion);
  const startedRef = useRef(false);

  const detect = useCallback(async () => {
    setStatus("detecting");
    try {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== "granted") {
        cachedStatus = "denied";
        setStatus("denied");
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      if (!place?.isoCountryCode) throw new Error("No country");
      const detected = regionForCountry(place.isoCountryCode);
      cachedRegion = detected;
      cachedStatus = "detected";
      rememberRegion(detected);
      setRegion(detected);
      setStatus(cachedStatus);
    } catch {
      cachedStatus = "unavailable";
      setStatus("unavailable");
    }
  }, []);

  useEffect(() => {
    if (!active || startedRef.current) return;

    if (cachedStatus === "detected" || cachedStatus === "denied" || cachedStatus === "unavailable") {
      setStatus(cachedStatus);
      setRegion(cachedRegion);
      return;
    }

    startedRef.current = true;
    void detect();
  }, [active, detect]);

  const retry = useCallback(() => {
    cachedStatus = null;
    cachedRegion = undefined;
    startedRef.current = false;
    void detect();
  }, [detect]);

  return { status, region, retry };
}
