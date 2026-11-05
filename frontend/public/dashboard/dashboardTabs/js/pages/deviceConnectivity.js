// ========================================
// SMSYS DASHBOARD - DEVICE CONNECTIVITY
// ========================================

import { $, API_BASE, pageUrl } from "../shared/config.js";
import {
    getAuthHeaders,
    redirectToSiteAccess
} from "../shared/auth.js";
import {
    escapeHTML,
    formatDateTime
} from "../shared/helpers.js";
import { getCurrentSiteId } from "../shared/site.js";

// ========================================
// PAGE CHECK
// ========================================

if (document.body.dataset.active === "devices") {

    // ========================================
    // STATE
    // ========================================

    let currentSiteId =
        pageUrl.searchParams.get("site_id") ||
        getCurrentSiteId();

    let latestRequestId = 0;
    let refreshTimer = null;

    // ========================================
    // ELEMENT HELPERS
    // ========================================

    function setText(id, value) {
        const element = $(id);

        if (element) {
            element.textContent = value;
        }
    }

    function formatDeviceDuration(milliseconds) {
        const value = Number(milliseconds);

        if (!Number.isFinite(value) || value < 0) {
            return "—";
        }

        if (value < 1000) {
            return `${Math.round(value)} ms`;
        }

        const seconds = value / 1000;

        if (seconds < 60) {
            return `${seconds.toFixed(1)} s`;
        }

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);

        return `${minutes}m ${remainingSeconds}s`;
    }

    // ========================================
    // STATUS HELPERS
    // ========================================

    function getStatusClass(status) {
        const normalized = String(status || "")
            .toLowerCase()
            .trim();

        if (normalized === "online" || normalized === "connected") {
            return "online";
        }

        if (normalized === "offline" || normalized === "disconnected") {
            return "offline";
        }

        return "unmonitored";
    }

    // ========================================
    // SUMMARY CARDS
    // ========================================

    function renderSummary(summary = {}) {
        setText(
            "cConnected",
            Number(summary.online_devices || 0)
        );

        setText(
            "cDisconnected",
            Number(summary.offline_devices || 0)
        );
    }

    // ========================================
    // DEVICE TABLE
    // ========================================

    function renderDeviceTable(records = []) {
        const table = $("devStatusTable");

        if (!table) return;

        if (!Array.isArray(records) || records.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="5">
                        No device records available.
                    </td>
                </tr>
            `;

            return;
        }

        table.innerHTML = records.map((device) => {
            const status = String(
                device.status || "Unmonitored"
            );

            const statusClass = getStatusClass(status);

            return `
                <tr>
                    <td>${escapeHTML(device.device_id || "—")}</td>

                    <td>${escapeHTML(device.worker_name || "Unassigned")}</td>

                    <td>
                        <span class="status-pill ${statusClass}">
                            ${escapeHTML(status)}
                        </span>
                    </td>

                    <td>${escapeHTML(formatDateTime(device.last_seen))}</td>

                    <td>${escapeHTML(formatDeviceDuration(device.duration_ms))}</td>
                </tr>
            `;
        }).join("");
    }

    // ========================================
    // HOURLY CONNECTIVITY TREND
    // ========================================

    function renderTrend(trend = []) {
        const container = $("devTrend");

        if (!container) return;

        if (!Array.isArray(trend) || trend.length === 0) {
            container.innerHTML = `
                <p class="history-empty">
                    No connectivity trend data available.
                </p>
            `;

            return;
        }

        const maximum = Math.max(
            1,
            ...trend.flatMap((item) => [
                Number(item.online || 0),
                Number(item.offline || 0)
            ])
        );

        container.innerHTML = `
            <div class="ylab">
                ${[maximum, Math.ceil(maximum * 0.75), Math.ceil(maximum * 0.5), 0]
                    .map((value) => `<span>${value}</span>`)
                    .join("")}
            </div>

            <div class="cols">
                ${trend.map((item) => {
                    const online = Number(item.online);
                    const offline = Number(item.offline);

                    const onlineHeight =
                        Number.isFinite(online)
                            ? (online / maximum) * 100
                            : 0;

                    const offlineHeight =
                        Number.isFinite(offline)
                            ? (offline / maximum) * 100
                            : 0;

                    return `
                        <div class="col">
                            <div class="bars">
                                <i
                                    class="bar n"
                                    style="height:${onlineHeight}%"
                                    title="Online: ${Number.isFinite(online) ? online : "No data"}"
                                ></i>

                                <i
                                    class="bar d"
                                    style="height:${offlineHeight}%"
                                    title="Offline: ${Number.isFinite(offline) ? offline : "No data"}"
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
    // PAGE MESSAGES
    // ========================================

    function clearPage(message) {
        setText("cConnected", "—");
        setText("cDisconnected", "—");

        const table = $("devStatusTable");

        if (table) {
            table.innerHTML = `
                <tr>
                    <td colspan="5">
                        ${escapeHTML(message)}
                    </td>
                </tr>
            `;
        }

        const trend = $("devTrend");

        if (trend) {
            trend.innerHTML = `
                <p class="history-empty">
                    ${escapeHTML(message)}
                </p>
            `;
        }
    }

    // ========================================
    // LOAD DEVICE CONNECTIVITY
    // ========================================

    async function loadDeviceConnectivity() {
        if (!sessionStorage.getItem("smsys_access_token")) {
            redirectToSiteAccess();
            return;
        }

        const requestId = ++latestRequestId;

        const endpoint = new URL(
            `${API_BASE}/api/dashboard/device-connectivity`
        );

        if (currentSiteId) {
            endpoint.searchParams.set(
                "site_id",
                currentSiteId
            );
        }

        try {
            const response = await fetch(
                endpoint.toString(),
                {
                    method: "GET",
                    headers: getAuthHeaders(),
                    cache: "no-store"
                }
            );

            const result = await response.json();

            if (response.status === 401) {
                redirectToSiteAccess();
                return;
            }

            if (!response.ok || !result.success) {
                const error = new Error(
                    result.message ||
                    "Unable to load device connectivity."
                );

                error.status = response.status;

                throw error;
            }

            // Ignore outdated requests.
            if (requestId !== latestRequestId) return;

            if (result.site && result.site.id != null) {
                currentSiteId = String(result.site.id);

                sessionStorage.setItem(
                    "smsys_site_id",
                    currentSiteId
                );
            }

            renderSummary(result.summary || {});
            renderDeviceTable(result.records || []);
            renderTrend(result.trend || []);

        } catch (error) {
            if (requestId !== latestRequestId) return;

            console.error(
                "SMSYS device connectivity API error:",
                error
            );

            const message = error.status === 403
                ? "You do not have permission to access this site."
                : "Unable to load device connectivity. Check that Flask is running.";

            clearPage(message);
        }
    }

    // ========================================
    // SITE CHANGE LISTENER
    // ========================================

    window.addEventListener("smsys:site-change", (event) => {
        currentSiteId = String(
            event.detail?.siteId ||
            event.detail?.id ||
            ""
        );

        loadDeviceConnectivity();
    });

    // ========================================
    // AUTO REFRESH
    // ========================================

    loadDeviceConnectivity();

    refreshTimer = window.setInterval(
        loadDeviceConnectivity,
        5000
    );

    window.addEventListener("beforeunload", () => {
        if (refreshTimer !== null) {
            window.clearInterval(refreshTimer);
        }
    });
}