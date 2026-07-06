const roleButtons = document.querySelectorAll(".role-option");
const loginForm = document.querySelector("#login-form");
const loginEmailInput = document.querySelector("#login-email");
const loginPasswordInput = document.querySelector("#login-password");
const authStatus = document.querySelector("#auth-status");
const socialButtons = document.querySelectorAll("[data-social-provider]");
const DEFAULT_AUTH_BASE_URL = "https://worknet-ommn.onrender.com";
const AUTH_BASE_URL = ["localhost:5000", "127.0.0.1:5000"].includes(window.location.host)
  ? window.location.origin
  : DEFAULT_AUTH_BASE_URL;
const LOGIN_API_URL = `${AUTH_BASE_URL}/login`;
const AUTH_PROVIDERS_API_URL = `${AUTH_BASE_URL}/auth/providers`;
const GOOGLE_LOGIN_START_URL = `${AUTH_BASE_URL}/auth/google/start`;
const APPLE_LOGIN_START_URL = `${AUTH_BASE_URL}/auth/apple/start`;

function loginWithGoogle() {
  window.location.href = `${AUTH_BASE_URL}/auth/google`;
}

if (roleButtons.length && loginForm) {
  const savedRole = localStorage.getItem("worknetRole") || "customer";
  let selectedRole = savedRole;

  function handleAuthCallback() {
    const currentUrl = new URL(window.location.href);
    const authResult = currentUrl.searchParams.get("auth");

    if (!authResult) {
      return;
    }

    const provider = currentUrl.searchParams.get("provider") || "account";
    const message = currentUrl.searchParams.get("message");
    const email = currentUrl.searchParams.get("email");
    const name = currentUrl.searchParams.get("name");
    const role = currentUrl.searchParams.get("role") || selectedRole;

    if (authResult === "success") {
      localStorage.setItem("worknetRole", role);

      if (email) {
        localStorage.setItem("worknetUserEmail", email);
      }

      if (name) {
        localStorage.setItem("worknetUserName", name);
      }

      localStorage.setItem("worknetAuthProvider", provider);
      showAuthStatus(`${provider[0].toUpperCase()}${provider.slice(1)} login successful. Redirecting...`, "success");

      currentUrl.search = "";
      window.history.replaceState({}, document.title, currentUrl.toString());

      setTimeout(() => {
        redirectAfterLogin(role);
      }, 600);

      return;
    }

    showAuthStatus(message || `${provider[0].toUpperCase()}${provider.slice(1)} login failed.`, "error");
    currentUrl.search = "";
    window.history.replaceState({}, document.title, currentUrl.toString());
  }

  function showAuthStatus(message, type = "info") {
    if (!authStatus) {
      return;
    }

    authStatus.textContent = message;
    authStatus.classList.remove("is-success", "is-error", "is-loading");

    if (type === "success") {
      authStatus.classList.add("is-success");
    } else if (type === "error") {
      authStatus.classList.add("is-error");
    } else if (type === "loading") {
      authStatus.classList.add("is-loading");
    }
  }

  function redirectAfterLogin(role) {
    window.location.href = role === "worker" ? "worker-dashboard.html" : "index.html";
  }

  async function requestAuth(url, payload, successMessage) {
    showAuthStatus("Connecting to WorkNet...", "loading");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Auth request failed with status ${response.status}`);
    }

    const data = await response.json();
    const userEmail = data.user?.email || payload.email || "";

    localStorage.setItem("worknetRole", selectedRole);

    if (userEmail) {
      localStorage.setItem("worknetUserEmail", userEmail);
    }

    if (data.user?.name) {
      localStorage.setItem("worknetUserName", data.user.name);
    }

    if (data.user?.provider) {
      localStorage.setItem("worknetAuthProvider", data.user.provider);
    }

    showAuthStatus(successMessage, "success");
    setTimeout(() => {
      redirectAfterLogin(selectedRole);
    }, 600);
  }

  roleButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.role === savedRole);

    button.addEventListener("click", () => {
      selectedRole = button.dataset.role || "customer";
      localStorage.setItem("worknetRole", selectedRole);

      roleButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
    });
  });

  handleAuthCallback();

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const emailValue = loginEmailInput ? loginEmailInput.value.trim() : "";
    const passwordValue = loginPasswordInput ? loginPasswordInput.value : "";

    requestAuth(LOGIN_API_URL, {
      email: emailValue,
      password: passwordValue,
      role: selectedRole,
    }, "Login successful. Redirecting...")
      .catch((error) => {
        showAuthStatus("Login failed. Please try again.", "error");
        console.error(error);
      });
  });

  socialButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const provider = button.dataset.socialProvider;
      const providerLabel = provider === "apple" ? "Apple" : "Google";
      const providerUrl = provider === "apple" ? APPLE_LOGIN_START_URL : GOOGLE_LOGIN_START_URL;
      const redirectUrl = window.location.href.split("?")[0];
      const authUrl = `${providerUrl}?role=${encodeURIComponent(selectedRole)}&redirect=${encodeURIComponent(redirectUrl)}`;

      showAuthStatus(`Opening ${providerLabel} login...`, "loading");
      window.location.href = authUrl;
    });
  });

  fetch(AUTH_PROVIDERS_API_URL)
    .then((res) => res.json())
    .then((providers) => {
      socialButtons.forEach((button) => {
        const provider = button.dataset.socialProvider;
        const available = provider === "apple" ? providers.apple : providers.google;

        if (!available) {
          button.disabled = true;
          button.title = `${provider} login is not configured yet.`;
        }
      });
    })
    .catch((error) => {
      console.error("Unable to load auth provider config", error);
    });
}

const categoryButtons = document.querySelectorAll(".category-chip");
const serviceCards = document.querySelectorAll(".service-card");
const searchInput = document.querySelector("#service-search");
const navItems = document.querySelectorAll(".nav-item");
const goPageButtons = document.querySelectorAll("[data-go-page]");
const emergencyForm = document.querySelector("#emergency-form");
const bookingForm = document.querySelector("#booking-form");
const bookingDateInput = document.querySelector("#booking-date");
const bookingTimeInput = document.querySelector("#booking-time");
const bookingConfirmation = document.querySelector("#booking-confirmation");
const bookingConfirmationText = document.querySelector("#booking-confirmation-text");
const bookingConfirmationDate = document.querySelector("#booking-confirmation-date");
const bookingConfirmationTime = document.querySelector("#booking-confirmation-time");
const bookingDateStat = document.querySelector("#booking-date-stat");
const bookingTimeStat = document.querySelector("#booking-time-stat");
const bookingTeamStat = document.querySelector("#booking-team-stat");
const loginBtn = document.querySelector("#login-btn");
const userInfo = document.querySelector("#user-info");
const headerLoginAction = document.querySelector("#header-login-action");
const bookingDateDisplay = document.querySelector("#booking-date-display");
const bookingTimeDisplay = document.querySelector("#booking-time-display");
const bookingTeamDisplay = document.querySelector("#booking-team-display");
const bookingTeamSizeInput = document.querySelector("#booking-team-size");
const servicesHeading = document.querySelector("#services-heading");
const serviceCountText = document.querySelector("#service-count-text");
const categoryFeatureTitle = document.querySelector("#category-feature-title");
const categoryFeatureText = document.querySelector("#category-feature-text");
const categoryServiceCount = document.querySelector("#category-service-count");
const bookingsContainer = document.querySelector("#bookings");
const bookingsLoading = document.querySelector("#bookings-loading");
const dashboardLoading = document.querySelector("#dashboard-loading");
const dashboardTable = document.querySelector("#dashboard-table");
const dashboardBookingsBody = document.querySelector("#dashboard-bookings-body");
const dashboardEmpty = document.querySelector("#dashboard-empty");
const dashboardBookingCount = document.querySelector("#dashboard-booking-count");
const agentPlanForm = document.querySelector("#agent-plan-form");
const agentIssueInput = document.querySelector("#agent-issue");
const agentAddressInput = document.querySelector("#agent-address");
const agentPlanOutput = document.querySelector("#agent-plan-output");
const BOOKINGS_API_URL = `${AUTH_BASE_URL}/bookings`;
const MY_BOOKINGS_API_URL = `${AUTH_BASE_URL}/my-bookings`;
const BOOK_API_URL = `${AUTH_BASE_URL}/book`;
const AGENT_PLAN_API_URL = `${AUTH_BASE_URL}/agent/plan`;
const PROFILE_API_URL = `${AUTH_BASE_URL}/profile`;
const LOGOUT_URL = `${AUTH_BASE_URL}/logout`;
const LOGIN_URL = `${AUTH_BASE_URL}/auth/google`;
const TEAM_WORKERS_POOL = ["Arjun Kumar", "Priya Sharma", "Rahul Verma"];
const isUserDashboardPage = document.body.classList.contains("dashboard-page");
const defaultLoginButtonMarkup = loginBtn ? loginBtn.innerHTML : "";

function attachProfileDropdown() {
  if (!loginBtn || !userInfo) {
    return;
  }

  const dropdown = document.getElementById("dropdown");
  if (!dropdown) {
    return;
  }

  loginBtn.onclick = (event) => {
    event.preventDefault();
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
  };

  document.addEventListener("click", (event) => {
    const clickedInsideButton = loginBtn.contains(event.target);
    const clickedInsideDropdown = dropdown.contains(event.target);

    if (!clickedInsideButton && !clickedInsideDropdown) {
      dropdown.style.display = "none";
    }
  });
}

function getBookingWorkers(booking) {
  if (Array.isArray(booking?.workers) && booking.workers.length) {
    return booking.workers;
  }

  if (booking?.worker) {
    return [booking.worker];
  }

  return [];
}

function formatWorkerLabel(workers) {
  if (!workers.length) {
    return "Team not assigned";
  }

  if (workers.length === 1) {
    return workers[0];
  }

  return `${workers[0]} + ${workers.length - 1} teammate${workers.length > 2 ? "s" : ""}`;
}

function formatWorkerList(workers) {
  return workers.length ? workers.join(", ") : "Team not assigned";
}

function getStoredUser() {
  return {
    email: localStorage.getItem("worknetUserEmail") || "",
    name: localStorage.getItem("worknetUserName") || "",
    photo: localStorage.getItem("worknetUserPhoto") || "",
  };
}

function persistUser(user) {
  const displayName = user?.displayName || user?.name || "";
  const email = user?.email || "";
  const photoUrl = user?.photos?.[0]?.value || user?.photo || "";

  if (displayName) {
    localStorage.setItem("worknetUserName", displayName);
  }

  if (email) {
    localStorage.setItem("worknetUserEmail", email);
  }

  if (photoUrl) {
    localStorage.setItem("worknetUserPhoto", photoUrl);
  }
}

function handleHomepageAuthCallback() {
  const currentUrl = new URL(window.location.href);
  const authResult = currentUrl.searchParams.get("auth");

  if (!authResult) {
    return null;
  }

  const provider = currentUrl.searchParams.get("provider") || "account";
  const email = currentUrl.searchParams.get("email") || "";
  const name = currentUrl.searchParams.get("name") || "";
  const photo = currentUrl.searchParams.get("photo") || "";
  const role = currentUrl.searchParams.get("role") || "customer";

  if (authResult === "success") {
    const callbackUser = {
      name,
      email,
      photo: photo || localStorage.getItem("worknetUserPhoto") || "",
    };

    localStorage.setItem("worknetRole", role);
    localStorage.setItem("worknetAuthProvider", provider);
    persistUser(callbackUser);

    currentUrl.search = "";
    window.history.replaceState({}, document.title, currentUrl.toString());
    return callbackUser;
  }

  currentUrl.search = "";
  window.history.replaceState({}, document.title, currentUrl.toString());
  return null;
}

function renderUserInfo(user) {
  const fallbackUser = getStoredUser();
  const displayName = user?.displayName || user?.name || fallbackUser.name || "";
  const photoUrl = user?.photo || fallbackUser.photo || "";
  const firstName = displayName ? displayName.split(" ")[0] : "";

  if (loginBtn) {
    if (displayName) {
      loginBtn.innerHTML = `
        ${photoUrl ? `<img src="${photoUrl}" width="30" height="30" style="border-radius:50%; margin-right:8px; object-fit:cover;" alt="${displayName}">` : ""}
        <span>Welcome, ${firstName}</span>
      `;
    } else {
      loginBtn.innerHTML = defaultLoginButtonMarkup || "Login with Google";
      loginBtn.onclick = null;
    }
  }

  if (headerLoginAction) {
    headerLoginAction.href = displayName ? "#" : LOGIN_URL;
    headerLoginAction.hidden = false;
  }

  if (!userInfo) {
    return;
  }

  userInfo.style.position = "relative";

  if (displayName) {
    userInfo.innerHTML = `
      <div id="dropdown" style="position:absolute; top:56px; right:0; background:white; border-radius:10px; padding:10px; display:none; box-shadow:0 4px 10px rgba(0,0,0,0.1); min-width:160px; z-index:20;">
        <a href="my-bookings.html" style="display:block; padding:8px; text-decoration:none; color:black;">My Bookings</a>
        <a href="${LOGOUT_URL}" style="display:block; padding:8px; text-decoration:none; color:black;">Logout</a>
      </div>
    `;
    attachProfileDropdown();
  } else {
    userInfo.innerHTML = "";
  }
}

async function updateLoginButton() {
  try {
    const res = await fetch(PROFILE_API_URL, {
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Not logged in");
    }

    const user = await res.json();
    renderUserInfo(user);
  } catch (err) {
    console.log("User not logged in");
  }
}

async function loadUser() {
  const callbackUser = handleHomepageAuthCallback();
  if (callbackUser) {
    renderUserInfo(callbackUser);
    return callbackUser;
  }

  try {
    const res = await fetch(PROFILE_API_URL, {
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Not logged in");
    }

    const data = await res.json();
    persistUser(data);
    renderUserInfo(data);
    return data;
  } catch (err) {
    console.log("User not logged in");
    renderUserInfo(null);
    return null;
  }
}

const currentUserPromise = loadUser();
updateLoginButton();

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderAgentPlan(plan) {
  if (!agentPlanOutput) {
    return;
  }

  const topWorker = plan.recommendedTeam?.[0];
  const warnings = plan.safety?.warnings || [];
  const handoff = plan.safety?.handoff || [];
  const actions = plan.nextActions || [];

  agentPlanOutput.innerHTML = `
    <div class="agent-result-head">
      <span class="agent-status">${escapeHtml(plan.triage?.urgency || "scheduled")}</span>
      <strong>${escapeHtml(plan.summary)}</strong>
    </div>
    <div class="agent-result-grid">
      <div>
        <span>Category</span>
        <strong>${escapeHtml(plan.triage?.category)}</strong>
      </div>
      <div>
        <span>Risk</span>
        <strong>${escapeHtml(plan.triage?.riskLevel)}</strong>
      </div>
      <div>
        <span>Lead</span>
        <strong>${escapeHtml(topWorker?.name || "Unassigned")}</strong>
      </div>
    </div>
    <div class="agent-list">
      <span>Recommended team</span>
      ${(plan.recommendedTeam || []).map((worker) => `
        <p><strong>${escapeHtml(worker.name)}</strong> · ${escapeHtml(worker.specialty)} · ${worker.etaMinutes} min ETA · score ${worker.score}</p>
      `).join("")}
    </div>
    <div class="agent-list">
      <span>Safety guard</span>
      ${[...warnings, ...handoff].length
        ? [...warnings, ...handoff].map((item) => `<p>${escapeHtml(item)}</p>`).join("")
        : "<p>No special safety warning detected.</p>"}
    </div>
    <div class="agent-list">
      <span>Next actions</span>
      ${actions.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
    </div>
  `;
}

if (agentPlanForm && agentIssueInput && agentAddressInput && agentPlanOutput) {
  agentPlanForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const submitButton = agentPlanForm.querySelector('button[type="submit"]');

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Planning...";
    }

    agentPlanOutput.innerHTML = '<p class="agent-empty">Agents are triaging the request...</p>';

    fetch(AGENT_PLAN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        issue: agentIssueInput.value,
        address: agentAddressInput.value,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Agent request failed with status ${res.status}`);
        }

        return res.json();
      })
      .then(renderAgentPlan)
      .catch((error) => {
        agentPlanOutput.innerHTML = '<p class="agent-empty">Agent planning is unavailable right now. Start the backend locally or check the public API.</p>';
        console.error("Unable to run agent plan", error);
      })
      .finally(() => {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Run Agent Plan";
        }
      });
  });
}

const categoryContent = {
  repair: {
    title: "Repair Services",
    description: "Fast fixes for appliances, TVs, and AC issues with trusted repair professionals.",
    count: 3,
  },
  electrical: {
    title: "Electrical Services",
    description: "Safe support for wiring, fan problems, installations, and switch replacements.",
    count: 4,
  },
  plumbing: {
    title: "Plumbing Services",
    description: "Quick help for leaks, blocked drains, tap issues, and pipe repair work.",
    count: 3,
  },
  cleaning: {
    title: "Cleaning Services",
    description: "Reliable home and bathroom cleaning with flexible hourly booking.",
    count: 2,
  },
};

if (bookingsContainer) {
  if (bookingsLoading) {
    bookingsLoading.hidden = false;
  }

  const bookingsRequest = isUserDashboardPage
    ? fetch(MY_BOOKINGS_API_URL, { credentials: "include" })
    : fetch(BOOKINGS_API_URL);

  currentUserPromise
    .then((currentUser) => bookingsRequest
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Bookings request failed with status ${res.status}`);
        }

        return res.json();
      })
      .then((data) => ({ data, currentUser })))
    .then(({ data, currentUser }) => {
      if (bookingsLoading) {
        bookingsLoading.hidden = true;
      }

      bookingsContainer.innerHTML = "";

      if (!Array.isArray(data)) {
        bookingsContainer.innerHTML = '<p class="bookings-empty">Unable to load bookings right now.</p>';
        return;
      }

      const currentUserEmail = currentUser?.email || getStoredUser().email;
      const visibleBookings = isUserDashboardPage
        ? data
        : data.slice(0, 6);

      if (dashboardBookingCount) {
        dashboardBookingCount.textContent = String(visibleBookings.length);
      }

      if (isUserDashboardPage && !currentUserEmail) {
        bookingsContainer.innerHTML = '<p class="bookings-empty">Sign in with Google to see your personal booking dashboard.</p>';
        return;
      }

      if (!visibleBookings.length) {
        bookingsContainer.innerHTML = isUserDashboardPage
          ? '<p class="bookings-empty">No bookings yet for your account. Book a service to see it here.</p>'
          : '<p class="bookings-empty">No bookings yet.</p>';
        return;
      }

      visibleBookings.forEach((item) => {
        const workers = getBookingWorkers(item);
        const workerCount = Number(item.workerCount) || workers.length || 1;
        const div = document.createElement("div");
        div.className = "booking-ui-card";

        div.innerHTML = `
          <div class="booking-ui-top">
            <div>
              <p class="booking-ui-label">${isUserDashboardPage ? "Assigned team" : "Service team"}</p>
              <h3>${formatWorkerLabel(workers)}</h3>
            </div>
            <span class="booking-ui-chip">${item.category || "Not provided"}</span>
          </div>
          <div class="booking-ui-workers">
            <span>${workerCount} worker${workerCount > 1 ? "s" : ""}</span>
            <span>${formatWorkerList(workers)}</span>
          </div>
          <div class="booking-ui-meta">
            <div class="booking-ui-meta-item">
              <span>Date</span>
              <strong>${item.date || "Not provided"}</strong>
            </div>
            <div class="booking-ui-meta-item">
              <span>Time</span>
              <strong>${item.time || "Not provided"}</strong>
            </div>
            <div class="booking-ui-meta-item">
              <span>Address</span>
              <strong>${item.address || "Not provided"}</strong>
            </div>
          </div>
          <div class="booking-ui-footer">
            <span>${item.issue || "General home service request"}</span>
            ${item.userName ? `<strong>Booked by ${item.userName}</strong>` : ""}
          </div>
        `;

        bookingsContainer.appendChild(div);
      });
    })
    .catch((error) => {
      if (bookingsLoading) {
        bookingsLoading.hidden = true;
      }

      bookingsContainer.innerHTML = '<p class="bookings-empty">Unable to load bookings right now.</p>';
      if (isUserDashboardPage) {
        bookingsContainer.innerHTML = '<p class="bookings-empty">Please log in to view your bookings.</p>';
      }
      console.error("Unable to load bookings", error);
    });
}

if (dashboardBookingsBody) {
  const dashboardStatuses = ["New", "Confirmed", "On the Way", "Completed"];

  fetch(BOOKINGS_API_URL)
    .then((res) => res.json())
    .then((data) => {
      if (dashboardLoading) {
        dashboardLoading.hidden = true;
      }

      dashboardBookingsBody.innerHTML = "";

      if (!Array.isArray(data) || !data.length) {
        if (dashboardEmpty) {
          dashboardEmpty.hidden = false;
        }

        if (dashboardBookingCount) {
          dashboardBookingCount.textContent = "0 bookings";
        }

        return;
      }

      if (dashboardTable) {
        dashboardTable.hidden = false;
      }

      if (dashboardBookingCount) {
        dashboardBookingCount.textContent = `${data.length} bookings`;
      }

      data.forEach((item, index) => {
        const workers = getBookingWorkers(item);
        const row = document.createElement("tr");
        const status = dashboardStatuses[index % dashboardStatuses.length];
        const statusClass = status.toLowerCase().replace(/\s+/g, "-");

        row.innerHTML = `
          <td data-label="Worker">${formatWorkerLabel(workers)}</td>
          <td data-label="Category">${item.category || "Not provided"}</td>
          <td data-label="Date">${item.date || "Not provided"}</td>
          <td data-label="Time">${item.time || "Not provided"}</td>
          <td data-label="Status">
            <span class="dashboard-status dashboard-status-${statusClass}">${status}</span>
          </td>
          <td data-label="Actions">
            <div class="dashboard-actions">
              <button class="dashboard-action dashboard-action-primary" type="button" data-dashboard-action="confirm">Confirm</button>
              <button class="dashboard-action" type="button" data-dashboard-action="complete">Complete</button>
            </div>
          </td>
        `;

        dashboardBookingsBody.appendChild(row);
      });
    })
    .catch((error) => {
      if (dashboardLoading) {
        dashboardLoading.hidden = true;
      }

      if (dashboardEmpty) {
        dashboardEmpty.hidden = false;
        dashboardEmpty.textContent = "Unable to load dashboard bookings right now.";
      }

      console.error("Unable to load dashboard bookings", error);
    });

  dashboardBookingsBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-dashboard-action]");

    if (!button) {
      return;
    }

    const row = button.closest("tr");
    const statusBadge = row ? row.querySelector(".dashboard-status") : null;
    const action = button.dataset.dashboardAction;

    if (!statusBadge) {
      return;
    }

    let nextStatus = "Confirmed";

    if (action === "complete") {
      nextStatus = "Completed";
    } else if (action === "confirm") {
      nextStatus = "On the Way";
    }

    statusBadge.textContent = nextStatus;
    statusBadge.className = `dashboard-status dashboard-status-${nextStatus.toLowerCase().replace(/\s+/g, "-")}`;
  });
}

if (categoryButtons.length && serviceCards.length && searchInput) {
  const activeButton = document.querySelector(".category-chip.active");
  let activeCategory = activeButton?.dataset.category || "repair";

  function filterServices() {
    const searchTerm = searchInput.value.trim().toLowerCase();

    serviceCards.forEach((card) => {
      const categories = (card.dataset.category || "").toLowerCase();
      const content = card.textContent.toLowerCase();
      const matchesCategory = categories.includes(activeCategory);
      const matchesSearch = content.includes(searchTerm);

      card.classList.toggle("hidden", !(matchesCategory && matchesSearch));
    });
  }

  function updateCategoryContent() {
    const content = categoryContent[activeCategory];

    if (!content) {
      return;
    }

    if (servicesHeading) {
      servicesHeading.textContent = content.title;
    }

    if (serviceCountText) {
      serviceCountText.textContent = `${content.count} services`;
    }

    if (categoryFeatureTitle) {
      categoryFeatureTitle.textContent = content.title;
    }

    if (categoryFeatureText) {
      categoryFeatureText.textContent = content.description;
    }

    if (categoryServiceCount) {
      categoryServiceCount.textContent = String(content.count);
    }
  }

  function replayCardAnimation() {
    serviceCards.forEach((card, index) => {
      if (card.classList.contains("hidden")) {
        return;
      }

      card.style.animation = "none";
      void card.offsetWidth;
      card.style.animation = `riseIn 420ms ease ${index * 60}ms both`;
    });
  }

  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      categoryButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      updateCategoryContent();
      filterServices();
      replayCardAnimation();
    });
  });

  searchInput.addEventListener("input", () => {
    filterServices();
    replayCardAnimation();
  });

  updateCategoryContent();
  filterServices();
  replayCardAnimation();
}

if (navItems.length) {
  navItems.forEach((item) => {
    item.addEventListener("click", (event) => {
      navItems.forEach((link) => link.classList.remove("active"));
      item.classList.add("active");
    });
  });
}

if (goPageButtons.length) {
  goPageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const page = button.dataset.goPage;

      if (page) {
        window.location.href = page;
      }
    });
  });
}

if (emergencyForm) {
  emergencyForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const issue = document.querySelector("#emergency-issue");
    const address = document.querySelector("#emergency-address");
    const phone = document.querySelector("#emergency-phone");

    localStorage.setItem("worknetEmergencyIssue", issue ? issue.value : "");
    localStorage.setItem("worknetEmergencyAddress", address ? address.value.trim() : "");
    localStorage.setItem("worknetEmergencyPhone", phone ? phone.value.trim() : "");

    window.location.href = "worker-details.html";
  });
}

if (bookingForm && bookingDateInput && bookingTimeInput && bookingTeamSizeInput) {
  const savedDate = localStorage.getItem("worknetBookingDate");
  const savedTime = localStorage.getItem("worknetBookingTime");
  const savedBookingWorker = localStorage.getItem("worknetBookingWorker") || TEAM_WORKERS_POOL[0];
  const savedBookingCategory = localStorage.getItem("worknetBookingCategory") || "Repair";
  const savedWorkerCount = Number(localStorage.getItem("worknetBookingWorkerCount")) || 1;
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  bookingDateInput.min = minDate;

  if (savedDate) {
    bookingDateInput.value = savedDate;
  }

  if (savedTime) {
    bookingTimeInput.value = savedTime;
  }

  bookingTeamSizeInput.value = String(savedWorkerCount);

  function formatBookingDate(dateValue) {
    return new Date(`${dateValue}T00:00:00`).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatBookingTime(timeValue) {
    const [hours, minutes] = timeValue.split(":");
    return new Date(2000, 0, 1, Number(hours), Number(minutes)).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function buildWorkerTeam(workerCount) {
    const teamSeed = [savedBookingWorker, ...TEAM_WORKERS_POOL.filter((worker) => worker !== savedBookingWorker)];
    return teamSeed.slice(0, workerCount);
  }

  function updateBookingSummary(dateValue, timeValue, workerCount) {
    if (bookingDateStat && bookingDateDisplay && dateValue) {
      bookingDateDisplay.textContent = formatBookingDate(dateValue);
      bookingDateStat.hidden = false;
    }

    if (bookingTimeStat && bookingTimeDisplay && timeValue) {
      bookingTimeDisplay.textContent = formatBookingTime(timeValue);
      bookingTimeStat.hidden = false;
    }

    if (bookingTeamStat && bookingTeamDisplay && workerCount) {
      bookingTeamDisplay.textContent = `${workerCount} worker${workerCount > 1 ? "s" : ""}`;
      bookingTeamStat.hidden = false;
    }
  }

  function showBookingConfirmation(dateValue, timeValue, workers) {
    if (!bookingConfirmation || !bookingConfirmationText) {
      return;
    }

    const formattedDate = formatBookingDate(dateValue);
    const formattedTime = formatBookingTime(timeValue);
    const workerLabel = formatWorkerLabel(workers);

    bookingConfirmationText.textContent = `${workerLabel} is booked for ${formattedDate} at ${formattedTime}.`;

    if (bookingConfirmationDate) {
      bookingConfirmationDate.textContent = formattedDate;
    }

    if (bookingConfirmationTime) {
      bookingConfirmationTime.textContent = formattedTime;
    }

    bookingConfirmation.hidden = false;
  }

  if (savedDate && savedTime) {
    const savedWorkers = buildWorkerTeam(savedWorkerCount);
    updateBookingSummary(savedDate, savedTime, savedWorkerCount);
    showBookingConfirmation(savedDate, savedTime, savedWorkers);
  }

  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitBooking();
  });

  function submitBooking() {
    const submitButton = bookingForm.querySelector('button[type="submit"]');

    const selectedDate = bookingDateInput.value;
    const selectedTime = bookingTimeInput.value;
    const workerCount = Number(bookingTeamSizeInput.value) || 1;
    const workers = buildWorkerTeam(workerCount);
    const emergencyIssue = localStorage.getItem("worknetEmergencyIssue") || "General repair";
    const emergencyAddress = localStorage.getItem("worknetEmergencyAddress") || "Address not provided";
    const emergencyPhone = localStorage.getItem("worknetEmergencyPhone") || "";
    const storedUser = getStoredUser();
    const bookingPayload = {
      workers,
      workerCount,
      category: savedBookingCategory,
      date: selectedDate,
      time: selectedTime,
      issue: emergencyIssue,
      address: emergencyAddress,
      phone: emergencyPhone,
      userEmail: storedUser.email,
      userName: storedUser.name,
      createdAt: new Date().toISOString(),
    };

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Booking...";
    }

    fetch(BOOK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookingPayload),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Booking request failed with status ${res.status}`);
        }

        return res.json();
      })
      .then((data) => {
        console.log(data);
        localStorage.setItem("worknetBookingDate", selectedDate);
        localStorage.setItem("worknetBookingTime", selectedTime);
        localStorage.setItem("worknetBookingWorkerCount", String(workerCount));
        updateBookingSummary(selectedDate, selectedTime, workerCount);
        showBookingConfirmation(selectedDate, selectedTime, workers);
      })
      .catch((error) => {
        window.alert("Booking could not be confirmed right now. Please try again.");
        console.error(error);
      })
      .finally(() => {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Confirm Booking";
        }
      });
  }
}
