import { describe, it, expect } from "vitest";
import { isValidStatusTransition, WORK_ITEM_TRANSITIONS, WORK_ITEM_STATUSES } from "../constants";

describe("isValidStatusTransition", () => {
  it("always allows a no-op transition to the same status", () => {
    for (const status of WORK_ITEM_STATUSES) {
      expect(isValidStatusTransition(status, status)).toBe(true);
    }
  });

  it("allows normal forward flow", () => {
    expect(isValidStatusTransition("backlog", "in_progress")).toBe(true);
    expect(isValidStatusTransition("in_progress", "in_review")).toBe(true);
    expect(isValidStatusTransition("in_review", "done")).toBe(true);
  });

  it("forbids skipping straight from backlog to done", () => {
    expect(isValidStatusTransition("backlog", "done")).toBe(false);
  });

  it("allows reopening terminal states", () => {
    expect(isValidStatusTransition("done", "in_progress")).toBe(true);
    expect(isValidStatusTransition("canceled", "backlog")).toBe(true);
  });

  it("forbids moving a canceled item straight to done", () => {
    expect(isValidStatusTransition("canceled", "done")).toBe(false);
  });

  it("returns false for unknown source statuses", () => {
    expect(isValidStatusTransition("nonsense", "done")).toBe(false);
  });

  it("every status has a transition entry", () => {
    for (const status of WORK_ITEM_STATUSES) {
      expect(WORK_ITEM_TRANSITIONS[status]).toBeDefined();
    }
  });
});
