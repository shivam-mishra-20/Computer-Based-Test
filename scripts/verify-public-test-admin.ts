/**
 * Public test authoring client verification (pure logic — no browser needed).
 *
 * Small surface, but every function here has a failure mode that is silent
 * rather than loud:
 *
 *   • `publishProblems` reading the wrong field on the error object turns the
 *     server's carefully assembled list of blockers into "request failed", and
 *     the author is left guessing. It read `.body` when apiFetch attaches
 *     `.data` — caught by reading the source, which is exactly the kind of luck
 *     a test replaces.
 *   • `isHasAttempts` deciding wrongly means either offering to archive a paper
 *     nobody has sat, or reporting a flat failure when archiving was the answer.
 *   • `toLocalInput` getting the timezone wrong shifts a schedule by the
 *     author's UTC offset — a paper set for 9am opening in the afternoon.
 *
 * Run:  npx tsx scripts/verify-public-test-admin.ts
 */

import {
  formatMarking,
  isHasAttempts,
  publishProblems,
  statusOf,
  toLocalInput,
} from "../src/lib/publicTests";

let failures = 0;
let checks = 0;

function ok(label: string, condition: boolean) {
  checks++;
  if (!condition) {
    failures++;
    console.error(`  FAIL  ${label}`);
  } else {
    console.log(`  ok    ${label}`);
  }
}

/** Exactly the shape apiFetch throws: message + status + parsed body on .data. */
const apiError = (status: number, data: unknown) => {
  const err = new Error("boom") as Error & { status?: number; data?: unknown };
  err.status = status;
  err.data = data;
  return err;
};

// ─────────────────────────────────────────────────────────────────────────────

console.log("The publish gate's blocker list survives the round trip:");
{
  const problems = publishProblems(
    apiError(422, {
      message: "This test is not ready to publish.",
      problems: ["The test has no questions.", "The test needs a duration in minutes."],
    }),
  );
  ok("every blocker is extracted, not just the first", problems.length === 2);
  ok("text is preserved verbatim", problems[0] === "The test has no questions.");

  // The bug this exists to prevent: reading a field apiFetch does not set.
  ok(
    "reads .data (what apiFetch attaches), not .body",
    publishProblems({ body: { problems: ["ignored"] } }).length === 0,
  );
}

console.log("\nAnd degrades safely when there is no list:");
{
  ok("a plain 500 yields no blockers", publishProblems(apiError(500, { message: "oops" })).length === 0);
  ok("a network failure yields no blockers", publishProblems(new Error("offline")).length === 0);
  ok("null is handled", publishProblems(null).length === 0);
  ok("undefined is handled", publishProblems(undefined).length === 0);
  ok(
    "a non-array problems field is not spread into garbage",
    publishProblems(apiError(422, { problems: "not an array" })).length === 0,
  );
}

console.log("\nA refused delete is recognised as 'archive instead', not as failure:");
{
  ok(
    "409 + HAS_ATTEMPTS is the archive case",
    isHasAttempts(apiError(409, { code: "HAS_ATTEMPTS", attemptCount: 12 })),
  );
  ok(
    "a 409 for some other reason is NOT",
    !isHasAttempts(apiError(409, { code: "SOMETHING_ELSE" })),
  );
  ok("a 500 is not the archive case", !isHasAttempts(apiError(500, { code: "HAS_ATTEMPTS" })));
  ok("a network error is not the archive case", !isHasAttempts(new Error("offline")));
}

console.log("\nStatus extraction:");
{
  ok("status is read off the error", statusOf(apiError(422, {})) === 422);
  ok("a request that never landed reads 0, not undefined", statusOf(new Error("offline")) === 0);
  ok("null is handled", statusOf(null) === 0);
}

console.log("\nMarking is stated only when it is worth knowing:");
{
  ok("plain +1/0 is not stated", formatMarking({ correct: 1, incorrect: 0, unattempted: 0 }) === null);
  ok(
    "JEE-style +4/−1 is stated",
    formatMarking({ correct: 4, incorrect: -1, unattempted: 0 }) === "+4 / −1",
  );
  ok(
    "a 4-mark positive-only scheme is still worth stating",
    formatMarking({ correct: 4, incorrect: 0, unattempted: 0 }) === "+4 / 0",
  );
  ok("no scheme states nothing", formatMarking(undefined) === null);
  ok(
    "the negative is rendered as a minus sign, not a hyphen",
    formatMarking({ correct: 4, incorrect: -1, unattempted: 0 })?.includes("−") === true,
  );
}

console.log("\nSchedule inputs stay in the author's own timezone:");
{
  // A datetime-local value is LOCAL wall-clock with no zone. Round-tripping is
  // the property that matters: what the author sees is what gets stored.
  const local = "2026-09-14T09:00";
  const iso = new Date(local).toISOString();
  ok("local → ISO → local is stable", toLocalInput(iso) === local);

  const evening = "2026-01-02T18:45";
  ok("stable across a date boundary too", toLocalInput(new Date(evening).toISOString()) === evening);

  ok("the format is exactly what the input expects", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(toLocalInput(iso)));
  ok("months and days are zero-padded", toLocalInput(new Date("2026-03-05T04:07").toISOString()).includes("-03-05T04:07"));

  ok("no value yields an empty input, not 'Invalid Date'", toLocalInput(undefined) === "");
  ok("an empty string yields empty", toLocalInput("") === "");
  ok("unparseable input yields empty rather than NaN", toLocalInput("not a date") === "");
}

console.log(`\n${checks - failures}/${checks} checks passed.`);
if (failures > 0) {
  console.error(`${failures} FAILURE(S) — public test authoring rules are NOT verified.`);
  process.exit(1);
}
console.log("Public test authoring rules verified.");
