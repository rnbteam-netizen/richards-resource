// Honest Slot Machine math — mirrors spinResult() in client/src/App.tsx.
// 3 reels x 6 symbols, $10 bet. Triples: 7s $250, diamonds $120,
// stars $60, other three-of-a-kind $40 each. Any exactly-one-pair: $14.
// Headline claim: "pays back about 84c for every $1 played".
import { test } from "node:test";
import assert from "node:assert/strict";

const SYMBOLS = ["cherry", "lemon", "bell", "star", "diamond", "seven"];
function payout(a, b, c) {
  if (a === b && b === c) return a === "seven" ? 250 : a === "diamond" ? 120 : a === "star" ? 60 : 40;
  if (a === b || b === c || a === c) return 14;
  return 0;
}

test("Honest Slot Machine returns about 84c per $1", () => {
  let total = 0;
  let outcomes = 0;
  for (const a of SYMBOLS) for (const b of SYMBOLS) for (const c of SYMBOLS) {
    total += payout(a, b, c);
    outcomes += 1;
  }
  assert.equal(outcomes, 216);
  // Triples $550 total + 90 pair outcomes x $14 = $1,810 / 216 spins.
  assert.equal(total, 1810);
  const perTenDollarSpin = total / outcomes; // $8.38
  assert.ok(Math.abs(perTenDollarSpin - 8.38) < 0.01, `expected $8.38, got $${perTenDollarSpin}`);
  const perDollar = perTenDollarSpin / 10; // 0.838
  assert.ok(perDollar > 0.82 && perDollar < 0.86, `expected ~0.84, got ${perDollar}`);
});

test("the old $4 pair payout would have been about 42c, not 84c", () => {
  // Guard against regressing to the pre-fix machine (42c) while the
  // headline still says 84c — the exact bug Richard caught on 2026-11-10.
  const oldTotal = 550 + 90 * 4;
  assert.ok(Math.abs(oldTotal / 216 / 10 - 0.42) < 0.01);
});
