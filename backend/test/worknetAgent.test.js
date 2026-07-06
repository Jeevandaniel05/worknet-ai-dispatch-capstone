const assert = require("node:assert/strict");
const test = require("node:test");
const { buildDispatchPlan, sanitizeText, triageRequest } = require("../agents/worknetAgent");

test("triageRequest detects high-risk electrical emergencies", () => {
  const triage = triageRequest({
    issue: "There is smoke and sparking from the main switch board",
    address: "Indiranagar, Bengaluru",
  });

  assert.equal(triage.category, "Electrical");
  assert.equal(triage.urgency, "emergency");
  assert.equal(triage.riskLevel, "high");
});

test("buildDispatchPlan ranks matching workers first", () => {
  const plan = buildDispatchPlan({
    issue: "Kitchen pipe leak under the sink",
    address: "Koramangala, Bengaluru",
  });

  assert.equal(plan.triage.category, "Plumbing");
  assert.equal(plan.safety.allowed, true);
  assert.equal(plan.recommendedTeam[0].name, "Daniel Plumbing");
  assert.ok(plan.nextActions.length >= 2);
});

test("sanitizeText strips angle brackets and limits length", () => {
  const unsafe = `<script>${"x".repeat(500)}</script>`;
  const sanitized = sanitizeText(unsafe, 20);

  assert.equal(sanitized.includes("<"), false);
  assert.equal(sanitized.includes(">"), false);
  assert.equal(sanitized.length, 20);
});
