
 // ========================================
 // SMSYS DASHBOARD - ZONE LOCALIZATION
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

if (currentPage === "zone") {
    initializeZoneLocalization();
}

// ========================================
// STATE
// ========================================

let currentZoneSiteId = getCurrentSiteId();
let latestZoneRequestId = 0;
let zoneRefreshInterval = null;

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
    const table = $("zoneStatusTable");

    if (!table) return;

    const row = `
        <tr>
            <td colspan="6">${escapeHTML(message)}</td>
        </tr>
    `;

    if (table.tagName === "TBODY") {
        table.innerHTML = row;
    } else {
        table.innerHTML = `
            <table>
                <tbody>
                    ${row}
                </tbody>
            </table>
        `;
    }
}

// ========================================
// SUMMARY
// ========================================

function renderZoneSummary(summary = {}) {
    setText(
        "zLocalized",
        summary.localized_workers ?? 0
    );

    setText(
        "zUnlocalized",
        summary.unlocalized_workers ?? 0
    );
}

// ========================================
// LOCATION STATUS
// ========================================

function getLocationStatusClass(status) {
    const normalized = String(status || "")
        .toLowerCase()
        .trim();

    return normalized === "localized"
        ? "localized"
        : "unlocalized";
}

function renderLocationStatus(status) {
    const statusText = status || "Unlocalized";
    const statusClass = getLocationStatusClass(statusText);

    return `
        <span class="pill ${statusClass}">
            ${escapeHTML(statusText)}
        </span>
    `;
}

// ========================================
// WORKER LOCATION TABLE
// ========================================

function renderZoneTable(records = []) {
    const table = $("zoneStatusTable");

    if (!table) return;

    if (!Array.isArray(records) || records.length === 0) {
        showTableMessage("No registered workers available.");
        return;
    }

    const rows = records.map((record) => {
        const workerName = escapeHTML(
            record.worker_name || "Unknown Worker"
        );

        const workerCode = escapeHTML(
            record.worker_code || "—"
        );

        const deviceId = escapeHTML(
            record.device_id || "Unassigned"
        );

        const floor = escapeHTML(
            record.floor || "—"
        );

        const zone = escapeHTML(
            record.zone || "—"
        );

        const status = renderLocationStatus(
            record.location_status
        );

        const capturedAt = escapeHTML(
            formatDateTime(record.captured_at)
        );

        return `
            <tr>
                <td>${workerName}</td>
                <td>${workerCode}</td>
                <td>${deviceId}</td>
                <td>${floor}</td>
                <td>${zone}</td>
                <td>${status}</td>
                <td>${capturedAt}</td>
            </tr>
        `;
    }).join("");

    if (table.tagName === "TBODY") {
        table.innerHTML = rows;
    } else {
        table.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Worker Name</th>
                        <th>Worker Code</th>
                        <th>Device ID</th>
                        <th>Floor</th>
                        <th>Zone</th>
                        <th>Status</th>
                        <th>Last Updated</th>
                    </tr>
                </thead>

                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }
}

// ========================================
// LOCALIZATION TREND
// ========================================

function renderZoneTrend(trend = []) {
    const chart = $("zoneTrend");

    if (!chart) return;

    if (!Array.isArray(trend) || trend.length === 0) {
        chart.innerHTML = `
            <p>No localization trend data available.</p>
        `;
        return;
    }

    const maxValue = Math.max(
        1,
        ...trend.map((item) =>
            Number(item.localized_count) || 0
        )
    );

    chart.innerHTML = `
        <div class="ylab">
            ${[3, 2, 1, 0].map((value) => `
                <span>${value}</span>
            `).join("")}
        </div>

        <div class="cols">
            ${trend.map((item) => {
                const count = Number(item.localized_count) || 0;

                const height = Math.min(
                    100,
                    (count / maxValue) * 100
                );

                const date = item.date
                    ? new Date(`${item.date}T00:00:00`)
                    : null;

                const label = date && !Number.isNaN(date.getTime())
                    ? date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric"
                    })
                    : "—";

                return `
                    <div class="col">
                        <div class="bars">
                            <i
                                class="bar localized"
                                style="height:${height}%"
                                title="Localized workers: ${count}"
                            ></i>
                        </div>

                        <span>${escapeHTML(label)}</span>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

// ========================================
// RENDER PAGE
// ========================================

function renderZoneLocalization(data) {
    renderZoneSummary(data.summary || {});
    renderZoneTable(data.records || []);
    renderZoneTrend(data.trend || []);
}

// ========================================
// LOAD API DATA
// ========================================

async function loadZoneLocalization() {
    if (!sessionStorage.getItem("smsys_access_token")) {
        redirectToSiteAccess();
        return;
    }

    const requestId = ++latestZoneRequestId;

    const selectedSiteId =
        currentZoneSiteId ||
        getCurrentSiteId();

    const endpoint = new URL(
        `${API_BASE}/api/dashboard/zone-localization`
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

        if (requestId !== latestZoneRequestId) {
            return;
        }

        if (!response.ok || !data.success) {
            const error = new Error(
                data.message || "Could not load zone localization."
            );

            error.status = response.status;
            throw error;
        }

        if (data.site && data.site.id != null) {
            currentZoneSiteId = String(data.site.id);

            setCurrentSiteId(currentZoneSiteId);
        }

        if (!data.site) {
            renderZoneLocalization({
                summary: {
                    localized_workers: 0,
                    unlocalized_workers: 0
                },
                records: [],
                trend: []
            });

            showTableMessage("No site available.");

            return;
        }

        renderZoneLocalization(data);

    } catch (error) {
        if (requestId !== latestZoneRequestId) {
            return;
        }

        console.error(
            "SMSYS zone localization API error:",
            error
        );

        setText("zLocalized", "—");
        setText("zUnlocalized", "—");

        showTableMessage(
            error.status === 403
                ? "You do not have permission to access this site."
                : "Unable to load worker localization. Check that Flask is running."
        );

        const chart = $("zoneTrend");

        if (chart) {
            chart.innerHTML = `
                <p>Unable to load localization trend.</p>
            `;
        }
    }
}

// ========================================
// SITE CHANGE LISTENER
// ========================================

function initializeZoneSiteListener() {
    window.addEventListener("smsys:site-change", (event) => {
        const siteId =
            event.detail?.siteId ||
            event.detail?.id ||
            "";

        if (!siteId) return;

        currentZoneSiteId = String(siteId);

        setCurrentSiteId(currentZoneSiteId);

        loadZoneLocalization();
    });
}

// ========================================
// INITIALIZATION
// ========================================

function initializeZoneLocalization() {
    loadZoneLocalization();

    initializeZoneSiteListener();

    if (zoneRefreshInterval) {
        window.clearInterval(zoneRefreshInterval);
    }

    zoneRefreshInterval = window.setInterval(
        loadZoneLocalization,
        5000
    );

    window.addEventListener("beforeunload", () => {
        if (zoneRefreshInterval) {
            window.clearInterval(zoneRefreshInterval);
        }
    });
}
