import { describe, it, expect, vi } from "vitest";
import { isTournamentLocked } from "../lib/bracket-utils";

describe("Lock enforcement", () => {
  it("locks tournament when current time equals first game start", () => {
    // Mock Date.now to return exact lock time
    const lockTime = new Date("2026-03-11T12:00:00-05:00");
    vi.useFakeTimers();
    vi.setSystemTime(lockTime);

    expect(isTournamentLocked(lockTime)).toBe(true);

    vi.useRealTimers();
  });

  it("locks tournament after first game start", () => {
    const lockTime = new Date("2026-03-11T12:00:00-05:00");
    const afterLock = new Date("2026-03-11T12:01:00-05:00");
    vi.useFakeTimers();
    vi.setSystemTime(afterLock);

    expect(isTournamentLocked(lockTime)).toBe(true);

    vi.useRealTimers();
  });

  it("does not lock tournament before first game start", () => {
    const lockTime = new Date("2026-03-11T12:00:00-05:00");
    const beforeLock = new Date("2026-03-11T11:59:59-05:00");
    vi.useFakeTimers();
    vi.setSystemTime(beforeLock);

    expect(isTournamentLocked(lockTime)).toBe(false);

    vi.useRealTimers();
  });

  it("locks tournament even 1 millisecond after start", () => {
    const lockTime = new Date("2026-03-11T17:00:00Z");
    const justAfter = new Date(lockTime.getTime() + 1);
    vi.useFakeTimers();
    vi.setSystemTime(justAfter);

    expect(isTournamentLocked(lockTime)).toBe(true);

    vi.useRealTimers();
  });

  it("validates server-side enforcement concept", () => {
    // This test documents that the lock check is based on server time
    // (new Date()), not client time, so it can't be bypassed
    const futureLock = new Date("2099-01-01T00:00:00Z");
    expect(isTournamentLocked(futureLock)).toBe(false);

    const pastLock = new Date("2000-01-01T00:00:00Z");
    expect(isTournamentLocked(pastLock)).toBe(true);
  });
});
