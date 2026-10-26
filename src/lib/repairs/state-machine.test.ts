import { describe, expect, it } from "vitest";

import { canQuote, closeReasonsFrom, moveProblem, nextMoves, undoTarget } from "./state-machine";

describe("repair state machine", () => {
  it("diagnoses once there's a quote", () => {
    expect(moveProblem({ status: "received", quote: "none" }, { to: "diagnosed" })).toBe(
      "needs_quote",
    );
    expect(moveProblem({ status: "received", quote: "pending" }, { to: "diagnosed" })).toBeNull();
  });

  it("starts a fixed-price job at once when it was approved in person at drop-off", () => {
    expect(moveProblem({ status: "received", quote: "approved" }, { to: "in_repair" })).toBeNull();
    expect(moveProblem({ status: "received", quote: "pending" }, { to: "in_repair" })).toBe(
      "needs_approval",
    );
  });

  it("starts the repair only after approval", () => {
    expect(moveProblem({ status: "diagnosed", quote: "pending" }, { to: "in_repair" })).toBe(
      "needs_approval",
    );
    expect(moveProblem({ status: "diagnosed", quote: "declined" }, { to: "in_repair" })).toBe(
      "needs_approval",
    );
    expect(moveProblem({ status: "diagnosed", quote: "approved" }, { to: "in_repair" })).toBeNull();
  });

  it("sends a declined quote to Ready for collection, then Closed", () => {
    expect(moveProblem({ status: "diagnosed", quote: "declined" }, { to: "ready" })).toBeNull();
    expect(moveProblem({ status: "diagnosed", quote: "approved" }, { to: "ready" })).toBe(
      "needs_decline",
    );
    expect(
      moveProblem(
        { status: "ready", quote: "declined" },
        { to: "closed", closeReason: "collected" },
      ),
    ).toBeNull();
  });

  it("holds Ready while a new quote version mid-repair waits for approval", () => {
    expect(moveProblem({ status: "in_repair", quote: "pending" }, { to: "ready" })).toBe(
      "quote_pending",
    );
    expect(moveProblem({ status: "in_repair", quote: "approved" }, { to: "ready" })).toBeNull();
    // Declined extra work: the instrument still goes back.
    expect(moveProblem({ status: "in_repair", quote: "declined" }, { to: "ready" })).toBeNull();
    expect(canQuote("in_repair")).toBe(true);
    expect(canQuote("ready")).toBe(false);
    expect(canQuote("closed")).toBe(false);
  });

  it("closes as collected, delivered or abandoned from Ready, and cancelled before it", () => {
    expect(closeReasonsFrom("ready")).toEqual(["collected", "delivered", "abandoned"]);
    for (const status of ["received", "diagnosed", "in_repair"] as const) {
      expect(closeReasonsFrom(status)).toEqual(["cancelled"]);
      expect(
        moveProblem({ status, quote: "none" }, { to: "closed", closeReason: "cancelled" }),
      ).toBeNull();
      expect(
        moveProblem({ status, quote: "none" }, { to: "closed", closeReason: "abandoned" }),
      ).toBe("bad_reason");
    }
    expect(
      moveProblem(
        { status: "ready", quote: "approved" },
        { to: "closed", closeReason: "cancelled" },
      ),
    ).toBe("bad_reason");
    expect(moveProblem({ status: "ready", quote: "approved" }, { to: "closed" })).toBe(
      "needs_reason",
    );
    expect(
      moveProblem(
        { status: "in_repair", quote: "approved" },
        { to: "ready", closeReason: "collected" },
      ),
    ).toBe("bad_reason");
  });

  it("refuses skipped steps, going backwards and anything after Closed", () => {
    expect(moveProblem({ status: "received", quote: "approved" }, { to: "ready" })).toBe(
      "not_allowed",
    );
    expect(moveProblem({ status: "ready", quote: "approved" }, { to: "in_repair" })).toBe(
      "not_allowed",
    );
    expect(moveProblem({ status: "in_repair", quote: "approved" }, { to: "in_repair" })).toBe(
      "not_allowed",
    );
    expect(moveProblem({ status: "closed", quote: "approved" }, { to: "ready" })).toBe("closed");
    expect(nextMoves({ status: "closed", quote: "approved" })).toEqual([]);
  });

  it("lists the next moves with what blocks each", () => {
    expect(nextMoves({ status: "received", quote: "none" })).toEqual([
      { to: "diagnosed", problem: "needs_quote" },
      { to: "in_repair", problem: "needs_quote" },
      { to: "closed", problem: null },
    ]);
    expect(nextMoves({ status: "diagnosed", quote: "approved" })).toEqual([
      { to: "in_repair", problem: null },
      { to: "ready", problem: "needs_decline" },
      { to: "closed", problem: null },
    ]);
  });
});

describe("undo last status", () => {
  const opened = { id: 1, kind: "status", fromStatus: null, toStatus: "received" } as const;
  const diagnosed = {
    id: 2,
    kind: "status",
    fromStatus: "received",
    toStatus: "diagnosed",
  } as const;
  const repairing = {
    id: 3,
    kind: "status",
    fromStatus: "diagnosed",
    toStatus: "in_repair",
  } as const;
  const update = { id: 4, kind: "update", fromStatus: null, toStatus: null } as const;

  it("reverses the latest change, keeping history", () => {
    expect(undoTarget([opened, diagnosed, repairing, update])).toEqual({
      from: "in_repair",
      to: "diagnosed",
      eventId: 3,
    });
  });

  it("walks back one change per undo, and never undoes opening the ticket", () => {
    const undo1 = {
      id: 5,
      kind: "correction",
      fromStatus: "in_repair",
      toStatus: "diagnosed",
    } as const;
    expect(undoTarget([opened, diagnosed, repairing, undo1])).toEqual({
      from: "diagnosed",
      to: "received",
      eventId: 2,
    });
    const undo2 = {
      id: 6,
      kind: "correction",
      fromStatus: "diagnosed",
      toStatus: "received",
    } as const;
    expect(undoTarget([opened, diagnosed, repairing, undo1, undo2])).toBeNull();
    expect(undoTarget([opened])).toBeNull();
  });

  it("undoes a change made after an earlier undo", () => {
    const undo = {
      id: 4,
      kind: "correction",
      fromStatus: "in_repair",
      toStatus: "diagnosed",
    } as const;
    const again = {
      id: 5,
      kind: "status",
      fromStatus: "diagnosed",
      toStatus: "in_repair",
    } as const;
    expect(undoTarget([opened, diagnosed, repairing, undo, again])).toEqual({
      from: "in_repair",
      to: "diagnosed",
      eventId: 5,
    });
  });
});
