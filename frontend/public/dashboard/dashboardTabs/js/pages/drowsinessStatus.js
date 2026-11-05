
 // ========================================
 // SMSYS DASHBOARD - DROWSINESS STATUS
 // ========================================

import {
    $,
    API_BASE,
    currentPage
} from "../shared/config.js";

import {
    getAuthHeaders,
    redirectToSiteAccess
} from "../shared/auth.js";

import {
    escapeHTML,
    formatDateTime
} from "../shared/helpers.js";

import {
    getCurrentSiteId,
    setCurrentSiteId
} from "../shared/site.js";

// ========================================
// PAGE CHECK
// ========================================

if (currentPage === "drowsy") {
    initializeDrowsinessStatus();
}

// ========================================
// STATE
// ========================================

let currentDrowsinessSiteId = getCurrentSiteId();
let latestDrowsinessRequestId = 0;
let drowsinessRefreshInterval = null;

// ========================================
// ELEMENT HELPERS
// ========================================

function setText(id, value) {
    const element = $(id);

    if (element) {
        element.textContent = value ?? "—";
    }
}

function showTableMessage(message) {
    const table = $("drTable");

    if (!table) return;

    table.innerHTML = `
        <tr>
            <td colspan="5">${escapeHTML(message)}</td>
        </tr>
    `;
}

// ========================================
// SUMMARY
// ========================================

function formatPercentage(value) {
    if (value === null || value === undefined) {
        return "—";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "—";
    }

    return `${number.toFixed(1).replace(/\.0$/, "")}%`;
}

function renderDrowsinessSummary(summary = {}) {
    setText(
        "dNormal",
        formatPercentage(summary.normal_percent)
    );

    setText(
        "dDrowsy",
        formatPercentage(summary.drowsy_percent)
    );

    setText(
        "dUnmon",
        formatPercentage(summary.unmonitored_percent)
    );
}

// ========================================
// STATUS DISPLAY
// ========================================

function getStatusClass(status) {
    const normalized = String(status || "")
        .toLowerCase()
        .trim();

    if (normalized === "normal") {
        return "n";
    }

    if (normalized === "drowsy") {
        return "d";
    }

    return "u";
}

function renderStatusPill(status) {
    const statusText = status || "Unmonitored";
    const statusClass = getStatusClass(statusText);

    return `
        <span class="pill ${statusClass}">
            ${escapeHTML(statusText)}
        </span>
    `;
}

// ========================================
// DROWSINESS TABLE
// ========================================

function renderDrowsinessTable(records = []) {
    const table = $("drTable");

    if (!table) return;

    if (!Array.isArray(records) || records.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5">No drowsiness records available.</td>
            </tr>
        `;

        return;
    }

    table.innerHTML = records.map((record) => {
        const deviceId = escapeHTML(record.device_id || "—");
        const workerName = escapeHTML(
            record.worker_name || "Unassigned"
        );

        const status = renderStatusPill(record.status);

        const capturedAt = escapeHTML(
            formatDateTime(record.captured_at)
        );

        const duration = record.duration_ms == null
            ? "—"
            : `${Number(record.duration_ms).toLocaleString()} ms`;

        return `
            <tr>
                <td>${deviceId}</td>
                <td>${workerName}</td>
                <td>${status}</td>
                <td>${capturedAt}</td>
                <td>${escapeHTML(duration)}</td>
            </tr>
        `;
    }).join("");
}

// ========================================
// HOURLY TREND CHART
// ========================================

function renderDrowsinessTrend(trend = []) {
    const chart = $("trend");

    if (!chart) return;

    if (!Array.isArray(trend) || trend.length === 0) {
        chart.innerHTML = "<p>No trend data available.</p>";
        return;
    }

    const maxValue = Math.max(
        1,
        ...trend.flatMap((item) => [
            Number(item.normal) || 0,
            Number(item.drowsy) || 0,
            Number(item.unmonitored) || 0
        ])
    );

    const chartMaximum = Math.ceil(maxValue);

    chart.innerHTML = `
        <div class="ylab">
            ${[3, 2, 1, 0].map((value) => `
                <span>${value}</span>
            `).join("")}
        </div>

        <div class="cols">
            ${trend.map((item) => {
                const normal = Number(item.normal) || 0;
                const drowsy = Number(item.drowsy) || 0;
                const unmonitored = Number(item.unmonitored) || 0;

                return `
                    <div class="col">
                        <div class="bars">
                            <i
                                class="bar n"
                                style="height:${(normal / chartMaximum) * 100}%"
                                title="Normal: ${normal}"
                            ></i>

                            <i
                                class="bar d"
                                style="height:${(drowsy / chartMaximum) * 100}%"
                                title="Drowsy: ${drowsy}"
                            ></i>

                            <i
                                class="bar u"
                                style="height:${(unmonitored / chartMaximum) * 100}%"
                                title="Unmonitored: ${unmonitored}"
                            ></i>
                        </div>

                        <span>${escapeHTML(item.hour || "—")}</span>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

// ========================================
// RENDER PAGE
// ========================================

function renderDrowsinessStatus(data) {
    renderDrowsinessSummary(data.summary || {});
    renderDrowsinessTable(data.records || []);
    renderDrowsinessTrend(data.trend || []);
}

// ========================================
// LOAD API DATA
// ========================================

async function loadDrowsinessStatus() {
    if (!sessionStorage.getItem("smsys_access_token")) {
        redirectToSiteAccess();
        return;
    }

    const requestId = ++latestDrowsinessRequestId;

    const selectedSiteId =
        currentDrowsinessSiteId ||
        getCurrentSiteId();

    const endpoint = new URL(
        `${API_BASE}/api/dashboard/drowsiness-status`
    );

    if (selectedSiteId) {
        endpoint.searchParams.set(
            "site_id",
            selectedSiteId
        );
    }

    try {
        const response = await fetch(endpoint.toString(), {
            method: "GET",
            headers: getAuthHeaders(),
            cache: "no-store"
        });

        if (response.status === 401) {
            redirectToSiteAccess();
            return;
        }

        const data = await response.json();

        if (requestId !== latestDrowsinessRequestId) {
            return;
        }

        if (!response.ok || !data.success) {
            const error = new Error(
                data.message || "Could not load drowsiness status."
            );

            error.status = response.status;
            throw error;
        }

        if (data.site && data.site.id != null) {
            currentDrowsinessSiteId = String(data.site.id);

            setCurrentSiteId(currentDrowsinessSiteId);
        }

        if (!data.site) {
            renderDrowsinessStatus({
                summary: {},
                records: [],
                trend: data.trend || []
            });

            setText("dNormal", "0%");
            setText("dDrowsy", "0%");
            setText("dUnmon", "0%");

            showTableMessage("No site available.");

            return;
        }

        renderDrowsinessStatus(data);

    } catch (error) {
        if (requestId !== latestDrowsinessRequestId) {
            return;
        }

        console.error(
            "SMSYS drowsiness status API error:",
            error
        );

        setText("dNormal", "—");
        setText("dDrowsy", "—");
        setText("dUnmon", "—");

        showTableMessage(
            error.status === 403
                ? "You do not have permission to access this site."
                : "Unable to load drowsiness status. Check that Flask is running."
        );

        const chart = $("trend");

        if (chart) {
            chart.innerHTML = `
                <p>
                    Unable to load drowsiness trend.
                </p>
            `;
        }
    }
}

// ========================================
// SITE CHANGE LISTENER
// ========================================

function initializeDrowsinessSiteListener() {
    window.addEventListener("smsys:site-change", (event) => {
        const siteId =
            event.detail?.siteId ||
            event.detail?.id ||
            "";

        if (!siteId) return;

        currentDrowsinessSiteId = String(siteId);

        setCurrentSiteId(currentDrowsinessSiteId);

        loadDrowsinessStatus();
    });
}

// ========================================
// INITIALIZATION
// ========================================

function initializeDrowsinessStatus() {
    loadDrowsinessStatus();

    initializeDrowsinessSiteListener();

    if (drowsinessRefreshInterval) {
        window.clearInterval(drowsinessRefreshInterval);
    }

    drowsinessRefreshInterval = window.setInterval(
        loadDrowsinessStatus,
        5000
    );

    window.addEventListener("beforeunload", () => {
        if (drowsinessRefreshInterval) {
            window.clearInterval(drowsinessRefreshInterval);
        }
    });
}
