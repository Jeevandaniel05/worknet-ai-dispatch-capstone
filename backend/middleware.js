function createRateLimiter({ windowMs = 60_000, max = 60 } = {}) {
  const hits = new Map();

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    const key = req.ip || req.headers["x-forwarded-for"] || "local";
    const bucket = hits.get(key) || { count: 0, resetAt: now + windowMs };

    if (bucket.resetAt <= now) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    hits.set(key, bucket);

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - bucket.count)));

    if (bucket.count > max) {
      return res.status(429).json({ error: "Too many requests. Please retry shortly." });
    }

    return next();
  };
}

function validateAgentRequest(req, res, next) {
  const body = req.body || {};
  const issue = String(body.issue || "").trim();
  const address = String(body.address || "").trim();

  if (!issue || issue.length < 6) {
    return res.status(400).json({ error: "Issue must describe the service problem." });
  }

  if (!address || address.length < 6) {
    return res.status(400).json({ error: "Address is required for dispatch planning." });
  }

  if (issue.length > 400 || address.length > 180) {
    return res.status(400).json({ error: "Request fields are too long." });
  }

  return next();
}

module.exports = {
  createRateLimiter,
  validateAgentRequest,
};
