const crypto = require("crypto");
const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const appleSignin = require("apple-signin-auth");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./models/User");
const { buildDispatchPlan } = require("./agents/worknetAgent");
const { createRateLimiter, validateAgentRequest } = require("./middleware");

const app = express();
const hasMongoConfig = Boolean(process.env.MONGO_URI);
const hasGoogleAuthConfig = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_REDIRECT_URI
);
const frontendLoginUrl = process.env.FRONTEND_LOGIN_URL || "http://127.0.0.1:5500/login.html";
const frontendOrigin = process.env.FRONTEND_ORIGIN;
const allowedOrigins = (frontendOrigin || "http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:5000,http://localhost:5000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const memoryBookings = [];
const marketplaceServices = [
  {
    id: "service_appliance_repair",
    title: "Appliance Repair",
    description: "Kitchen and home appliance troubleshooting.",
    priceLabel: "₹949/hr",
    category: "Repair",
    icon: "kitchen",
    tint: "#FFD8C7",
    imageUrl:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "service_tv_repair",
    title: "TV Repair",
    description: "Display, sound, and power issue fixes.",
    priceLabel: "₹799/hr",
    category: "Repair",
    icon: "tv",
    tint: "#FFD8C7",
    imageUrl:
      "https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "service_ac_repair",
    title: "AC Repair",
    description: "Cooling, airflow, and compressor support.",
    priceLabel: "₹1,149/hr",
    category: "Repair",
    icon: "ac_unit",
    tint: "#FFE8D9",
    imageUrl:
      "https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "service_bike_repair",
    title: "Bike Repair",
    description: "Two-wheeler servicing, puncture, brake, and engine fixes.",
    priceLabel: "₹899/hr",
    category: "Repair",
    icon: "bike",
    tint: "#FFE0D3",
    imageUrl:
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "service_car_repair",
    title: "Car Repair",
    description: "Car diagnostics, battery, brake, and engine support.",
    priceLabel: "₹1,299/hr",
    category: "Repair",
    icon: "car",
    tint: "#FFE6DA",
    imageUrl:
      "https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "service_switch_repair",
    title: "Switch Repair",
    description: "Switchboard and wiring fault support.",
    priceLabel: "₹699/hr",
    category: "Electrical",
    icon: "bolt",
    tint: "#FFEFD6",
    imageUrl:
      "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "service_pipe_fix",
    title: "Pipe Leak Fix",
    description: "Leak repairs and pipe replacement service.",
    priceLabel: "₹849/hr",
    category: "Plumbing",
    icon: "plumbing",
    tint: "#DDF4FF",
    imageUrl:
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "service_deep_clean",
    title: "Deep Cleaning",
    description: "Home and office deep cleaning sessions.",
    priceLabel: "₹649/hr",
    category: "Cleaning",
    icon: "cleaning",
    tint: "#E9FBEF",
    imageUrl:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80",
  },
];
const marketplaceWorkers = [
  {
    id: "worker_mike_repairs",
    name: "Mike Repairs",
    specialty: "Appliance technician",
    rating: 4.8,
    distance: "1.2 mi away",
    priceLabel: "₹899/hr",
    badge: "Fast response",
    arrivalEta: "18 min",
    completedJobs: 124,
  },
  {
    id: "worker_sarah_electric",
    name: "Sarah Electric",
    specialty: "Certified electrician",
    rating: 4.9,
    distance: "2.4 mi away",
    priceLabel: "₹1,099/hr",
    badge: "Top rated",
    arrivalEta: "24 min",
    completedJobs: 151,
  },
  {
    id: "worker_daniel_plumbing",
    name: "Daniel Plumbing",
    specialty: "Pipe and leak specialist",
    rating: 4.7,
    distance: "3.1 mi away",
    priceLabel: "₹949/hr",
    badge: "Nearby",
    arrivalEta: "27 min",
    completedJobs: 97,
  },
  {
    id: "worker_aarav_auto",
    name: "Aarav Auto",
    specialty: "Bike and car mechanic",
    rating: 4.8,
    distance: "2.0 mi away",
    priceLabel: "₹1,149/hr",
    badge: "Vehicle expert",
    arrivalEta: "22 min",
    completedJobs: 132,
  },
];

app.set("trust proxy", 1);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin not allowed by WorkNet CORS policy"));
  },
  credentials: true,
}));
app.use(express.json());
app.use(createRateLimiter({ windowMs: 60_000, max: 120 }));
app.use(session({
  secret: process.env.SESSION_SECRET || "secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "none",
    secure: true,
  },
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..", "frontend")));

if (hasMongoConfig) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.log(err));
} else {
  console.log("⚠️ MongoDB not configured. Using in-memory booking storage.");
}

const bookingSchema = new mongoose.Schema({
  worker: String,
  workerId: String,
  workers: [String],
  workerCount: Number,
  category: String,
  date: String,
  time: String,
  issue: String,
  address: String,
  phone: String,
  userEmail: String,
  userName: String,
  userGoogleId: String,
  parts: [
    {
      id: String,
      name: String,
      price: Number,
      unit: String,
    },
  ],
  partsTotal: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    default: "Confirmed",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Booking = mongoose.model("Booking", bookingSchema);

if (hasGoogleAuthConfig) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const existingUser = await User.findOne({ googleId: profile.id });

        if (existingUser) {
          return done(null, existingUser);
        }

        const newUser = await User.create({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails?.[0]?.value || "",
          photo: profile.photos?.[0]?.value || "",
        });

        return done(null, newUser);
      } catch (err) {
        return done(err, null);
      }
    }
  ));
} else {
  console.log("⚠️ Google OAuth not configured. Google login endpoints are disabled.");
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

function getApplePrivateKey() {
  return (process.env.APPLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
}

function encodeState(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeState(encodedState) {
  if (!encodedState) {
    return {};
  }

  try {
    return JSON.parse(Buffer.from(encodedState, "base64url").toString("utf8"));
  } catch (error) {
    return {};
  }
}

function buildFrontendRedirect(redirectUrl, params) {
  const targetUrl = new URL(redirectUrl || frontendLoginUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      targetUrl.searchParams.set(key, value);
    }
  });

  return targetUrl.toString();
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }

  return res.status(401).json({ error: "Unauthorized" });
}

async function createBookingRecord(payload) {
  if (!hasMongoConfig) {
    const booking = {
      _id: `memory_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      ...payload,
      createdAt: new Date(),
    };
    memoryBookings.unshift(booking);
    return booking;
  }

  return Booking.create(payload);
}

async function getBookingRecords(query = null) {
  if (!hasMongoConfig) {
    if (!query) {
      return [...memoryBookings];
    }

    if (query.userEmail) {
      return memoryBookings.filter((booking) => booking.userEmail === query.userEmail);
    }

    if (query.$or) {
      return memoryBookings.filter((booking) =>
        query.$or.some((rule) =>
          Object.entries(rule).every(([key, value]) => booking[key] === value)
        )
      );
    }

    return [...memoryBookings];
  }

  if (!query) {
    return Booking.find().sort({ createdAt: -1 });
  }

  return Booking.find(query).sort({ createdAt: -1 });
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "WorkNet backend is running",
    capabilities: ["marketplace", "bookings", "dispatch-agent", "mcp-tools"],
  });
});

app.post("/agent/plan", validateAgentRequest, (req, res) => {
  const plan = buildDispatchPlan(req.body, marketplaceWorkers.map((worker) => ({
    id: worker.id,
    name: worker.name,
    specialty: worker.specialty,
    categories: worker.specialty.toLowerCase().includes("electric")
      ? ["Electrical"]
      : worker.specialty.toLowerCase().includes("plumbing")
        ? ["Plumbing"]
        : worker.specialty.toLowerCase().includes("clean")
          ? ["Cleaning"]
          : ["Repair"],
    rating: worker.rating,
    distanceKm: Number.parseFloat(worker.distance) * 1.609 || 4,
    etaMinutes: Number.parseInt(worker.arrivalEta, 10) || 30,
    hourlyRate: Number.parseInt(String(worker.priceLabel).replace(/\D/g, ""), 10) || 900,
    skills: worker.specialty.toLowerCase().includes("electric")
      ? ["licensed electrical work", "fault isolation", "safety shutdown"]
      : worker.specialty.toLowerCase().includes("plumbing")
        ? ["leak isolation", "pipe repair", "water damage prevention"]
        : ["appliance diagnostics", "parts estimate", "repair workflow"],
  })));

  res.json(plan);
});

app.get("/auth/providers", (req, res) => {
  res.json({
    google: Boolean(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI
    ),
    apple: Boolean(
      process.env.APPLE_CLIENT_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID &&
      process.env.APPLE_PRIVATE_KEY &&
      process.env.APPLE_REDIRECT_URI
    ),
  });
});

app.get("/services", (req, res) => {
  res.json(marketplaceServices);
});

app.get("/workers", (req, res) => {
  res.json(marketplaceWorkers);
});

app.get("/marketplace", (req, res) => {
  res.json({
    services: marketplaceServices,
    workers: marketplaceWorkers,
  });
});

app.post("/login", (req, res) => {
  const { email, role, name, provider, photo, googleId } = req.body;

  res.json({
    success: true,
    message: "Login success",
    user: {
      email,
      name: name || email?.split("@")[0] || "WorkNet User",
      role: role || "customer",
      provider: provider || "email",
      photo: photo || "",
      googleId: googleId || "",
    },
  });
});

app.get("/profile", (req, res) => {
  if (req.user) {
    res.json({
      displayName: req.user.name || req.user.displayName || "",
      email: req.user.email || "",
      photo: req.user.photo || req.user.photos?.[0]?.value || "",
      googleId: req.user.googleId || "",
    });
  } else {
    res.status(401).send("Not logged in");
  }
});

app.get("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid", {
        httpOnly: true,
        sameSite: "none",
        secure: true,
      });
      res.redirect(frontendLoginUrl);
    });
  });
});

app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get("/auth/google/start",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get("/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/",
  }),
  (req, res) => {
    res.redirect(buildFrontendRedirect(process.env.FRONTEND_LOGIN_URL || frontendLoginUrl, {
      auth: "success",
      provider: "google",
      email: req.user?.email,
      name: req.user?.name,
      photo: req.user?.photo,
      role: "customer",
    }));
  }
);

app.get("/auth/apple/start", (req, res) => {
  if (
    !process.env.APPLE_CLIENT_ID ||
    !process.env.APPLE_TEAM_ID ||
    !process.env.APPLE_KEY_ID ||
    !process.env.APPLE_PRIVATE_KEY ||
    !process.env.APPLE_REDIRECT_URI
  ) {
    return res.redirect(buildFrontendRedirect(req.query.redirect, {
      auth: "error",
      provider: "apple",
      message: "Apple login is not configured yet.",
    }));
  }

  const role = req.query.role || "customer";
  const redirect = req.query.redirect || process.env.FRONTEND_LOGIN_URL;
  const nonce = crypto.randomUUID();
  const state = encodeState({ role, redirect, nonce });
  const authUrl = appleSignin.getAuthorizationUrl({
    clientID: process.env.APPLE_CLIENT_ID,
    redirectUri: process.env.APPLE_REDIRECT_URI,
    scope: "name email",
    responseMode: "form_post",
    responseType: "code id_token",
    state,
    nonce,
  });

  res.redirect(authUrl);
});

app.post("/auth/apple/callback", async (req, res) => {
  const parsedState = decodeState(req.body.state);
  const role = parsedState.role || "customer";
  const redirect = parsedState.redirect;

  try {
    const tokenResponse = await appleSignin.getAuthorizationToken(req.body.code, {
      clientID: process.env.APPLE_CLIENT_ID,
      redirectUri: process.env.APPLE_REDIRECT_URI,
      teamID: process.env.APPLE_TEAM_ID,
      keyIdentifier: process.env.APPLE_KEY_ID,
      privateKey: getApplePrivateKey(),
    });
    const idToken = req.body.id_token || tokenResponse.id_token;
    const claims = await appleSignin.verifyIdToken(idToken, {
      audience: process.env.APPLE_CLIENT_ID,
      nonce: parsedState.nonce,
    });

    let fullName = "Aarav Kumar";
    if (req.body.user) {
      const parsedUser = JSON.parse(req.body.user);
      fullName = [parsedUser.name?.firstName, parsedUser.name?.lastName].filter(Boolean).join(" ") || fullName;
    }

    res.redirect(buildFrontendRedirect(redirect, {
      auth: "success",
      provider: "apple",
      email: claims?.email,
      name: fullName,
      role,
    }));
  } catch (error) {
    console.error(error);
    res.redirect(buildFrontendRedirect(redirect, {
      auth: "error",
      provider: "apple",
      message: "Apple login failed.",
    }));
  }
});

app.post("/book", async (req, res) => {
  try {
    const booking = req.body || {};
    const authenticatedUser = req.user || {};
    const normalizedWorkers = Array.isArray(booking.workers) && booking.workers.length
      ? booking.workers
      : booking.worker
        ? [booking.worker]
        : [];
    const normalizedBooking = {
      ...booking,
      workers: normalizedWorkers,
      workerCount: Number(booking.workerCount) || normalizedWorkers.length || 1,
      worker: normalizedWorkers[0] || booking.worker || "",
      workerId: booking.workerId || "",
      userEmail: authenticatedUser.email || booking.userEmail || "",
      userName: authenticatedUser.name || booking.userName || "",
      userGoogleId: authenticatedUser.googleId || booking.userGoogleId || "",
      status: booking.status || "Confirmed",
    };
    const newBooking = await createBookingRecord(normalizedBooking);

    res.json({
      message: "Booking confirmed",
      booking: newBooking,
    });
  } catch (error) {
    console.error("Booking save failed:", error);
    res.status(500).json({ error: "Error saving booking" });
  }
});

app.get("/bookings", async (req, res) => {
  try {
    const data = await getBookingRecords();
    res.json(data);
  } catch (error) {
    console.error("Fetching bookings failed:", error);
    res.status(500).json({ error: "Error fetching bookings" });
  }
});

app.get("/my-bookings", ensureAuthenticated, async (req, res) => {
  try {
    const filters = [];

    if (req.user?.googleId) {
      filters.push({ userGoogleId: req.user.googleId });
    }

    if (req.user?.email) {
      filters.push({ userEmail: req.user.email });
    }

    const query = filters.length ? { $or: filters } : { _id: null };
    const data = await getBookingRecords(query);
    res.json(data);
  } catch (error) {
    console.error("Fetching authenticated bookings failed:", error);
    res.status(500).json({ error: "Error fetching your bookings" });
  }
});

app.get("/my-bookings-by-email", async (req, res) => {
  try {
    const email = (req.query.email || "").trim();

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const data = await getBookingRecords({ userEmail: email });
    res.json(data);
  } catch (error) {
    console.error("Fetching bookings by email failed:", error);
    res.status(500).json({ error: "Error fetching bookings by email" });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
