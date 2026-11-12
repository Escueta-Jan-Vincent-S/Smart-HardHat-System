
import {
  $,
  API_BASE,
  currentPage,
} from "../shared/config.js";

import {
  getAuthHeaders,
  redirectToSiteAccess,
} from "../shared/auth.js";

import {
  escapeHTML,
} from "../shared/helpers.js";

import {
  getCurrentSiteId,
  setCurrentSiteId,
} from "../shared/site.js";

// ============================================================
// PAGE CHECK
// ============================================================

if (currentPage === "analytics") {
  initializeAnalytics();
}

// ============================================================
// ELEMENTS
// ============================================================

const dateButton = $("#anDateBtn");
const dateText = $("#anDateText");
const dateInput = $("#anDateInput");

const pieElement = $("#anPie");
const legendElement = $("#anLegend");

const drowsyElement = $("#anDrowsy");
const devicesElement = $("#anDevices");
const zonesElement = $("#anZones");

// ============================================================
// STATE
// ============================================================

let selectedDate = getLocalDate();
let refreshInterval = null;
let requestController = null;

// ============================================================
// INITIALIZATION
// ============================================================

function initializeAnalytics() {
  if (
    !dateButton ||
    !dateText ||
    !dateInput ||
    !pieElement ||
    !legendElement ||
    !drowsyElement ||
    !devicesElement ||
    !zonesElement
  ) {
    console.error("Analytics: Required HTML elements were not found.");
    return;
  }

  dateInput.value = selectedDate;

  updateDateLabel();

  dateButton.addEventListener("click", openDatePicker);

  dateInput.addEventListener("change", handleDateChange);

  window.addEventListener("smsys:site-change", handleSiteChange);

  loadAnalytics();

  refreshInterval = window.setInterval(() => {
    loadAnalytics();
  }, 5000);

  window.addEventListener("beforeunload", cleanupAnalytics);
}

// ============================================================
// DATE HELPERS
// ============================================================

function getLocalDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "";

  const [year, month, day] = value.split("-");

  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function updateDateLabel() {
  dateText.textContent = formatDate(selectedDate);
}

function openDatePicker() {
  if (typeof dateInput.showPicker === "function") {
    dateInput.showPicker();
  } else {
    dateInput.click();
  }
}

function handleDateChange() {
  if (!dateInput.value) return;

  selectedDate = dateInput.value;

  updateDateLabel();

  loadAnalytics();
}

// ============================================================
// SITE CHANGE
// ============================================================

function handleSiteChange(event) {
  const siteId = event.detail?.siteId;

  if (siteId) {
    setCurrentSiteId(siteId);
  }

  loadAnalytics();
}

// ============================================================
// LOAD ANALYTICS
// ============================================================

async function loadAnalytics() {
  if (requestController) {
    requestController.abort();
  }

  requestController = new AbortController();

  try {
    const siteId = getCurrentSiteId();

    const params = new URLSearchParams({
      date: selectedDate,
    });

    if (siteId) {
      params.set("site_id", siteId);
    }

    const response = await fetch(
      `${API_BASE}/api/dashboard/analytics?${params.toString()}`,
      {
        method: "GET",
        headers: getAuthHeaders(),
        signal: requestController.signal,
      }
    );

    if (response.status === 401) {
      redirectToSiteAccess();
      return;
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Failed to load analytics."
      );
    }

    if (data.site?.id) {
      setCurrentSiteId(data.site.id);
    }

    renderPPEBreakdown(data.ppe_breakdown);
    renderDrowsinessTrend(data.drowsiness_trend);
    renderDeviceTrend(data.device_trend);
    renderLocalizationTrend(data.localization_trend);

  } catch (error) {
    if (error.name === "AbortError") return;

    console.error("Analytics loading error:", error);

    showChartMessage(
      "Unable to load analytics data."
    );
  }
}

// ============================================================
// CHART MESSAGE
// ============================================================

function showChartMessage(message) {
  const safeMessage = escapeHTML(message);

  pieElement.style.background = "#e5e7eb";
  pieElement.innerHTML = "";

  legendElement.innerHTML = `
    <div class="analytics-empty">
      ${safeMessage}
    </div>
  `;

  drowsyElement.innerHTML = `
    <div class="analytics-empty">${safeMessage}</div>
  `;

  devicesElement.innerHTML = `
    <div class="analytics-empty">${safeMessage}</div>
  `;

  zonesElement.innerHTML = `
    <div class="analytics-empty">${safeMessage}</div>
  `;
}

// ============================================================
// EMPTY CHART MESSAGE
// ============================================================

function emptyMessage() {
  return `
    <div style="
      width:100%;
      padding:30px 12px;
      text-align:center;
      color:#888;
      font-size:13px;
    ">
      No monitoring data available for this date.
    </div>
  `;
}

// ============================================================
// PPE STATUS BREAKDOWN
// ============================================================

function renderPPEBreakdown(data) {
  const compliant = Number(data?.compliant || 0);
  const violation = Number(data?.violation || 0);
  const unmonitored = Number(data?.unmonitored || 0);

  const total = Number(data?.total || 0);

  if (total === 0) {
    pieElement.style.background = "#e5e7eb";
    pieElement.innerHTML = "";

    legendElement.innerHTML = emptyMessage();
    return;
  }

  const compliantPercent = (compliant / total) * 100;
  const violationPercent = (violation / total) * 100;

  const unmonitoredPercent = (unmonitored / total) * 100;

  const compliantEnd = compliantPercent;
  const violationEnd = compliantEnd + violationPercent;

  pieElement.style.background = `
    conic-gradient(
      #28a745 0% ${compliantEnd}%,
      #e74c3c ${compliantEnd}% ${violationEnd}%,
      #9ca3af ${violationEnd}% 100%
    )
  `;

  pieElement.innerHTML = `
    <div style="
      width:58%;
      height:58%;
      border-radius:50%;
      background:#fff;
      display:flex;
      flex-direction:column;
      justify-content:center;
      align-items:center;
    ">
      <strong style="font-size:22px;color:#333;">
        ${total}
      </strong>
      <span style="font-size:10px;color:#777;">
        Devices
      </span>
    </div>
  `;

  legendElement.innerHTML = `
    ${createLegendItem(
      "#28a745",
      "Compliant",
      compliant,
      compliantPercent
    )}

    ${createLegendItem(
      "#e74c3c",
      "Violation",
      violation,
      violationPercent
    )}

    ${createLegendItem(
      "#9ca3af",
      "Unmonitored",
      unmonitored,
      unmonitoredPercent
    )}
  `;
}

function createLegendItem(color, label, value, percent) {
  return `
    <div style="
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      margin:10px 0;
      font-size:13px;
    ">
      <div style="
        display:flex;
        align-items:center;
        gap:8px;
      ">
        <span style="
          width:11px;
          height:11px;
          border-radius:3px;
          background:${color};
          display:inline-block;
        "></span>

        <span>${escapeHTML(label)}</span>
      </div>

      <strong>
        ${value}
        <span style="color:#888;font-weight:400;">
          (${percent.toFixed(1)}%)
        </span>
      </strong>
    </div>
  `;
}

// ============================================================
// HOURLY TREND CHART
// ============================================================

function renderStackedTrend(element, records, series) {
  if (!Array.isArray(records) || records.length === 0) {
    element.innerHTML = emptyMessage();
    return;
  }

  const validRecords = records.filter(record => {
    return series.some(item => record[item.key] !== null);
  });

  if (validRecords.length === 0) {
    element.innerHTML = emptyMessage();
    return;
  }

  const maximum = Math.max(
    1,
    ...validRecords.map(record => {
      return series.reduce((sum, item) => {
        return sum + Number(record[item.key] || 0);
      }, 0);
    })
  );

  element.innerHTML = `
    <div style="
      display:flex;
      align-items:flex-end;
      justify-content:space-around;
      gap:10px;
      min-width:100%;
      height:245px;
      padding:15px 10px 5px;
      box-sizing:border-box;
    ">
      ${validRecords.map(record => {
        const isEmpty = series.some(
          item => record[item.key] === null
        );

        const total = series.reduce((sum, item) => {
          return sum + Number(record[item.key] || 0);
        }, 0);

        return `
          <div style="
            flex:1;
            min-width:35px;
            height:100%;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:flex-end;
            gap:7px;
          ">
            <span style="
              font-size:10px;
              color:#777;
              min-height:14px;
            ">
              ${isEmpty ? "—" : total}
            </span>

            <div style="
              width:100%;
              height:170px;
              display:flex;
              flex-direction:column;
              justify-content:flex-end;
              border-radius:4px;
              overflow:hidden;
              background:#f1f1f1;
            ">
              ${isEmpty ? "" : series.map(item => {
                const value = Number(record[item.key] || 0);

                if (!value || total === 0) return "";

                return `
                  <div
                    title="${escapeHTML(item.label)}: ${value}"
                    style="
                      height:${(value / maximum) * 170}px;
                      min-height:2px;
                      width:100%;
                      background:${item.color};
                    "
                  ></div>
                `;
              }).reverse().join("")}
            </div>

            <span style="
              font-size:10px;
              color:#777;
              white-space:nowrap;
            ">
              ${formatHour(record.hour)}
            </span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

// ============================================================
// DROWSINESS TREND
// ============================================================

function renderDrowsinessTrend(records) {
  renderStackedTrend(
    drowsyElement,
    records,
    [
      {
        key: "normal",
        label: "Normal",
        color: "#28a745",
      },
      {
        key: "drowsy",
        label: "Drowsy",
        color: "#e74c3c",
      },
      {
        key: "unmonitored",
        label: "Unmonitored",
        color: "#9ca3af",
      },
    ]
  );
}

// ============================================================
// DEVICE CONNECTIVITY TREND
// ============================================================

function renderDeviceTrend(records) {
  renderStackedTrend(
    devicesElement,
    records,
    [
      {
        key: "online",
        label: "Online",
        color: "#28a745",
      },
      {
        key: "offline",
        label: "Offline",
        color: "#e74c3c",
      },
    ]
  );
}

// ============================================================
// LOCALIZATION TREND
// ============================================================

function renderLocalizationTrend(records) {
  renderStackedTrend(
    zonesElement,
    records,
    [
      {
        key: "localized",
        label: "Localized",
        color: "#28a745",
      },
      {
        key: "unlocalized",
        label: "Unlocalized",
        color: "#e74c3c",
      },
    ]
  );
}

// ============================================================
// FORMAT HOUR
// ============================================================

function formatHour(hour) {
  const value = Number(hour);

  if (!Number.isFinite(value)) return "";

  const suffix = value >= 12 ? "PM" : "AM";
  const displayHour = value % 12 || 12;

  return `${displayHour} ${suffix}`;
}

// ============================================================
// CLEANUP
// ============================================================

function cleanupAnalytics() {
  if (refreshInterval !== null) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }

  if (requestController) {
    requestController.abort();
    requestController = null;
  }

  window.removeEventListener(
    "smsys:site-change",
    handleSiteChange
  );
}
