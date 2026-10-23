import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { type ConsultationTimeline, timeline } from "./consultation";
import { getMyConsultations } from "./services/consultations";
import type { Consultation } from "./types";

export type DoctorConsultation = ConsultationTimeline & { consultation: Consultation };

/**
 * The patient's most relevant consultation with each doctor: one still open
 * or upcoming, otherwise the latest (same rule as the webapp's hooks).
 */
export function currentByDoctor(consultations: Consultation[], now: Date) {
  const byDoctor = new Map<string, DoctorConsultation>();
  const latestFirst = [...consultations].sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const open = (e: DoctorConsultation) => e.state !== "closed" && e.state !== "refunded";
  for (const c of latestFirst) {
    const entry = { consultation: c, ...timeline(c, now) };
    const kept = byDoctor.get(c.doctorId);
    if (!kept || (!open(kept) && open(entry))) byDoctor.set(c.doctorId, entry);
  }
  return byDoctor;
}

/** Your consultations from the backend, reloaded whenever the screen is shown. */
export function useMyConsultations() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const result = await getMyConsultations();
    if (result.ok) setConsultations(result.data);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const byDoctor = useMemo(() => currentByDoctor(consultations, new Date()), [consultations]);
  return { consultations, byDoctor, loaded, reload };
}
