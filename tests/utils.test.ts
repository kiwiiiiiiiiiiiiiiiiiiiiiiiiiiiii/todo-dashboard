import { afterEach, describe, expect, it, vi } from "vitest"
import {
  calculateDaysRemaining,
  endOfDayIso,
  formatWeight,
  localDayIso,
} from "@/lib/utils"

describe("formatWeight", () => {
  it("renders one decimal place with the kg suffix", () => {
    expect(formatWeight(72)).toBe("72.0kg")
    expect(formatWeight(72.456)).toBe("72.5kg")
  })
})

describe("calculateDaysRemaining", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("rounds partial days up", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 1, 10, 0, 0))

    // 47 hours away -> 2 days
    expect(calculateDaysRemaining(new Date(2026, 2, 3, 9, 0, 0))).toBe(2)
    // 1 hour away -> still 1 day (never "0 days left" while time remains)
    expect(calculateDaysRemaining(new Date(2026, 2, 1, 11, 0, 0))).toBe(1)
  })

  it("clamps past deadlines to zero instead of going negative", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 1, 10, 0, 0))

    expect(calculateDaysRemaining(new Date(2026, 1, 1, 10, 0, 0))).toBe(0)
  })
})

describe("endOfDayIso", () => {
  it("lands at 23:59 local time, not midnight UTC", () => {
    const local = new Date(endOfDayIso("2026-03-01"))

    expect(local.getFullYear()).toBe(2026)
    expect(local.getMonth()).toBe(2)
    expect(local.getDate()).toBe(1)
    expect(local.getHours()).toBe(23)
    expect(local.getMinutes()).toBe(59)
  })

  it("still counts as 1 day left at 9am on the deadline day", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 1, 9, 0, 0))

    expect(calculateDaysRemaining(endOfDayIso("2026-03-01"))).toBe(1)

    vi.useRealTimers()
  })
})

describe("localDayIso", () => {
  it("zero-pads month and day", () => {
    expect(localDayIso(new Date(2026, 0, 5, 12, 0, 0))).toBe("2026-01-05")
  })

  // Built from local components, so these assertions hold in any timezone.
  // With toISOString() the 00:30 case would report the previous UTC day in UTC+8.
  it("reports the local day just after midnight", () => {
    expect(localDayIso(new Date(2026, 2, 1, 0, 30, 0))).toBe("2026-03-01")
  })

  it("reports the local day just before midnight", () => {
    expect(localDayIso(new Date(2026, 2, 1, 23, 30, 0))).toBe("2026-03-01")
  })
})
