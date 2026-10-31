import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatVND } from "../src/utils/format.js";
import { toSafeDate, formatMinorLabel, formatMajorLabel } from "../src/utils/timeline-format.js";
import { apiError } from "../src/services/http.js";

describe("Frontend Unit Tests - formatVND", () => {
  it("formats standard amounts in VND currency with non-breaking/standard spaces", () => {
    const res = formatVND(259000);
    // Replace non-breaking spaces (\u00a0 or \u202f) for clean comparison
    const normalized = res.replace(/[\u00a0\u202f]/g, " ");
    assert.equal(normalized, "259.000 ₫");
  });

  it("formats 0 as 0 ₫", () => {
    const res = formatVND(0);
    const normalized = res.replace(/[\u00a0\u202f]/g, " ");
    assert.equal(normalized, "0 ₫");
  });

  it("handles undefined by returning 0 ₫", () => {
    const res = formatVND(undefined);
    const normalized = res.replace(/[\u00a0\u202f]/g, " ");
    assert.equal(normalized, "0 ₫");
  });

  it("formats large numbers correctly", () => {
    const res = formatVND(1250000);
    const normalized = res.replace(/[\u00a0\u202f]/g, " ");
    assert.equal(normalized, "1.250.000 ₫");
  });
});

describe("Frontend Unit Tests - Timeline Date Formatting", () => {
  it("toSafeDate converts native Date, strings, and toDate() wrappers", () => {
    const nativeDate = new Date("2026-10-15T10:00:00Z");
    assert.equal(toSafeDate(nativeDate).getTime(), nativeDate.getTime());

    const stringDate = "2026-10-15T10:00:00Z";
    assert.equal(toSafeDate(stringDate).getTime(), nativeDate.getTime());

    const momentLike = {
      toDate: () => new Date("2026-10-15T10:00:00Z"),
    };
    assert.equal(toSafeDate(momentLike).getTime(), nativeDate.getTime());
  });

  it("formats minor labels in Vietnamese for all scale levels", () => {
    const testDate = new Date(2026, 9, 15, 14, 30); // 2026-10-15 14:30 (Thursday)

    // Hour scale
    assert.equal(formatMinorLabel(testDate, "hour"), "14:30");
    // Minute scale
    assert.equal(formatMinorLabel(testDate, "minute"), "14:30");
    // Day scale: T5 15/10
    assert.equal(formatMinorLabel(testDate, "day"), "T5 15/10");
    // Week scale: T3 (day 15 / 7)
    assert.equal(formatMinorLabel(testDate, "week"), "T3");
    // Month scale: Th10/2026
    assert.equal(formatMinorLabel(testDate, "month"), "Th10/2026");
    // Year scale: 2026
    assert.equal(formatMinorLabel(testDate, "year"), "2026");
  });

  it("formats major labels in Vietnamese for all scale levels", () => {
    const testDate = new Date(2026, 9, 15, 14, 30); // 2026-10-15 (Thursday)

    // Minute scale
    assert.equal(formatMajorLabel(testDate, "minute"), "15/10/2026");
    // Hour scale: T5, 15/10
    assert.equal(formatMajorLabel(testDate, "hour"), "T5, 15/10");
    // Day scale: Tháng 10/2026
    assert.equal(formatMajorLabel(testDate, "day"), "Tháng 10/2026");
    // Week scale: Tháng 10/2026
    assert.equal(formatMajorLabel(testDate, "week"), "Tháng 10/2026");
    // Month scale: 2026
    assert.equal(formatMajorLabel(testDate, "month"), "2026");
  });
});

describe("Frontend Unit Tests - apiError Parser", () => {
  it("extracts message from standard Error", () => {
    const err = new Error("Custom network failure");
    assert.equal(apiError(err), "Custom network failure");
  });

  it("extracts message from string or primitive", () => {
    assert.equal(apiError("Failed to fetch"), "Unknown error");
    assert.equal(apiError(null), "Unknown error");
  });

  it("handles Axios-like response errors", () => {
    const fakeAxiosErr = {
      isAxiosError: true,
      message: "Request failed with status code 400",
      response: {
        data: {
          message: "Room is already booked for this duration",
        },
      },
    };
    assert.equal(apiError(fakeAxiosErr), "Room is already booked for this duration");
  });

  it("handles Axios-like array of messages", () => {
    const fakeAxiosErr = {
      isAxiosError: true,
      message: "Validation failed",
      response: {
        data: {
          message: ["start_at must be before end_at", "room_id is required"],
        },
      },
    };
    assert.equal(
      apiError(fakeAxiosErr),
      "start_at must be before end_at; room_id is required",
    );
  });
});
