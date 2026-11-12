
(function () {
  "use strict";

  if (document.body.dataset.active !== "devices") return;

  const $ = (id) => document.getElementById(id);

  const API_HOST =
    window.location.hostname === "localhost"
      ? "127.0.0.1"
      : window.location.hostname || "127.0.0.1";

  const API_BASE = `${window.location.protocol}//${API_HOST}:5000`;

  const pageUrl = new URL(window.location.href);

  let currentSiteId =
    pageUrl.searchParams.get("site_id") ||
    sessionStorage.getItem("smsys_site_id") ||
    "";

  let latestRequestId = 0;
  let refreshTimer = null;

  // Escape text before inserting it into HTML.
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[character]));
  }

  function setText(id, value) {
    const element = $(id);

    if (element) {
      element.textContent = value;
    }
  }

  function formatDateTime(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatDuration(value) {
    if (
      value == null ||
      value === "" ||
      Number.isNaN(Number(value))
    ) {
      return "—";
    }

    return `${Number(value).toLocaleString("en-US")} ms`;
  }

  // Update Connected and Disconnected summary cards.
  function renderSummary(summary = {}) {
    setText(
      "cConnected",
      String(summary.online_devices ?? 0)
    );

    setText(
      "cDisconnected",
      String(summary.offline_devices ?? 0)
    );
  }

  // Render the device connectivity table.
  function renderTable(records, site, emptyMessage = "") {
    const container = $("devStatusTable");

    if (!container) return;

    const headings = [
      "Device ID",
      "Worker Name",
      "Status",
      "Last Seen",
      "Monitoring Duration",
    ];

    const header = `
      <thead>
        <tr>
          ${headings.map((heading) => (
            `<th>${heading}</th>`
          )).join("")}
        </tr>
      </thead>
    `;

    if (!Array.isArray(records) || records.length === 0) {
      const message =
        emptyMessage ||
        (
          site
            ? "No smart hardhats are registered for this site."
            : "No site is available for this supervisor."
        );

      container.innerHTML = `
        <table class="table">
          ${header}
          <tbody>
            <tr>
              <td colspan="5">${escapeHTML(message)}</td>
            </tr>
          </tbody>
        </table>
      `;

      return;
    }

    const rows = records.map((record) => {
      const status = String(
        record.status || "Unmonitored"
      );

      const statusClass =
        status === "Online"
          ? "n"
          : status === "Offline"
            ? "d"
            : "u";

      return `
        <tr>
          <td>${escapeHTML(record.device_id || "—")}</td>

          <td>
            ${escapeHTML(record.worker_name || "Unassigned")}
          </td>

          <td>
            <span class="pill ${statusClass}">
              ${escapeHTML(status)}
            </span>
          </td>

          <td>
            ${escapeHTML(formatDateTime(record.last_seen))}
          </td>

          <td>
            ${escapeHTML(formatDuration(record.duration_ms))}
          </td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <table class="table">
        ${header}
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  // Render the hourly connectivity chart.
  function renderTrend(trend) {
    const container = $("devTrend");

    if (!container) return;

    const points = Array.isArray(trend) ? trend : [];

    if (points.length === 0) {
      container.textContent = "No connectivity trend data available.";
      return;
    }

    const validValues = points.flatMap((point) => [
      point.online,
      point.offline,
    ]).filter((value) => (
      value !== null &&
      value !== undefined &&
      Number.isFinite(Number(value))
    )).map(Number);

    const highestValue = Math.max(0, ...validValues);

    const axisMaximum = Math.max(
      3,
      Math.ceil(highestValue / 3) * 3
    );

    const yLabels = [
      axisMaximum,
      Math.round((axisMaximum * 2) / 3),
      Math.round(axisMaximum / 3),
      0,
    ];

    const yAxis = `
      <div class="ylab">
        ${yLabels.map((value) => (
          `<span>${value}</span>`
        )).join("")}
      </div>
    `;

    const columns = points.map((point) => {
      const online =
        point.online == null ? null : Number(point.online);

      const offline =
        point.offline == null ? null : Number(point.offline);

      const onlineHeight =
        online == null
          ? 0
          : Math.max(0, Math.min(100, (online / axisMaximum) * 100));

      const offlineHeight =
        offline == null
          ? 0
          : Math.max(0, Math.min(100, (offline / axisMaximum) * 100));

      const noData = online == null || offline == null;

      return `
        <div class="col">
          <div
            class="bars"
            title="${escapeHTML(
              noData
                ? `${point.hour}: No data yet`
                : `${point.hour} — Online: ${online}, Offline: ${offline}`
            )}"
          >
            <i
              class="bar n"
              style="height:${onlineHeight}%"
            ></i>

            <i
              class="bar d"
              style="height:${offlineHeight}%"
            ></i>
          </div>

          <span>${escapeHTML(point.hour || "—")}</span>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      ${yAxis}
      <div class="cols">${columns}</div>
    `;
  }

  function clearPage(message = "Loading device connectivity...") {
    renderSummary({
      online_devices: 0,
      offline_devices: 0,
    });

    renderTable([], null, message);
    renderTrend([]);
  }

  function redirectToSiteAccess() {
    sessionStorage.removeItem("smsys_access_token");
    sessionStorage.removeItem("smsys_supervisor_name");
    sessionStorage.removeItem("smsys_site_id");
    sessionStorage.removeItem("smsys_dashboard_background");

    if (window.top && window.top !== window.self) {
      window.top.location.href = "/site-access";
    } else {
      window.location.href = "/site-access";
    }
  }

  function getAuthHeaders() {
    const token = sessionStorage.getItem("smsys_access_token");

    return {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  // Fetch data from Flask.
  async function loadDeviceConnectivity() {
    const token = sessionStorage.getItem("smsys_access_token");

    if (!token) {
      redirectToSiteAccess();
      return;
    }

    const requestId = ++latestRequestId;

    const selectedSiteId =
      currentSiteId ||
      sessionStorage.getItem("smsys_site_id") ||
      "";

    const endpoint = new URL(
      `${API_BASE}/api/dashboard/device-connectivity`
    );

    if (selectedSiteId) {
      endpoint.searchParams.set("site_id", selectedSiteId);
    }

    try {
      const response = await fetch(endpoint.toString(), {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      const data = await response.json();

      if (response.status === 401) {
        redirectToSiteAccess();
        return;
      }

      if (!response.ok || !data.success) {
        const error = new Error(
          data.message || "Could not load device connectivity."
        );

        error.status = response.status;
        throw error;
      }

      // Ignore outdated responses after a site change.
      if (requestId !== latestRequestId) return;

      if (data.site && data.site.id != null) {
        currentSiteId = String(data.site.id);

        sessionStorage.setItem(
          "smsys_site_id",
          currentSiteId
        );
      }

      renderSummary(data.summary || {});
      renderTable(data.records || [], data.site || null);
      renderTrend(data.trend || []);

    } catch (error) {
      if (requestId !== latestRequestId) return;

      console.error(
        "SMSYS device connectivity API error:",
        error
      );

      renderSummary({
        online_devices: 0,
        offline_devices: 0,
      });

      renderTable(
        [],
        null,
        error.status === 403
          ? "You do not have permission to access this site."
          : "Unable to load device connectivity. Check that Flask is running."
      );

      renderTrend([]);
    }
  }

  // Initial load.
  clearPage();
  loadDeviceConnectivity();

  // Reload after changing the selected site in the shared sidebar.
  window.addEventListener("smsys:site-change", (event) => {
    currentSiteId = String(
      event.detail?.siteId ||
      sessionStorage.getItem("smsys_site_id") ||
      ""
    );

    clearPage();
    loadDeviceConnectivity();
  });

  // Automatically refresh every five seconds.
  refreshTimer = window.setInterval(
    loadDeviceConnectivity,
    5000
  );

  window.addEventListener("beforeunload", () => {
    if (refreshTimer) {
      window.clearInterval(refreshTimer);
    }
  });

})();
