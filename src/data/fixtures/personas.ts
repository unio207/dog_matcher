import type { RawMergeData } from "@/types";

// Hardcoded RawMergeData fixtures. All signals are synthetic in fixture mode.
// In live mode, calendar-derived signals get synthetic: false; message/file
// signals stay synthetic: true.

const s = (value: number, raw: string) => ({ value, raw, synthetic: true });

export const personas: Record<string, RawMergeData> = {
  outdoorsy: {
    personaId: "outdoorsy",
    connectors: ["google-calendar", "slack", "drive"],
    signals: {
      meetingDensity: s(0.35, "11 meetings/week"),
      timeOfDaySpread: s(0.7, "active 6am–9pm"),
      weekendLoad: s(0.8, "weekends packed: hikes, climbing, runs"),
      longestFreeBlock: s(0.6, "5h free blocks most afternoons"),
      travelGaps: s(0.4, "1 trip/month, mostly weekend camping"),
      groupEventRatio: s(0.55, "half of events with 2+ people"),
      messageVolume: s(0.4, "~60 messages/day"),
      afterHoursActivity: s(0.2, "rarely online after 7pm"),
      fileActivity: s(0.3, "light doc activity"),
    },
  },
  homebody: {
    personaId: "homebody",
    connectors: ["google-calendar", "slack", "drive"],
    signals: {
      meetingDensity: s(0.2, "Google Calendar · 6 meetings/week"),
      timeOfDaySpread: s(
        0.31,
        "Google Calendar · event starts clustered 9:00–14:00"
      ),
      weekendLoad: s(
        0.1,
        "Google Calendar · 1 weekend event in 30 days"
      ),
      longestFreeBlock: s(
        0.9,
        "Google Calendar · longest free block: 43h"
      ),
      travelGaps: s(
        0,
        "Google Calendar · 0 multi-day blocks in 30 days"
      ),
      groupEventRatio: s(
        0.77,
        "Google Calendar · 20 of 26 events with 3+ attendees"
      ),
      messageVolume: s(
        0.28,
        "Slack · 28 sent messages/day across 4 channels"
      ),
      afterHoursActivity: s(
        0.05,
        "Slack · 42 of 840 messages sent after 6pm"
      ),
      fileActivity: s(
        0.3,
        "Drive · 9 owned files updated in 30 days; 8 during work hours"
      ),
    },
  },
  busyTraveler: {
    personaId: "busyTraveler",
    connectors: ["google-calendar", "slack", "drive"],
    signals: {
      meetingDensity: s(0.9, "31 meetings/week"),
      timeOfDaySpread: s(0.85, "calls across 3 time zones"),
      weekendLoad: s(0.5, "half of weekends have work events"),
      longestFreeBlock: s(0.15, "longest free block: 90 min"),
      travelGaps: s(0.9, "8 multi-day trips in 3 months"),
      groupEventRatio: s(0.8, "almost all group meetings"),
      messageVolume: s(0.9, "~300 messages/day"),
      afterHoursActivity: s(0.8, "active past midnight often"),
      fileActivity: s(0.7, "heavy shared-doc churn"),
    },
  },
  quietApartment: {
    personaId: "quietApartment",
    connectors: ["google-calendar", "slack", "drive"],
    signals: {
      meetingDensity: s(0.3, "9 meetings/week"),
      timeOfDaySpread: s(0.2, "tight 10–6 routine"),
      weekendLoad: s(0.15, "quiet weekends, occasional errand"),
      longestFreeBlock: s(0.75, "long uninterrupted evenings"),
      travelGaps: s(0.1, "one trip in the last quarter"),
      groupEventRatio: s(0.15, "solo focus blocks dominate"),
      messageVolume: s(0.25, "~30 messages/day"),
      afterHoursActivity: s(0.1, "silent after work hours"),
      fileActivity: s(0.6, "deep solo work sessions"),
    },
  },
  socialHost: {
    personaId: "socialHost",
    connectors: ["google-calendar", "slack", "drive"],
    signals: {
      meetingDensity: s(0.6, "18 meetings/week"),
      timeOfDaySpread: s(0.6, "events from brunch to late dinners"),
      weekendLoad: s(0.75, "weekends full of hosted events"),
      longestFreeBlock: s(0.35, "few gaps between social plans"),
      travelGaps: s(0.2, "rare travel, stays local"),
      groupEventRatio: s(0.9, "dinner parties, game nights, group runs"),
      messageVolume: s(0.75, "~200 messages/day across group chats"),
      afterHoursActivity: s(0.6, "evening chatter most nights"),
      fileActivity: s(0.35, "shared party-planning docs"),
    },
  },
};

export type PersonaId = keyof typeof personas;
export const personaIds = Object.keys(personas) as PersonaId[];
