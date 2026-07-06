const URGENCY_KEYWORDS = [
  "spark",
  "smoke",
  "burning",
  "flood",
  "leak",
  "burst",
  "no power",
  "shock",
  "gas",
  "urgent",
  "emergency",
];

const SERVICE_RULES = [
  {
    category: "Electrical",
    keywords: ["wire", "wiring", "switch", "spark", "power", "fan", "electric", "shock"],
    requiredSkills: ["licensed electrical work", "fault isolation", "safety shutdown"],
  },
  {
    category: "Plumbing",
    keywords: ["pipe", "tap", "drain", "water", "leak", "flush", "clog", "burst"],
    requiredSkills: ["leak isolation", "pipe repair", "water damage prevention"],
  },
  {
    category: "Repair",
    keywords: ["ac", "tv", "fridge", "washer", "appliance", "compressor", "display", "cooling"],
    requiredSkills: ["appliance diagnostics", "parts estimate", "repair workflow"],
  },
  {
    category: "Cleaning",
    keywords: ["clean", "deep clean", "bathroom", "kitchen", "dust", "sanitize"],
    requiredSkills: ["deep cleaning", "sanitization", "surface care"],
  },
];

const DEFAULT_WORKERS = [
  {
    id: "worker_sarah_electric",
    name: "Sarah Electric",
    specialty: "Certified electrician",
    categories: ["Electrical"],
    rating: 4.9,
    distanceKm: 3.8,
    etaMinutes: 24,
    hourlyRate: 1099,
    skills: ["licensed electrical work", "fault isolation", "safety shutdown"],
  },
  {
    id: "worker_daniel_plumbing",
    name: "Daniel Plumbing",
    specialty: "Pipe and leak specialist",
    categories: ["Plumbing"],
    rating: 4.7,
    distanceKm: 5,
    etaMinutes: 27,
    hourlyRate: 949,
    skills: ["leak isolation", "pipe repair", "water damage prevention"],
  },
  {
    id: "worker_mike_repairs",
    name: "Mike Repairs",
    specialty: "Appliance technician",
    categories: ["Repair"],
    rating: 4.8,
    distanceKm: 1.9,
    etaMinutes: 18,
    hourlyRate: 899,
    skills: ["appliance diagnostics", "parts estimate", "repair workflow"],
  },
  {
    id: "worker_neha_clean",
    name: "Neha Clean Team",
    specialty: "Home deep cleaning",
    categories: ["Cleaning"],
    rating: 4.8,
    distanceKm: 4.2,
    etaMinutes: 35,
    hourlyRate: 649,
    skills: ["deep cleaning", "sanitization", "surface care"],
  },
];

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function sanitizeText(value, maxLength = 400) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function containsAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function triageRequest(request) {
  const issue = sanitizeText(request.issue);
  const address = sanitizeText(request.address, 180);
  const normalizedIssue = normalizeText(issue);
  const matchedRule = SERVICE_RULES.find((rule) => containsAny(normalizedIssue, rule.keywords));
  const urgent = containsAny(normalizedIssue, URGENCY_KEYWORDS);
  const category = request.category || matchedRule?.category || "Repair";
  const riskLevel = urgent ? "high" : category === "Electrical" || category === "Plumbing" ? "medium" : "standard";

  return {
    category,
    urgency: urgent ? "emergency" : "scheduled",
    riskLevel,
    issue,
    address,
    requiredSkills: matchedRule?.requiredSkills || ["general diagnostics", "customer communication"],
  };
}

function scoreWorker(worker, triage) {
  const categoryMatch = worker.categories.includes(triage.category) ? 45 : 0;
  const skillMatches = triage.requiredSkills.filter((skill) => worker.skills.includes(skill)).length;
  const skillScore = skillMatches * 12;
  const ratingScore = worker.rating * 6;
  const etaScore = Math.max(0, 30 - worker.etaMinutes) * (triage.urgency === "emergency" ? 1.2 : 0.8);
  const distanceScore = Math.max(0, 8 - worker.distanceKm) * 2;

  return Math.round(categoryMatch + skillScore + ratingScore + etaScore + distanceScore);
}

function matchWorkers(triage, workers = DEFAULT_WORKERS) {
  return workers
    .map((worker) => ({
      ...worker,
      score: scoreWorker(worker, triage),
      matchReasons: [
        worker.categories.includes(triage.category) ? `${triage.category} specialist` : "cross-category backup",
        `${worker.rating.toFixed(1)} rating`,
        `${worker.etaMinutes} min ETA`,
      ],
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, triage.urgency === "emergency" ? 2 : 3);
}

function safetyReview(triage) {
  const warnings = [];
  const handoff = [];

  if (triage.riskLevel === "high") {
    warnings.push("High-risk request detected. Customer should avoid touching affected equipment before arrival.");
  }

  if (triage.category === "Electrical") {
    handoff.push("Ask customer to switch off the relevant breaker if it is safe to do so.");
  }

  if (triage.category === "Plumbing") {
    handoff.push("Ask customer to close the nearest water valve if accessible.");
  }

  if (!triage.address) {
    warnings.push("Address is missing, so dispatch cannot be finalized.");
  }

  return {
    allowed: Boolean(triage.issue && triage.address),
    warnings,
    handoff,
  };
}

function buildDispatchPlan(request, workers = DEFAULT_WORKERS) {
  const triage = triageRequest(request);
  const matches = matchWorkers(triage, workers);
  const safety = safetyReview(triage);
  const leadWorker = matches[0];

  return {
    summary: safety.allowed
      ? `${triage.urgency === "emergency" ? "Emergency" : "Scheduled"} ${triage.category.toLowerCase()} dispatch ready for ${leadWorker.name}.`
      : "More information is needed before dispatch.",
    triage,
    recommendedTeam: matches.map((worker) => ({
      id: worker.id,
      name: worker.name,
      specialty: worker.specialty,
      etaMinutes: worker.etaMinutes,
      hourlyRate: worker.hourlyRate,
      score: worker.score,
      matchReasons: worker.matchReasons,
    })),
    safety,
    nextActions: safety.allowed
      ? [
          "Confirm customer address and phone number.",
          `Offer ${leadWorker.name} as the lead worker.`,
          triage.urgency === "emergency" ? "Keep the request in priority dispatch." : "Schedule the preferred time slot.",
        ]
      : ["Collect the missing issue details and service address."],
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  DEFAULT_WORKERS,
  buildDispatchPlan,
  sanitizeText,
  triageRequest,
};
