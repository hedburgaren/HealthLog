import { describe, expect, it } from "vitest";

import { buildIntensityEventDailySeries } from "@/lib/insights/correlation-series-builders";
import { maskSeriesByModules } from "@/lib/insights/discovery-matrix";

const at = (iso: string) => new Date(iso);

describe("buildIntensityEventDailySeries", () => {
  it("takes the day's highest intensity and zero-fills only between the first and last day", () => {
    const series = buildIntensityEventDailySeries({
      key: "ACUTE_EVENT",
      tz: "Europe/Berlin",
      events: [
        { at: at("2026-07-01T07:00:00.000Z"), intensity: 3 },
        { at: at("2026-07-01T15:00:00.000Z"), intensity: 7 },
        { at: at("2026-07-04T10:00:00.000Z"), intensity: 2 },
      ],
    });
    expect(series).toEqual({
      key: "ACUTE_EVENT",
      role: "behaviour",
      points: [
        { day: "2026-07-01", value: 7 },
        { day: "2026-07-02", value: 0 },
        { day: "2026-07-03", value: 0 },
        { day: "2026-07-04", value: 2 },
      ],
    });
  });

  it("keys a late-evening occurrence to the person's own day", () => {
    const series = buildIntensityEventDailySeries({
      key: "EXERTION",
      tz: "Europe/Berlin",
      // 23:30 UTC on the 1st is 01:30 on the 2nd in Berlin (summer time).
      events: [{ at: at("2026-07-01T23:30:00.000Z"), intensity: 5 }],
    });
    expect(series.points).toEqual([{ day: "2026-07-02", value: 5 }]);
  });

  it("is empty with no occurrences, so the channel drops out", () => {
    const series = buildIntensityEventDailySeries({
      key: "ACUTE_EVENT",
      tz: "UTC",
      events: [],
    });
    expect(series.points).toEqual([]);
  });

  it("ignores a non-finite intensity instead of poisoning the day", () => {
    const series = buildIntensityEventDailySeries({
      key: "EXERTION",
      tz: "UTC",
      events: [{ at: at("2026-07-01T10:00:00.000Z"), intensity: Number.NaN }],
    });
    expect(series.points).toEqual([]);
  });
});

describe("the ACUTE_EVENT channel follows the timeline module", () => {
  const series = [
    { key: "ACUTE_EVENT", role: "behaviour" as const, points: [] },
    { key: "SLEEP_DURATION", role: "outcome" as const, points: [] },
  ];

  it("is masked out when the timeline module is off", () => {
    expect(
      maskSeriesByModules(series, { timeline: false }).map((s) => s.key),
    ).toEqual(["SLEEP_DURATION"]);
  });

  it("stays when the module is on", () => {
    expect(
      maskSeriesByModules(series, { timeline: true }).map((s) => s.key),
    ).toEqual(["ACUTE_EVENT", "SLEEP_DURATION"]);
  });
});

describe("the EXERTION channel follows the workouts module", () => {
  const series = [
    { key: "EXERTION", role: "behaviour" as const, points: [] },
    { key: "SLEEP_DURATION", role: "outcome" as const, points: [] },
  ];

  it("is masked out when the workouts module is off", () => {
    expect(
      maskSeriesByModules(series, { workouts: false }).map((s) => s.key),
    ).toEqual(["SLEEP_DURATION"]);
  });

  it("stays when the module is on", () => {
    expect(
      maskSeriesByModules(series, { workouts: true }).map((s) => s.key),
    ).toEqual(["EXERTION", "SLEEP_DURATION"]);
  });
});
