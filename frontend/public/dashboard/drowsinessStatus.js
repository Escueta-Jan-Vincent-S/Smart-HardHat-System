
(function () {
  "use strict";

  if (document.body.dataset.active !== "drowsy") return;

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

  // Escape values before inserting them into HTML.
  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[character]));

  function setText(id, value) {
    const element = $(id);

    if (element) {
      element.textContent = value;
    }
  }

  function formatPercent(value) {
    if (value == null || Number.isNaN(Number(value))) {
      return "—";
    }

    return `${Number(value).toFixed(1).replace(/\.0$/, "")}%`;
  }

  function formatDateTime(value) {
    if (!value) return "—";

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }

    return parsed.toLocaleString("en-PH", {
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

  function emptyTrend() {
    return Array.from({ length: 9 }, (_, index) => {
      const hour = index + 8;

      const label = new Date(
        2000,
        0,
        1,
        hour
      ).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });

      return {
        hour: label,
        normal: 0,
        drowsy: 0,
        unmonitored: 0,
      };
    });
  }

  // Summary Cards
  function renderSummary(summary = {}) {
    setText("dNormal", formatPercent(summary.normal_percent));
    setText("dDrowsy", formatPercent(summary.drowsy_percent));
    setText("dUnmon", formatPercent(summary.unmonitored_percent));
  }

  // Drowsiness Status Table
  function renderTable(records, site, emptyMessage = "") {
    const container = $("drTable");

    if (!container) return;

    const headings = [
      "Device ID",
      "Worker Name",
      "Status",
      "Time",
      "Duration (Millisecond)",
    ];

    const header = `
      <thead>
        <tr>
          ${headings.map((heading) => `<th>${heading}</th>`).join("")}
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
      const status = String(record.status || "Unmonitored");

      const statusClass =
        status === "Normal"
          ? "n"
          : status === "Drowsy"
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
            ${escapeHTML(formatDateTime(record.captured_at))}
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

  // Drowsiness Trend Chart
  function renderTrend(trend) {
    const container = $("trend");

    if (!container) return;

    const points = Array.isArray(trend) ? trend : [];

    if (points.length === 0) {
      container.textContent = "No trend data available.";
      return;
    }

    const values = points.flatMap((point) => [
      Number(point.normal) || 0,
      Number(point.drowsy) || 0,
      Number(point.unmonitored) || 0,
    ]);

    const highestValue = Math.max(0, ...values);

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
        ${yLabels.map((value) => `<span>${value}</span>`).join("")}
      </div>
    `;

    const columns = points.map((point) => {
      const bars = [
        ["n", "Normal", Number(point.normal) || 0],
        ["d", "Drowsy", Number(point.drowsy) || 0],
        ["u", "Unmonitored", Number(point.unmonitored) || 0],
      ].map(([className, label, value]) => {
        const height = Math.max(
          0,
          Math.min(100, (value / axisMaximum) * 100)
        );

        return `
          <i
            class="bar ${className}"
            style="height:${height}%"
            title="${escapeHTML(`${label}: ${value}`)}"
          ></i>
        `;
      }).join("");

      return `
        <div class="col">
          <div class="bars">${bars}</div>
          <span>${escapeHTML(point.hour || "—")}</span>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      ${yAxis}
      <div class="cols">${columns}</div>
    `;
  }

  // Clear the shared layout's sample values.
  function clearPage(message = "Loading drowsiness data...") {
    renderSummary({});
    renderTable([], null, message);
    renderTrend(emptyTrend());
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

  // Fetch Drowsiness Status from Flask.
  async function loadDrowsinessStatus() {
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
      `${API_BASE}/api/dashboard/drowsiness-status`
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
          data.message || "Could not load drowsiness status."
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
      renderTrend(data.trend || emptyTrend());

    } catch (error) {
      if (requestId !== latestRequestId) return;

      console.error(
        "SMSYS drowsiness status API error:",
        error
      );

      renderSummary({});

      renderTable(
        [],
        null,
        error.status === 403
          ? "You do not have permission to access this site."
          : "Unable to load drowsiness status. Check that Flask is running."
      );

      renderTrend(emptyTrend());
    }
  }

  // Remove the shared layout's sample data before showing real data.
  clearPage();

  // Reload when the supervisor changes the selected site.
  window.addEventListener("smsys:site-change", (event) => {
    currentSiteId = String(
      event.detail?.siteId ||
      sessionStorage.getItem("smsys_site_id") ||
      ""
    );

    clearPage();
    loadDrowsinessStatus();
  });

  // Initial load and automatic refresh.
  loadDrowsinessStatus();

  window.setInterval(loadDrowsinessStatus, 5000);

})();
