"use client";

import { useEffect } from "react";
import { track, type AnalyticsEventName } from "@/lib/analytics";

const EMPTY: Record<string, unknown> = {};

export function TrackView({
  event,
  payload = EMPTY,
}: {
  event: AnalyticsEventName;
  payload?: Record<string, unknown>;
}) {
  useEffect(() => {
    track(event, payload);
    // Track once per page view of this event name.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
  return null;
}
