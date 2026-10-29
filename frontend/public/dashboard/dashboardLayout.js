// SMSYS shared script (dashboard.html + every page in "dashboard tabs/").
// 1. Tab pages: injects the sidebar, top bar and logout modal (dashboard.html already has them in its HTML).
// 2. Live clock.  3. Fills the tab pages with sample data (replace with real data later).

const $ = (id) => document.getElementById(id);
const app = $("app"); // only exists on the tab pages
const pageUrl = new URL(window.location.href);
const API_HOST = window.location.hostname === "localhost"
  ? "127.0.0.1"
  : (window.location.hostname || "127.0.0.1");
const API_BASE = `${window.location.protocol}//${API_HOST}:5000`;

function getAuthHeaders() {
  const token = sessionStorage.getItem("smsys_access_token");
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function clearRememberedSupervisorSession() {
  sessionStorage.removeItem("smsys_access_token");
  sessionStorage.removeItem("smsys_supervisor_name");
  sessionStorage.removeItem("smsys_site_id");
  sessionStorage.removeItem("smsys_dashboard_background");
}

function redirectToSiteAccess() {
  clearRememberedSupervisorSession();
  if (window.top) window.top.location.href = "/site-access";
  else window.location.href = "/site-access";
}

const incomingSupervisorName = pageUrl.searchParams.get("supervisor_name");
const incomingSiteId = pageUrl.searchParams.get("site_id");
const incomingBackgroundUrl = pageUrl.searchParams.get("background_url");

if (incomingSupervisorName) {
  sessionStorage.setItem("smsys_supervisor_name", incomingSupervisorName);
}
if (incomingSiteId) {
  sessionStorage.setItem("smsys_site_id", incomingSiteId);
}
if (incomingBackgroundUrl) {
  sessionStorage.setItem("smsys_dashboard_background", incomingBackgroundUrl);
}

const supervisorName =
  incomingSupervisorName || sessionStorage.getItem("smsys_supervisor_name") || "Supervisor";
const backgroundUrl =
  incomingBackgroundUrl || sessionStorage.getItem("smsys_dashboard_background") || "";

if (backgroundUrl) {
  document.documentElement.style.setProperty(
    "--dashboard-background-image",
    `url("${backgroundUrl.replace(/["\\\n\r]/g, "")}")`
  );
}

function updateSupervisorName() {
  const nameElement = $("supervisorNameValue");
  if (nameElement) nameElement.textContent = supervisorName;
}

/* ---------- 1. Sidebar / top bar for tab pages ---------- */
if (app) {
  app.classList.add("page");
  const active = document.body.dataset.active;
  const NAV = [
    ["dashboard", "Dashboard", "../dashboard.html", "M3 3h8v10H3zm10 0h8v6h-8zM3 15h8v6H3zm10-4h8v10h-8z"],
    ["ppe", "PPE Status", "PpeStatus.html", "M4 6h3l1.5-2h7L17 6h3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm8 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"],
    ["drowsy", "Drowsiness Status", "drowsinessStatus.html", "M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"],
    ["devices", "Device Connectivity", "deviceConnectivity.html", "M3 4h14v10H3zm4 12h6v2H7zM19 8h2v10h-2z"],
    ["history", "Alerts History", "alertsHistory.html", "M6 2h9l5 5v15H6zm2 10h9v2H8zm0 4h9v2H8z"],
    ["zone", "Zone Localization", "zoneLocalization.html", "M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"],
    ["analytics", "Analytics", "analytics.html", "M3 20h18v2H3zM5 11h3v8H5zm5-4h3v12h-3zm5-4h3v16h-3z"],
    ["siteinfo", "Site Information", "siteInformation.html", "M6 2h9l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1v5h5M8 12h8v2H8zm0 4h8v2H8z"],
    ["settings", "Account Settings", "accountSettings.html", "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.2 4a8.2 8.2 0 0 0-.1-1.2l1.7-1.3-1.7-3-2 .8a8.1 8.1 0 0 0-1.5-.9L16.3 4h-3.5l-.4 2.4a8.1 8.1 0 0 0-1.5.9l-2-.8-1.7 3 1.7 1.3a8.2 8.2 0 0 0 0 2.4l-1.7 1.3 1.7 3 2-.8a8.1 8.1 0 0 0 1.5.9l.4 2.4h3.5l.4-2.4a8.1 8.1 0 0 0 1.5-.9l2 .8 1.7-3-1.7-1.3a8.2 8.2 0 0 0 0-1.2z"],
  ];
  const ico = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  const items = NAV.map(([k, label, href, d]) =>
    `<li><a class="nav-item${k === active ? " active" : ""}" href="${encodeURI(href)}">${ico(d)}${label}</a></li>`).join("");

  app.insertAdjacentHTML("afterbegin", `
    <nav class="nav" data-active="${active}">
      <div class="nav-head"><img src="../../assets/icons/1.hardhat_logo.png" alt=""><div><strong>SMSYS</strong><small>SMART MONITORING SYSTEM</small></div></div>
      <div class="nav-body"></div><div class="nav-rail"></div><div class="nav-notch"></div>
      <ul class="nav-list">${items}
        <li class="nav-item-logout"><a class="nav-item" href="#logout">${ico("M5 3h9v4h-2V5H7v14h5v-2h2v4H5zm11 5l5 4-5 4v-3h-5v-2h5z")}Logout</a></li>
      </ul>
    </nav>
    <header class="topbar">
      <div class="topbar-item topbar-site"><details class="dropdown"><summary class="site-toggle"><small>SITE</small><span class="value" id="siteNameValue">Loading site...</span>
        <svg class="chevron" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="#ffbc2d" stroke-width="1.8"/></svg></summary>
        <ul class="dropdown-menu" id="siteOptions"><li><a href="#">Loading sites...</a></li></ul></details></div>
      <div class="topbar-item topbar-datetime"><small>DATE &amp; TIME</small><div class="datetime"><span class="value" id="date"></span><span class="divider"></span><span class="value" id="time"></span></div></div>
      <div class="topbar-item topbar-notifications"><details class="dropdown"><summary class="bell-toggle" aria-label="Notifications">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="#feaf1c" aria-hidden="true"><path d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 0 0-5.5-6.8V3.5a1.5 1.5 0 0 0-3 0v.7A7 7 0 0 0 5 11v5l-2 2v1h18v-1z"/></svg><span class="badge">2</span></summary>
        <div class="dropdown-menu notifications-menu"><h4>Notifications</h4><ul><li>Worker without hardhat detected<small>2 mins ago</small></li><li>Drowsiness alert: Camera 2<small>15 mins ago</small></li></ul></div></details></div>
      <div class="topbar-item topbar-account"><svg width="50" height="50" viewBox="0 0 50 50" aria-hidden="true"><circle cx="25" cy="25" r="23" fill="#d0d0d0"/><circle cx="25" cy="19" r="8" fill="#0b1735"/><path d="M9 40c3-9 9-12 16-12s13 3 16 12a23 23 0 0 1-32 0z" fill="#0b1735"/></svg><span id="supervisorNameValue">Supervisor</span></div>
    </header>
    <div class="modal" id="logout"><a class="modal-backdrop" href="#" aria-label="Close"></a>
      <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="logout-title"><h2 id="logout-title">LOG OUT</h2><p>Are you sure you want to log out?</p>
        <div class="modal-actions"><a class="btn btn-primary" href="/dashboard-login" target="_top">YES, LOG OUT</a><a class="btn btn-outline" href="#">CANCEL</a></div></div></div>`);
}

updateSupervisorName();

// Revoke the server-side bearer token and clear this browser's supervisor session on logout.
document.querySelectorAll(".modal .btn-primary").forEach((logoutLink) => {
  logoutLink.addEventListener("click", async (event) => {
    event.preventDefault();
    const token = sessionStorage.getItem("smsys_access_token");
    if (token) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
      } catch (error) {
        console.warn("Could not contact the backend to revoke the session.", error);
      }
    }
    clearRememberedSupervisorSession();
    if (window.top) window.top.location.href = "/dashboard-login";
    else window.location.href = "/dashboard-login";
  });
});

/* ---------- 2. Clock (CSS cannot display a live clock) ---------- */
const dateEl = $("date"), timeEl = $("time");
function updateClock() {
  const now = new Date();
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric"
    });
  }
  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  }
}
updateClock();
setInterval(updateClock, 1000);


/* ---------- 3. Dashboard Overview API (main dashboard only) ---------- */
if (!app) {
  let currentSiteId = pageUrl.searchParams.get("site_id") || sessionStorage.getItem("smsys_site_id") || "";

  const setText = (id, value) => {
    const element = $(id);
    if (element) element.textContent = value == null ? "—" : String(value);
  };

  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));

  const statusClass = (value) => {
    const status = String(value || "").trim().toLowerCase();
    if (["online", "connected", "awake", "normal", "localized", "present", "compliant"].includes(status)) return "ok";
    if (["offline", "disconnected", "drowsy", "violation", "missing"].includes(status)) return "bad";
    return "warn";
  };

  const formatTime = (value) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return escapeHTML(value);
    return parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return escapeHTML(value);
    return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const renderSiteOptions = (sites, selectedSite) => {
    setText("siteNameValue", selectedSite ? selectedSite.site_name : "No site created");
    const list = $("siteOptions");
    if (!list) return;

    if (!sites || sites.length === 0) {
      list.innerHTML = '<li><a href="#">No sites created yet.</a></li>';
      return;
    }

    list.innerHTML = sites.map((site) => `
      <li><a href="#" data-site-id="${escapeHTML(site.id)}" class="${selectedSite && Number(selectedSite.id) === Number(site.id) ? "selected" : ""}">
        ${escapeHTML(site.site_name)}
      </a></li>
    `).join("");

    list.querySelectorAll("[data-site-id]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        currentSiteId = link.dataset.siteId;
        sessionStorage.setItem("smsys_site_id", currentSiteId);
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("site_id", currentSiteId);
        window.history.replaceState({}, "", nextUrl);
        const dropdown = link.closest("details");
        if (dropdown) dropdown.open = false;
        loadDashboardOverview();
      });
    });
  };

  const renderRecentAlerts = (alerts) => {
    const container = $("recentAlerts");
    if (!container) return;

    if (!alerts || alerts.length === 0) {
      container.innerHTML = '<div class="alert"><div class="alert-text">No alerts recorded yet.</div></div>';
      return;
    }

    const warningTypes = ["unmonitored", "device_offline", "warning"];
    container.innerHTML = alerts.map((alert) => {
      const type = String(alert.alert_type || "alert").toLowerCase().replace(/[ -]+/g, "_");
      const warning = warningTypes.some((part) => type.includes(part));
      const title = type.includes("drows") ? "DROWSINESS ALERT" : (type.includes("ppe") || type.includes("missing") ? "PPE VIOLATION" : String(alert.alert_type || "ALERT").toUpperCase());
      return `
        <div class="alert ${warning ? "warning" : ""}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L1 21h22zm1 15h-2v-2h2zm0-4h-2V9h2z"/></svg>
          <div class="alert-text"><strong>${escapeHTML(title)}</strong>${escapeHTML(alert.message || "Alert recorded")}<br>Time: ${escapeHTML(formatTime(alert.created_at))}</div>
          <div class="alert-meta">${escapeHTML(alert.device_id || "—")}<br>${escapeHTML(alert.worker_name || "Unassigned")}<br>${escapeHTML(formatDate(alert.created_at))}</div>
          <div class="alert-thumb"></div>
        </div>
      `;
    }).join("");
  };

  const renderDeviceConnectivity = (devices) => {
    const body = $("deviceConnectivityBody");
    if (!body) return;
    if (!devices || devices.length === 0) {
      body.innerHTML = '<tr><td colspan="2">No device records yet.</td></tr>';
      return;
    }
    body.innerHTML = devices.map((device) => `
      <tr>
        <td>${escapeHTML(device.device_id)}<small>${escapeHTML(device.worker_name || "Unassigned")}</small></td>
        <td class="${statusClass(device.status)}">${escapeHTML(device.status)}</td>
      </tr>
    `).join("");
  };

  const ppeIndicatorMap = [
    { item: "Hardhat", countId: "ppeHardhatCount", indicatorId: "ppeHardhatIndicator" },
    { item: "Safety Vest", countId: "ppeVestCount", indicatorId: "ppeVestIndicator" },
    { item: "Gloves", countId: "ppeGlovesCount", indicatorId: "ppeGlovesIndicator" },
    { item: "Safety Boots", countId: "ppeBootsCount", indicatorId: "ppeBootsIndicator" },
  ];

  const renderPPECompliance = (items) => {
    const lookup = new Map((items || []).map((item) => [item.item, item]));
    ppeIndicatorMap.forEach((mapping) => {
      const item = lookup.get(mapping.item);
      const countElement = $(mapping.countId);
      const indicator = $(mapping.indicatorId);
      if (!item || Number(item.total) === 0) {
        if (countElement) countElement.textContent = "—";
        if (indicator) {
          indicator.className = "status-dot na";
          indicator.textContent = "?";
        }
        return;
      }

      if (countElement) countElement.textContent = `${item.compliant}/${item.total}`;
      if (indicator) {
        const compliant = Number(item.compliant || 0);
        const total = Number(item.total || 0);
        indicator.className = `status-dot ${compliant === total ? "ok" : (compliant === 0 ? "bad" : "warn")}`;
        indicator.textContent = compliant === total ? "✓" : (compliant === 0 ? "✕" : "!");
      }
    });
  };

  const renderDrowsinessStatus = (records) => {
    const body = $("drowsinessStatusBody");
    if (!body) return;
    if (!records || records.length === 0) {
      body.innerHTML = '<tr><td colspan="3">No monitoring records yet.</td></tr>';
      return;
    }
    body.innerHTML = records.map((record) => `
      <tr>
        <td>${escapeHTML(record.device_id)}</td>
        <td class="${statusClass(record.status)}">${escapeHTML(record.status)}</td>
        <td>${escapeHTML(formatTime(record.time))}</td>
      </tr>
    `).join("");
  };

  const renderZoneLocalization = (records) => {
    const body = $("zoneLocalizationBody");
    if (!body) return;
    if (!records || records.length === 0) {
      body.innerHTML = '<tr><td colspan="2">No localization records yet.</td></tr>';
      return;
    }
    body.innerHTML = records.map((record) => `
      <tr>
        <td>${escapeHTML(record.device_id)}<small>${escapeHTML(record.worker_name || "Unassigned")}</small></td>
        <td class="${statusClass(record.status)}">${escapeHTML(record.location_label || "Unmonitored")}</td>
      </tr>
    `).join("");
  };

  const renderNotifications = (notifications, count) => {
    setText("notificationBadge", count ?? 0);
    const list = $("notificationList");
    if (!list) return;
    if (!notifications || notifications.length === 0) {
      list.innerHTML = "<li>No active notifications.</li>";
      return;
    }
    list.innerHTML = notifications.map((item) => `
      <li>${escapeHTML(item.message || item.alert_type || "Alert")}
        <small>${escapeHTML(formatDate(item.created_at))} ${escapeHTML(formatTime(item.created_at))}</small>
      </li>
    `).join("");
  };

  const renderDashboard = (data) => {
    const summary = data.summary || {};
    setText("activeDevicesValue", summary.active_devices ?? 0);
    setText("ppeComplianceValue", summary.ppe_compliance_percent == null ? "—" : `${summary.ppe_compliance_percent}%`);
    setText("drowsinessAlertsValue", summary.drowsiness_alerts ?? 0);
    setText("ppeViolationsValue", summary.ppe_violations_today ?? 0);

    renderSiteOptions(data.sites || [], data.site || null);
    renderRecentAlerts(data.recent_alerts || []);
    renderDeviceConnectivity(data.device_connectivity || []);
    renderPPECompliance(data.ppe_compliance_status || []);
    renderDrowsinessStatus(data.drowsiness_status || []);
    renderZoneLocalization(data.zone_localization || []);
    renderNotifications(data.notifications || [], data.notification_count ?? 0);
  };

  async function loadDashboardOverview() {
    const url = new URL(`${API_BASE}/api/dashboard/overview`);
    if (currentSiteId) url.searchParams.set("site_id", currentSiteId);

    try {
      const response = await fetch(url.toString(), { headers: getAuthHeaders() });
      const data = await response.json();
      if (!response.ok || !data.success) {
        const error = new Error(data.message || "Could not load dashboard data.");
        error.status = response.status;
        throw error;
      }
      renderDashboard(data);
    } catch (error) {
      if (error.status === 401) {
        redirectToSiteAccess();
        return;
      }

      console.error("SMSYS dashboard API error:", error);
      setText("siteNameValue", error.status === 403 ? "Access denied" : "Backend unavailable");
      setText("activeDevicesValue", "—");
      setText("ppeComplianceValue", "—");
      setText("drowsinessAlertsValue", "—");
      setText("ppeViolationsValue", "—");
      const alerts = $("recentAlerts");
      if (alerts) {
        const message = error.status === 403
          ? "You do not have permission to access this site."
          : "Unable to load dashboard data. Check that Flask is running.";
        alerts.textContent = message;
      }
    }
  }

  loadDashboardOverview();
  // Refresh the overview as new monitoring records are saved to SQLite.
  window.setInterval(loadDashboardOverview, 5000);
}

/* ---------- 3. Authenticated site picker for tab pages ---------- */
if (app) {
  const siteNameElement = $("siteNameValue");
  const siteOptionsElement = $("siteOptions");
  let currentTabSiteId = pageUrl.searchParams.get("site_id") || sessionStorage.getItem("smsys_site_id") || "";

  async function loadOwnedSitesForTab() {
    const token = sessionStorage.getItem("smsys_access_token");
    if (!token) {
      redirectToSiteAccess();
      return;
    }

    const url = new URL(`${API_BASE}/api/sites/mine`);
    if (currentTabSiteId) url.searchParams.set("site_id", currentTabSiteId);

    try {
      const response = await fetch(url.toString(), { headers: getAuthHeaders() });
      const data = await response.json();
      if (response.status === 401) {
        redirectToSiteAccess();
        return;
      }
      if (!response.ok || !data.success) {
        if (siteNameElement) siteNameElement.textContent = response.status === 403 ? "Access denied" : "Unable to load sites";
        if (siteOptionsElement) siteOptionsElement.textContent = "";
        return;
      }

      const sites = data.sites || [];
      const selectedSite = data.site || sites[0] || null;
      if (selectedSite) {
        currentTabSiteId = String(selectedSite.id);
        sessionStorage.setItem("smsys_site_id", currentTabSiteId);
        if (siteNameElement) siteNameElement.textContent = selectedSite.site_name;
      } else if (siteNameElement) {
        siteNameElement.textContent = "No site created";
      }

      if (!siteOptionsElement) return;
      siteOptionsElement.replaceChildren();
      if (sites.length === 0) {
        const emptyItem = document.createElement("li");
        const emptyLink = document.createElement("a");
        emptyLink.href = "#";
        emptyLink.textContent = "No sites created yet.";
        emptyItem.appendChild(emptyLink);
        siteOptionsElement.appendChild(emptyItem);
        return;
      }

      sites.forEach((site) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = "#";
        link.dataset.siteId = String(site.id);
        link.textContent = site.site_name;
        if (selectedSite && Number(selectedSite.id) === Number(site.id)) link.classList.add("selected");
        link.addEventListener("click", (event) => {
          event.preventDefault();
          currentTabSiteId = String(site.id);
          sessionStorage.setItem("smsys_site_id", currentTabSiteId);
          if (siteNameElement) siteNameElement.textContent = site.site_name;
          siteOptionsElement.querySelectorAll("[data-site-id]").forEach((option) => {
            option.classList.toggle("selected", option.dataset.siteId === currentTabSiteId);
          });
          const nextUrl = new URL(window.location.href);
          nextUrl.searchParams.set("site_id", currentTabSiteId);
          window.history.replaceState({}, "", nextUrl);
          window.dispatchEvent(new CustomEvent("smsys:site-change", {
            detail: { siteId: currentTabSiteId }
          }));
          const dropdown = link.closest("details");
          if (dropdown) dropdown.open = false;
        });
        item.appendChild(link);
        siteOptionsElement.appendChild(item);
      });
    } catch (error) {
      console.error("Could not load supervisor sites:", error);
      if (siteNameElement) siteNameElement.textContent = "Backend unavailable";
    }
  }

  loadOwnedSitesForTab();
}

/* ---------- 4. Real PPE Status page ---------- */
if (app && document.body.dataset.active === "ppe") {
  const escapePPE = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));

  const setPPEText = (id, value) => {
    const element = $(id);
    if (element) element.textContent = value == null ? "—" : String(value);
  };

  const formatPPEDateTime = (value) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return `${parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ${parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  };

  const statusDot = (value) => {
    const status = String(value || "Unmonitored").toLowerCase();
    if (status === "compliant") return '<i class="status-dot yes" title="Compliant">✓</i>';
    if (status === "violation") return '<i class="status-dot no" title="Violation">✕</i>';
    return '<i class="status-dot na" title="Unmonitored">?</i>';
  };

  const statusPill = (value) => {
    const status = String(value || "Unmonitored");
    const className = status === "Compliant" ? "n" : status === "Violation" ? "d" : "u";
    return `<span class="pill ${className}">${escapePPE(status)}</span>`;
  };

  const renderPPETable = (records) => {
    const container = $("ppeTable");
    if (!container) return;

    const headings = ["Device ID", "Worker Name", "Hardhat", "Safety Vest", "Gloves", "Safety Boots", "Overall Status", "Last Updated"];
    const header = `<thead><tr>${headings.map((heading) => `<th>${heading}</th>`).join("")}</tr></thead>`;

    if (!records || records.length === 0) {
      const emptyMessage = sessionStorage.getItem("smsys_site_id")
        ? "No PPE monitoring records or devices are registered for this site."
        : "No site is available for this supervisor.";
      container.innerHTML = `<table class="table">${header}<tbody><tr><td colspan="8">${emptyMessage}</td></tr></tbody></table>`;
      return;
    }

    const rows = records.map((record) => `
      <tr>
        <td>${escapePPE(record.device_id || "—")}</td>
        <td>${escapePPE(record.worker_name || "Unassigned")}</td>
        <td>${statusDot(record.hardhat)}</td>
        <td>${statusDot(record.vest)}</td>
        <td>${statusDot(record.gloves)}</td>
        <td>${statusDot(record.boots)}</td>
        <td>${statusPill(record.overall_status)}</td>
        <td>${escapePPE(formatPPEDateTime(record.captured_at))}</td>
      </tr>
    `).join("");

    container.innerHTML = `<table class="table">${header}<tbody>${rows}</tbody></table>`;
  };

  const renderPPEBreakdown = (summary) => {
    const pie = $("pie");
    const legend = $("legend");
    if (!pie || !legend) return;

    const compliant = Number(summary.compliant_devices || 0);
    const violation = Number(summary.violation_devices || 0);
    const unmonitored = Number(summary.unmonitored_devices || 0);
    const total = compliant + violation + unmonitored;

    if (total === 0) {
      pie.style.background = "conic-gradient(#8a8d93 0 100%)";
    } else {
      const compliantEnd = (compliant / total) * 100;
      const violationEnd = ((compliant + violation) / total) * 100;
      pie.style.background = `conic-gradient(#2ecc40 0 ${compliantEnd}%, #e5484d ${compliantEnd}% ${violationEnd}%, #8a8d93 ${violationEnd}% 100%)`;
    }

    const entries = [
      { label: "Compliant", count: compliant, className: "yes", symbol: "✓" },
      { label: "Violation", count: violation, className: "no", symbol: "✕" },
      { label: "Unmonitored", count: unmonitored, className: "na", symbol: "?" },
    ];

    legend.innerHTML = entries.map((entry) => {
      const percentage = total ? ((entry.count / total) * 100).toFixed(1) : "0.0";
      return `<div class="lg"><i class="status-dot ${entry.className}">${entry.symbol}</i><span>${entry.label}</span><b>${entry.count} (${percentage}%)</b></div>`;
    }).join("");
  };

  const frameUrlCache = new Map();
  let latestPPERequestId = 0;
  let currentPpeSiteId = pageUrl.searchParams.get("site_id") || sessionStorage.getItem("smsys_site_id") || "";

  const renderPPEFrames = (frames, requestId) => {
    const container = $("frames");
    if (!container) return;

    const usableFrames = Array.isArray(frames) ? frames : [];
    const activeLocalFrameIds = new Set(
      usableFrames.filter((frame) => !frame.frame_url).map((frame) => String(frame.id))
    );

    for (const [frameId, objectUrl] of frameUrlCache.entries()) {
      if (!activeLocalFrameIds.has(frameId)) {
        URL.revokeObjectURL(objectUrl);
        frameUrlCache.delete(frameId);
      }
    }

    if (usableFrames.length === 0) {
      container.innerHTML = '<div class="frame"><div class="frame-img frame-placeholder">No detection frames available.</div><figcaption>Waiting for monitoring data</figcaption></div>';
      return;
    }

    container.innerHTML = usableFrames.map((frame) => `
      <figure class="frame" data-frame-id="${escapePPE(frame.id)}">
        <div class="frame-img frame-placeholder">Loading frame...</div>
        <figcaption title="${escapePPE(`${frame.device_id || "Device"} · ${frame.worker_name || "Unassigned"}`)}">${escapePPE(frame.device_id || "Device")} · ${escapePPE(frame.worker_name || "Unassigned")}</figcaption>
      </figure>
    `).join("");

    usableFrames.forEach(async (frame) => {
      const frameId = String(frame.id);
      let imageUrl = frame.frame_url || "";

      try {
        if (!imageUrl) {
          imageUrl = frameUrlCache.get(frameId) || "";
          if (!imageUrl) {
            const endpoint = new URL(`${API_BASE}/api/dashboard/ppe-frames/${encodeURIComponent(frameId)}`);
            const response = await fetch(endpoint.toString(), { headers: getAuthHeaders() });
            if (response.status === 401) {
              redirectToSiteAccess();
              return;
            }
            if (!response.ok) throw new Error(`Frame request failed (${response.status})`);
            imageUrl = URL.createObjectURL(await response.blob());
            frameUrlCache.set(frameId, imageUrl);
          }
        }

        if (requestId !== latestPPERequestId) return;
        const figure = Array.from(container.querySelectorAll("[data-frame-id]")).find(
          (element) => element.dataset.frameId === frameId
        );
        if (!figure) return;

        const image = document.createElement("img");
        image.className = "frame-img";
        image.alt = `PPE detection frame for ${frame.device_id || "device"}`;
        image.src = imageUrl;
        image.onerror = () => {
          if (requestId !== latestPPERequestId) return;
          const placeholder = document.createElement("div");
          placeholder.className = "frame-img frame-placeholder";
          placeholder.textContent = "Frame unavailable";
          image.replaceWith(placeholder);
        };

        const caption = document.createElement("figcaption");
        caption.textContent = `${frame.device_id || "Device"} · ${frame.worker_name || "Unassigned"} · ${formatPPEDateTime(frame.captured_at)}`;
        caption.title = caption.textContent;
        figure.replaceChildren(image, caption);
      } catch (error) {
        if (requestId !== latestPPERequestId) return;
        console.warn("Could not load PPE detection frame:", error);
        const figure = Array.from(container.querySelectorAll("[data-frame-id]")).find(
          (element) => element.dataset.frameId === frameId
        );
        if (figure) {
          const placeholder = document.createElement("div");
          placeholder.className = "frame-img frame-placeholder";
          placeholder.textContent = "Frame unavailable";
          figure.replaceChildren(placeholder, figure.querySelector("figcaption") || document.createElement("figcaption"));
        }
      }
    });
  };

  const formatPPEPercent = (value) => {
    if (value == null || Number.isNaN(Number(value))) return "—";
    return `${Number(value).toFixed(1).replace(/\.0$/, "")}%`;
  };

  const renderPPEStatus = (data, requestId) => {
    const summary = data.summary || {};
    setPPEText("pCompliant", formatPPEPercent(summary.compliant_percent));
    setPPEText("pViolation", formatPPEPercent(summary.violation_percent));
    setPPEText("pUnmon", formatPPEPercent(summary.unmonitored_percent));
    renderPPETable(data.records || []);
    renderPPEBreakdown(summary);
    renderPPEFrames(data.frames || [], requestId);
  };

  async function loadPPEStatus() {
    if (!sessionStorage.getItem("smsys_access_token")) {
      redirectToSiteAccess();
      return;
    }

    const requestId = ++latestPPERequestId;
    const selectedSiteId = currentPpeSiteId || sessionStorage.getItem("smsys_site_id") || "";
    const endpoint = new URL(`${API_BASE}/api/dashboard/ppe-status`);
    if (selectedSiteId) endpoint.searchParams.set("site_id", selectedSiteId);

    try {
      const response = await fetch(endpoint.toString(), { headers: getAuthHeaders() });
      const data = await response.json();

      if (response.status === 401) {
        redirectToSiteAccess();
        return;
      }
      if (!response.ok || !data.success) {
        const error = new Error(data.message || "Could not load PPE status.");
        error.status = response.status;
        throw error;
      }
      if (requestId !== latestPPERequestId) return;

      if (data.site && data.site.id != null) {
        currentPpeSiteId = String(data.site.id);
        sessionStorage.setItem("smsys_site_id", currentPpeSiteId);
      }
      renderPPEStatus(data, requestId);
    } catch (error) {
      if (requestId !== latestPPERequestId) return;
      console.error("SMSYS PPE status API error:", error);
      setPPEText("pCompliant", "—");
      setPPEText("pViolation", "—");
      setPPEText("pUnmon", "—");
      const table = $("ppeTable");
      if (table) {
        const message = error.status === 403
          ? "You do not have permission to access this site."
          : "Unable to load PPE status. Check that Flask is running.";
        table.textContent = message;
      }
      const frames = $("frames");
      if (frames) frames.innerHTML = '<div class="frame"><div class="frame-img frame-placeholder">PPE frames unavailable.</div><figcaption>Check the backend connection</figcaption></div>';
      const pie = $("pie");
      const legend = $("legend");
      if (pie) pie.style.background = "conic-gradient(#8a8d93 0 100%)";
      if (legend) legend.innerHTML = '<div class="lg"><i class="status-dot na">?</i><span>No data</span><b>—</b></div>';
    }
  }

  window.addEventListener("smsys:site-change", (event) => {
    currentPpeSiteId = String(event.detail?.siteId || "");
    loadPPEStatus();
  });

  loadPPEStatus();
  window.setInterval(loadPPEStatus, 5000);
}

/* ---------- 5. Sample data + renderers (other tab pages only) ---------- */
if (app && document.body.dataset.active !== "ppe") {
  const set = (id, v) => { const e = $(id); if (e) e.innerHTML = v; };
  const pill = (c, t) => `<span class="pill ${c}">${t}</span>`;
  const dot = (v) => `<i class="status-dot ${["no", "yes", "na"][v]}">${["✕", "✓", "?"][v]}</i>`; // 0 missing, 1 ok, 2 unknown
  const table = (head, rows) => `<table class="table"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

  const NAME = "Juan dela Cruz";
  const ids = ["H-001", "H-002", "H-003"], times = ["10:42 AM", "10:41 AM", "10:39 AM"], dur = ["-", "-", "850 ms"];
  const PPE = [[1, 1, 1, 1], [1, 0, 1, 1], [2, 2, 2, 2]];
  const drowsy = [["n", "Normal"], ["n", "Normal"], ["d", "Drowsy"]];
  const device = [["n", "Online"], ["n", "Online"], ["d", "Offline"]];
  const zone = [["n", "Localized", 1, "A"], ["n", "Localized", 2, "B"], ["d", "Unlocalized", "-", "-"]];

  const H_PPE = ["Device ID", "Worker Name", "Hardhat", "Safety Vest", "Gloves", "Safety Boots", "Last Seen"];
  const H_ST = ["Device ID", "Worker Name", "Status", "Time", "Duration (Millisecond)"];
  const H_ZONE = ["Device ID", "Worker Name", "Status", "Floor", "Zone", "Time", "Duration (Millisecond)"];
  const ppeRows = ids.map((id, i) => [id, NAME, ...PPE[i].map(dot), times[i]]);
  const drRows = ids.map((id, i) => [id, NAME, pill(...drowsy[i]), times[i], dur[i]]);
  const dvRows = ids.map((id, i) => [id, NAME, pill(...device[i]), times[i], dur[i]]);
  const znRows = ids.map((id, i) => [id, NAME, pill(zone[i][0], zone[i][1]), zone[i][2], zone[i][3], times[i], dur[i]]);

  // Summary cards
  [["pCompliant", "92%"], ["pViolation", "5%"], ["pUnmon", "3%"], ["dNormal", "66.67%"], ["dDrowsy", "33.33%"], ["dUnmon", "0%"],
   ["cConnected", "66.67%"], ["cDisconnected", "33.33%"], ["zLocalized", "66.67%"], ["zUnlocalized", "33.33%"]].forEach(([i, v]) => set(i, v));

  // Tables
  set("ppeTable", table(H_PPE, ppeRows));
  set("drTable", table(H_ST, drRows));
  set("devStatusTable", table(H_ST, dvRows));
  set("zoneStatusTable", table(H_ZONE, znRows));

  // PPE frames (swap the .frame-img div for an <img> when real frames exist)
  set("frames", ids.map((id) => `<figure class="frame"><div class="frame-img"></div><figcaption>${id}</figcaption></figure>`).join(""));

  // Pie charts
  const pie = (p, l) => {
    if (!$(p)) return;
    $(p).style.background = "conic-gradient(#2ecc40 0 92%, #e5484d 92% 97%, #8a8d93 97% 100%)";
    set(l, [["yes", "✓", "Compliant", "92%"], ["no", "✕", "Violation", "5%"], ["na", "?", "Unmonitored", "3%"]]
      .map(([c, s, t, v]) => `<div class="lg"><i class="status-dot ${c}">${s}</i><span>${t}</span><b>${v}</b></div>`).join(""));
  };
  pie("pie", "legend");
  pie("anPie", "anLegend");

  // Hourly trend charts (values 0-3 per hour, 8 AM - 4 PM)
  const HRS = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];
  const trend = (id, series) => set(id,
    `<div class="ylab">${[3, 2, 1, 0].map((n) => `<span>${n}</span>`).join("")}</div>
     <div class="cols">${HRS.map((h, i) => `<div class="col"><div class="bars">${series.map(([c, v]) => `<i class="bar ${c}" style="height:${(v[i] / 3) * 100}%"></i>`).join("")}</div><span>${h}</span></div>`).join("")}</div>`);
  const S_DR = [["n", [1, 2, 2, 1, 2, 3, 2, 2, 1]], ["d", [0, 0, 1, 0, 0, 1, 0, 1, 0]], ["u", [0, 0, 0, 0, 1, 0, 0, 0, 0]]];
  const S_DV = [["n", [3, 3, 2, 2, 3, 3, 2, 2, 3]], ["d", [0, 0, 1, 1, 0, 0, 1, 1, 0]]];
  const S_ZN = [["n", [3, 2, 2, 3, 3, 2, 2, 3, 3]], ["d", [0, 1, 1, 0, 0, 1, 1, 0, 0]]];
  trend("trend", S_DR); trend("devTrend", S_DV); trend("zoneTrend", S_ZN);
  trend("anDrowsy", S_DR); trend("anDevices", S_DV); trend("anZones", S_ZN);

  // Alerts history: 2 rows + "View All History" toggle
  const hist = (tid, bid, head, rows) => {
    if (!$(tid)) return;
    const draw = (all) => {
      set(tid, table(head, all ? rows : rows.slice(0, 2)));
      set(bid, `<button type="button" class="hbtn">${all ? "Show Less ▲" : "View All History ▼"}</button>`);
      $(bid).firstChild.onclick = () => draw(!all);
    };
    draw(false);
  };
  hist("histPPE", "btnPPE", H_PPE, ppeRows);
  hist("histDrowsy", "btnDrowsy", H_ST, drRows);
  hist("histDev", "btnDev", H_ST, dvRows);

  // Date pickers
  const picker = (btn, txt, inp) => {
    if (!$(btn)) return;
    const input = $(inp), show = (v) => { $(txt).textContent = new Date(v + "T00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); };
    input.value = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    show(input.value);
    $(btn).onclick = () => (input.showPicker ? input.showPicker() : input.focus());
    input.onchange = () => input.value && show(input.value);
  };
  picker("dateBtn", "dateText", "dateInput");
  picker("anDateBtn", "anDateText", "anDateInput");
}