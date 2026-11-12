// ========================================
// SMSYS DASHBOARD - ALERTS HISTORY
// ========================================

import { $, API_BASE } from "../shared/config.js";
import { getAuthHeaders } from "../shared/auth.js";
import { escapeHTML, formatDateTime } from "../shared/helpers.js";
import { getCurrentSiteId } from "../shared/site.js";

// ========================================
// ELEMENTS
// ========================================

const dateInput = $("dateInput");
const dateText = $("dateText");
const dateButton = $("dateBtn");

// ========================================
// STATE
// ========================================

const sections = [
    { key: "ppe", table: "histPPE", button: "btnPPE" },
    { key: "drowsiness", table: "histDrowsy", button: "btnDrowsy" },
    { key: "device", table: "histDev", button: "btnDev" }
];

let latestData = {
    ppe: [],
    drowsiness: [],
    device: []
};

const expandedState = {
    ppe: false,
    drowsiness: false,
    device: false
};

// ========================================
// DATE HELPERS
// ========================================

function displayDate(value) {
    if (!dateText || !value) return;

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

function initializeDatePicker() {
    if (!dateInput) return;

    const today = new Date();

    const localToday = new Date(
        today.getTime() - today.getTimezoneOffset() * 60000
    )
        .toISOString()
        .slice(0, 10);

    dateInput.value = localToday;

    displayDate(localToday);

    dateInput.addEventListener("change", () => {
        if (!dateInput.value) return;

        displayDate(dateInput.value);
        loadHistory();
    });

    if (dateButton) {
        dateButton.addEventListener("click", () => {
            if (typeof dateInput.showPicker === "function") {
                dateInput.showPicker();
            } else {
                dateInput.focus();
            }
        });
    }
}

// ========================================
// TABLE RENDERING
// ========================================

function renderTable(items, expanded) {
    if (!items.length) {
        return `
            <p class="history-empty">
                No alerts recorded for this date.
            </p>
        `;
    }

    const visibleItems = expanded
        ? items
        : items.slice(0, 2);

    const rows = visibleItems
        .map((item) => `
            <tr>
                <td>${escapeHTML(item.device_id)}</td>
                <td>${escapeHTML(item.worker_name)}</td>
                <td>${escapeHTML(item.message || item.alert_type)}</td>
                <td>${escapeHTML(item.status)}</td>
                <td>${escapeHTML(formatDateTime(item.created_at))}</td>
            </tr>
        `)
        .join("");

    return `
        <table class="table">
            <thead>
                <tr>
                    <th>Device ID</th>
                    <th>Worker Name</th>
                    <th>Alert</th>
                    <th>Status</th>
                    <th>Date &amp; Time</th>
                </tr>
            </thead>

            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

// ========================================
// RENDER SECTIONS
// ========================================

function renderSections() {
    sections.forEach(({ key, table, button }) => {
        const tableElement = $(table);
        const buttonElement = $(button);

        if (!tableElement || !buttonElement) return;

        const items = latestData[key] || [];

        tableElement.innerHTML = renderTable(
            items,
            expandedState[key]
        );

        if (items.length > 2) {
            buttonElement.innerHTML = `
                <button type="button" class="hbtn">
                    ${
                        expandedState[key]
                            ? "Show Less ▲"
                            : "View All History ▼"
                    }
                </button>
            `;

            const toggleButton =
                buttonElement.querySelector("button");

            if (toggleButton) {
                toggleButton.addEventListener("click", () => {
                    expandedState[key] = !expandedState[key];
                    renderSections();
                });
            }
        } else {
            buttonElement.innerHTML = "";
        }
    });
}

// ========================================
// MESSAGE DISPLAY
// ========================================

function showMessage(message) {
    sections.forEach(({ table, button }) => {
        const tableElement = $(table);
        const buttonElement = $(button);

        if (tableElement) {
            tableElement.innerHTML = `
                <p class="history-empty">
                    ${escapeHTML(message)}
                </p>
            `;
        }

        if (buttonElement) {
            buttonElement.innerHTML = "";
        }
    });
}

// ========================================
// LOAD ALERTS HISTORY
// ========================================

async function loadHistory() {
    const token = sessionStorage.getItem("smsys_access_token");

    if (!token) {
        showMessage(
            "Your supervisor session is missing. Please log in again."
        );
        return;
    }

    const queryParams = new URLSearchParams();

    if (dateInput?.value) {
        queryParams.set("date", dateInput.value);
    }

    const siteId = getCurrentSiteId();

    if (siteId) {
        queryParams.set("site_id", siteId);
    }

    showMessage("Loading alerts history...");

    try {
        const response = await fetch(
            `${API_BASE}/api/dashboard/alerts-history?${queryParams.toString()}`,
            {
                method: "GET",
                headers: getAuthHeaders()
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            if (response.status === 401) {
                showMessage(
                    "Your session has expired. Please log in again."
                );
            } else {
                showMessage(
                    result.message || "Unable to load alerts history."
                );
            }

            return;
        }

        latestData = result.alerts || {
            ppe: [],
            drowsiness: [],
            device: []
        };

        Object.keys(expandedState).forEach((key) => {
            expandedState[key] = false;
        });

        renderSections();

    } catch (error) {
        console.error("Alerts history error:", error);

        showMessage(
            "Could not connect to the SMSYS backend."
        );
    }
}

// ========================================
// SITE CHANGE LISTENER
// ========================================

window.addEventListener("smsys:site-change", () => {
    loadHistory();
});

// ========================================
// INITIALIZATION
// ========================================

initializeDatePicker();
loadHistory();