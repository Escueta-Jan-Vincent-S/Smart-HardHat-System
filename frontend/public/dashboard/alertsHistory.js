// ============================================================
// SMSYS - ALERTS HISTORY
// Database-connected frontend
// ============================================================

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const API_HOST =
    window.location.hostname === "localhost"
      ? "127.0.0.1"
      : window.location.hostname;

  const API_BASE =
    `${window.location.protocol}//${API_HOST}:5000`;

  const dateInput = $("dateInput");
  const dateText = $("dateText");
  const dateButton = $("dateBtn");

  const expanded = {
    ppe: false,
    drowsiness: false,
    device: false
  };

  let alertData = {
    ppe: [],
    drowsiness: [],
    device: []
  };

  // ----------------------------------------------------------
  // HTML escaping
  // ----------------------------------------------------------

  function escapeHTML(value) {
    return String(value ?? "—").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  // ----------------------------------------------------------
  // Date formatting
  // ----------------------------------------------------------

  function formatDate(value) {
    if (!value) return "—";

    const parsed = new Date(
      String(value).replace(" ", "T")
    );

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function updateDateText(value) {
    if (!value || !dateText) return;

    const [year, month, day] = value.split("-").map(Number);

    dateText.textContent = new Date(
      year,
      month - 1,
      day
    ).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }

  // ----------------------------------------------------------
  // Table headers
  // ----------------------------------------------------------

  const PPE_HEADERS = [
    "Device ID",
    "Worker Name",
    "Hardhat",
    "Safety Vest",
    "Gloves",
    "Safety Boots",
    "Last Seen"
  ];

  const STATUS_HEADERS = [
    "Device ID",
    "Worker Name",
    "Status",
    "Time",
    "Duration (Millisecond)"
  ];

  // ----------------------------------------------------------
  // Create table
  // ----------------------------------------------------------

  function createTable(headers, rows) {
    if (!rows.length) {
      return `
        <div class="history-empty">
          No alerts recorded for this date.
        </div>
      `;
    }

    return `
      <table class="table">
        <thead>
          <tr>
            ${headers.map(header =>
              `<th>${escapeHTML(header)}</th>`
            ).join("")}
          </tr>
        </thead>

        <tbody>
          ${rows.map(row => `
            <tr>
              ${row.map(value =>
                `<td>${escapeHTML(value)}</td>`
              ).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  // ----------------------------------------------------------
  // Convert PPE alerts to the existing table format
  // ----------------------------------------------------------

  function preparePPERecords(records) {
    return records.map(alert => {
      const type = String(
        alert.alert_type || ""
      ).toLowerCase();

      const message = String(
        alert.message || ""
      );

      const normalized = type.replace(/[- ]/g, "_");

      const ppeValues = {
        hardhat: "—",
        vest: "—",
        gloves: "—",
        boots: "—"
      };

      if (normalized.includes("hardhat") ||
          normalized.includes("hard_hat")) {
        ppeValues.hardhat = message;
      } else if (normalized.includes("vest")) {
        ppeValues.vest = message;
      } else if (normalized.includes("glove")) {
        ppeValues.gloves = message;
      } else if (normalized.includes("boot")) {
        ppeValues.boots = message;
      } else {
        ppeValues.hardhat = message;
      }

      return [
        alert.device_id,
        alert.worker_name,
        ppeValues.hardhat,
        ppeValues.vest,
        ppeValues.gloves,
        ppeValues.boots,
        formatDate(alert.created_at)
      ];
    });
  }

  // ----------------------------------------------------------
  // Convert drowsiness/device alerts
  // ----------------------------------------------------------

  function prepareStatusRecords(records) {
    return records.map(alert => [
      alert.device_id,
      alert.worker_name,
      alert.message || alert.alert_type,
      formatDate(alert.created_at),
      "—"
    ]);
  }

  // ----------------------------------------------------------
  // Render each history section
  // ----------------------------------------------------------

  function renderSection(key, tableId, buttonId, headers, rows) {
    const tableElement = $(tableId);
    const buttonElement = $(buttonId);

    if (!tableElement || !buttonElement) return;

    const visibleRows = expanded[key]
      ? rows
      : rows.slice(0, 2);

    tableElement.innerHTML = createTable(
      headers,
      visibleRows
    );

    if (rows.length > 2) {
      buttonElement.innerHTML = `
        <button type="button" class="hbtn">
          ${expanded[key]
            ? "Show Less ▲"
            : "View All History ▼"}
        </button>
      `;

      buttonElement.querySelector("button").onclick = () => {
        expanded[key] = !expanded[key];
        renderAll();
      };
    } else {
      buttonElement.innerHTML = "";
    }
  }

  // ----------------------------------------------------------
  // Render all sections
  // ----------------------------------------------------------

  function renderAll() {
    renderSection(
      "ppe",
      "histPPE",
      "btnPPE",
      PPE_HEADERS,
      preparePPERecords(alertData.ppe)
    );

    renderSection(
      "drowsiness",
      "histDrowsy",
      "btnDrowsy",
      STATUS_HEADERS,
      prepareStatusRecords(alertData.drowsiness)
    );

    renderSection(
      "device",
      "histDev",
      "btnDev",
      STATUS_HEADERS,
      prepareStatusRecords(alertData.device)
    );
  }

  // ----------------------------------------------------------
  // Loading and error messages
  // ----------------------------------------------------------

  function showMessage(message) {
    ["histPPE", "histDrowsy", "histDev"].forEach(id => {
      const element = $(id);

      if (element) {
        element.innerHTML = `
          <div class="history-empty">
            ${escapeHTML(message)}
          </div>
        `;
      }
    });

    ["btnPPE", "btnDrowsy", "btnDev"].forEach(id => {
      if ($(id)) $(id).innerHTML = "";
    });
  }

  // ----------------------------------------------------------
  // Load alerts from Flask backend
  // ----------------------------------------------------------

  async function loadAlertsHistory() {
    const token = sessionStorage.getItem(
      "smsys_access_token"
    );

    if (!token) {
      showMessage(
        "Supervisor session missing. Please log in again."
      );
      return;
    }

    const params = new URLSearchParams();

    const siteId =
      sessionStorage.getItem("smsys_site_id") ||
      new URLSearchParams(window.location.search).get("site_id");

    if (siteId) {
      params.set("site_id", siteId);
    }

    if (dateInput && dateInput.value) {
      params.set("date", dateInput.value);
    }

    showMessage("Loading alerts history...");

    try {
      const response = await fetch(
        `${API_BASE}/api/dashboard/alerts-history?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        showMessage(
          result.message || "Failed to load alerts history."
        );
        return;
      }

      alertData = result.alerts || {
        ppe: [],
        drowsiness: [],
        device: []
      };

      Object.keys(expanded).forEach(key => {
        expanded[key] = false;
      });

      renderAll();

    } catch (error) {
      console.error(
        "Alerts History API Error:",
        error
      );

      showMessage(
        "Unable to connect to the SMSYS backend."
      );
    }
  }

  // ----------------------------------------------------------
  // Initialize date picker
  // ----------------------------------------------------------

  if (dateInput) {
    const now = new Date();

    const today = new Date(
      now.getTime() -
      now.getTimezoneOffset() * 60000
    ).toISOString().slice(0, 10);

    dateInput.value = today;

    updateDateText(today);

    dateInput.addEventListener("change", () => {
      if (!dateInput.value) return;

      updateDateText(dateInput.value);

      loadAlertsHistory();
    });
  }

  if (dateButton && dateInput) {
    dateButton.addEventListener("click", () => {
      if (typeof dateInput.showPicker === "function") {
        dateInput.showPicker();
      } else {
        dateInput.focus();
      }
    });
  }

  // ----------------------------------------------------------
  // Initial load
  // ----------------------------------------------------------

  loadAlertsHistory();

})();