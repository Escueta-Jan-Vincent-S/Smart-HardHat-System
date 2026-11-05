
// ========================================
// SMSYS DASHBOARD - OVERVIEW
// ========================================

import { $, API_BASE, pageUrl } from "../shared/config.js";
import {
    getAuthHeaders,
    redirectToSiteAccess
} from "../shared/auth.js";
import { escapeHTML } from "../shared/helpers.js";

// ========================================
// CURRENT SITE
// ========================================

let currentSiteId =
    pageUrl.searchParams.get("site_id") ||
    sessionStorage.getItem("smsys_site_id") ||
    "";

// ========================================
// GENERAL HELPERS
// ========================================

const setText = (id, value) => {
    const element = $(id);

    if (element) {
        element.textContent = value == null ? "—" : String(value);
    }
};

const statusClass = (value) => {
    const status = String(value || "").trim().toLowerCase();

    if (
        [
            "online",
            "connected",
            "awake",
            "normal",
            "localized",
            "present",
            "compliant"
        ].includes(status)
    ) {
        return "ok";
    }

    if (
        [
            "offline",
            "disconnected",
            "drowsy",
            "violation",
            "missing"
        ].includes(status)
    ) {
        return "bad";
    }

    return "warn";
};

const formatTime = (value) => {
    if (!value) return "—";

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return escapeHTML(value);
    }

    return parsed.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
    });
};

const formatDate = (value) => {
    if (!value) return "—";

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return escapeHTML(value);
    }

    return parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
};

// ========================================
// SITE DROPDOWN
// ========================================

const renderSiteOptions = (sites, selectedSite) => {
    setText(
        "siteNameValue",
        selectedSite ? selectedSite.site_name : "No site created"
    );

    const list = $("siteOptions");

    if (!list) return;

    if (!sites || sites.length === 0) {
        list.innerHTML =
            '<li><a href="#">No sites created yet.</a></li>';
        return;
    }

    list.innerHTML = sites.map((site) => `
        <li>
            <a
                href="#"
                data-site-id="${escapeHTML(site.id)}"
                class="${
                    selectedSite &&
                    Number(selectedSite.id) === Number(site.id)
                        ? "selected"
                        : ""
                }"
            >
                ${escapeHTML(site.site_name)}
            </a>
        </li>
    `).join("");

    list.querySelectorAll("[data-site-id]").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();

            currentSiteId = link.dataset.siteId;

            sessionStorage.setItem(
                "smsys_site_id",
                currentSiteId
            );

            const nextUrl = new URL(window.location.href);

            nextUrl.searchParams.set(
                "site_id",
                currentSiteId
            );

            window.history.replaceState({}, "", nextUrl);

            const dropdown = link.closest("details");

            if (dropdown) {
                dropdown.open = false;
            }

            loadDashboardOverview();
        });
    });
};

// ========================================
// RECENT ALERTS
// ========================================

const renderRecentAlerts = (alerts) => {
    const container = $("recentAlerts");

    if (!container) return;

    if (!alerts || alerts.length === 0) {
        container.innerHTML = `
            <div class="alert">
                <div class="alert-text">
                    No alerts recorded yet.
                </div>
            </div>
        `;

        return;
    }

    const warningTypes = [
        "unmonitored",
        "device_offline",
        "warning"
    ];

    container.innerHTML = alerts.map((alert) => {
        const type = String(
            alert.alert_type || "alert"
        ).toLowerCase().replace(/[ -]+/g, "_");

        const warning = warningTypes.some(
            (part) => type.includes(part)
        );

        const title = type.includes("drows")
            ? "DROWSINESS ALERT"
            : (
                type.includes("ppe") ||
                type.includes("missing")
                    ? "PPE VIOLATION"
                    : String(
                        alert.alert_type || "ALERT"
                    ).toUpperCase()
            );

        return `
            <div class="alert ${warning ? "warning" : ""}">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2L1 21h22zm1 15h-2v-2h2zm0-4h-2V9h2z"/>
                </svg>

                <div class="alert-text">
                    <strong>${escapeHTML(title)}</strong>
                    ${escapeHTML(alert.message || "Alert recorded")}
                    <br>
                    Time: ${escapeHTML(formatTime(alert.created_at))}
                </div>

                <div class="alert-meta">
                    ${escapeHTML(alert.device_id || "—")}
                    <br>
                    ${escapeHTML(alert.worker_name || "Unassigned")}
                    <br>
                    ${escapeHTML(formatDate(alert.created_at))}
                </div>

                <div class="alert-thumb"></div>
            </div>
        `;
    }).join("");
};

// ========================================
// DEVICE CONNECTIVITY
// ========================================

const renderDeviceConnectivity = (devices) => {
    const body = $("deviceConnectivityBody");

    if (!body) return;

    if (!devices || devices.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="2">No device records yet.</td>
            </tr>
        `;

        return;
    }

    body.innerHTML = devices.map((device) => `
        <tr>
            <td>
                ${escapeHTML(device.device_id)}
                <small>
                    ${escapeHTML(device.worker_name || "Unassigned")}
                </small>
            </td>

            <td class="${statusClass(device.status)}">
                ${escapeHTML(device.status)}
            </td>
        </tr>
    `).join("");
};

// ========================================
// PPE COMPLIANCE
// ========================================

const ppeIndicatorMap = [
    {
        item: "Hardhat",
        countId: "ppeHardhatCount",
        indicatorId: "ppeHardhatIndicator"
    },
    {
        item: "Safety Vest",
        countId: "ppeVestCount",
        indicatorId: "ppeVestIndicator"
    },
    {
        item: "Gloves",
        countId: "ppeGlovesCount",
        indicatorId: "ppeGlovesIndicator"
    },
    {
        item: "Safety Boots",
        countId: "ppeBootsCount",
        indicatorId: "ppeBootsIndicator"
    }
];

const renderPPECompliance = (items) => {
    const lookup = new Map(
        (items || []).map((item) => [
            item.item,
            item
        ])
    );

    ppeIndicatorMap.forEach((mapping) => {
        const item = lookup.get(mapping.item);

        const countElement = $(mapping.countId);
        const indicator = $(mapping.indicatorId);

        if (!item || Number(item.total) === 0) {
            if (countElement) {
                countElement.textContent = "—";
            }

            if (indicator) {
                indicator.className = "status-dot na";
                indicator.textContent = "?";
            }

            return;
        }

        if (countElement) {
            countElement.textContent =
                `${item.compliant}/${item.total}`;
        }

        if (indicator) {
            const compliant = Number(item.compliant || 0);
            const total = Number(item.total || 0);

            indicator.className =
                `status-dot ${
                    compliant === total
                        ? "ok"
                        : compliant === 0
                            ? "bad"
                            : "warn"
                }`;

            indicator.textContent =
                compliant === total
                    ? "✓"
                    : compliant === 0
                        ? "✕"
                        : "!";
        }
    });
};

// ========================================
// DROWSINESS STATUS
// ========================================

const renderDrowsinessStatus = (records) => {
    const body = $("drowsinessStatusBody");

    if (!body) return;

    if (!records || records.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="3">No monitoring records yet.</td>
            </tr>
        `;

        return;
    }

    body.innerHTML = records.map((record) => `
        <tr>
            <td>${escapeHTML(record.device_id)}</td>

            <td class="${statusClass(record.status)}">
                ${escapeHTML(record.status)}
            </td>

            <td>${escapeHTML(formatTime(record.time))}</td>
        </tr>
    `).join("");
};

// ========================================
// ZONE LOCALIZATION
// ========================================

const renderZoneLocalization = (records) => {
    const body = $("zoneLocalizationBody");

    if (!body) return;

    if (!records || records.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="2">No localization records yet.</td>
            </tr>
        `;

        return;
    }

    body.innerHTML = records.map((record) => `
        <tr>
            <td>
                ${escapeHTML(record.device_id)}
                <small>
                    ${escapeHTML(record.worker_name || "Unassigned")}
                </small>
            </td>

            <td class="${statusClass(record.status)}">
                ${escapeHTML(record.location_label || "Unmonitored")}
            </td>
        </tr>
    `).join("");
};

// ========================================
// NOTIFICATIONS
// ========================================

const renderNotifications = (notifications, count) => {
    setText("notificationBadge", count ?? 0);

    const list = $("notificationList");

    if (!list) return;

    if (!notifications || notifications.length === 0) {
        list.innerHTML = "<li>No active notifications.</li>";
        return;
    }

    list.innerHTML = notifications.map((item) => `
        <li>
            ${escapeHTML(item.message || item.alert_type || "Alert")}

            <small>
                ${escapeHTML(formatDate(item.created_at))}
                ${escapeHTML(formatTime(item.created_at))}
            </small>
        </li>
    `).join("");
};

// ========================================
// RENDER DASHBOARD
// ========================================

const renderDashboard = (data) => {
    const summary = data.summary || {};

    setText(
        "activeDevicesValue",
        summary.active_devices ?? 0
    );

    setText(
        "ppeComplianceValue",
        summary.ppe_compliance_percent == null
            ? "—"
            : `${summary.ppe_compliance_percent}%`
    );

    setText(
        "drowsinessAlertsValue",
        summary.drowsiness_alerts ?? 0
    );

    setText(
        "ppeViolationsValue",
        summary.ppe_violations_today ?? 0
    );

    renderSiteOptions(
        data.sites || [],
        data.site || null
    );

    renderRecentAlerts(
        data.recent_alerts || []
    );

    renderDeviceConnectivity(
        data.device_connectivity || []
    );

    renderPPECompliance(
        data.ppe_compliance_status || []
    );

    renderDrowsinessStatus(
        data.drowsiness_status || []
    );

    renderZoneLocalization(
        data.zone_localization || []
    );

    renderNotifications(
        data.notifications || [],
        data.notification_count ?? 0
    );
};

// ========================================
// LOAD DASHBOARD OVERVIEW
// ========================================

async function loadDashboardOverview() {
    const url = new URL(
        `${API_BASE}/api/dashboard/overview`
    );

    if (currentSiteId) {
        url.searchParams.set("site_id", currentSiteId);
    }

    try {
        const response = await fetch(url.toString(), {
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            const error = new Error(
                data.message || "Could not load dashboard data."
            );

            error.status = response.status;

            throw error;
        }

        renderDashboard(data);

    } catch (error) {
        if (error.status === 401) {
            redirectToSiteAccess();
            return;
        }

        console.error(
            "SMSYS dashboard API error:",
            error
        );

        setText(
            "siteNameValue",
            error.status === 403
                ? "Access denied"
                : "Backend unavailable"
        );

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

// ========================================
// INITIALIZE DASHBOARD OVERVIEW
// ========================================

if (!document.getElementById("app")) {
    loadDashboardOverview();

    // Refresh overview every 5 seconds.
    window.setInterval(loadDashboardOverview, 5000);
}