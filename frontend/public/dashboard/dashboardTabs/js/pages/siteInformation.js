
// ========================================
// SMSYS DASHBOARD - SITE INFORMATION
// ========================================

import { API_BASE, pageUrl } from "../shared/config.js";

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

if (document.body.dataset.active === "siteinfo") {

    // ========================================
    // STATE
    // ========================================

    let currentSiteId =
        pageUrl.searchParams.get("site_id") ||
        getCurrentSiteId();

    let latestRequestId = 0;

    const panel = document.querySelector(".g-panel");

    // ========================================
    // DISPLAY HELPERS
    // ========================================

    function renderMessage(message) {
        if (!panel) return;

        panel.innerHTML = `
            <h3>Site Details</h3>

            <p style="
                padding: 16px 11px;
                font-size: 15px;
                line-height: 1.7;
                color: #ffffff;
            ">
                ${escapeHTML(message)}
            </p>
        `;
    }

    function renderSiteInformation(site, supervisorName) {
        if (!panel) return;

        if (!site) {
            renderMessage("No site information is available.");
            return;
        }

        const information = [
            {
                label: "Site Name",
                value: site.site_name
            },
            {
                label: "Site Code",
                value: site.site_code
            },
            {
                label: "Supervisor Full Name",
                value: supervisorName
            },
            {
                label: "Supervisor PIN",
                value: "Hidden for security"
            },
            {
                label: "Site Location",
                value: site.site_location
            },
            {
                label: "Created at",
                value: formatDateTime(site.created_at)
            },
            {
                label: "Site Status",
                value: site.status
            }
        ];

        panel.innerHTML = `
            <h3>Site Details</h3>

            <div style="
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 12px 24px;
                padding: 18px 12px;
            ">
                ${information.map((item) => `
                    <div style="
                        display: flex;
                        flex-direction: column;
                        gap: 5px;
                        min-width: 0;
                        padding: 10px 12px;
                        background: rgba(255, 255, 255, 0.06);
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        border-radius: 8px;
                    ">
                        <span style="
                            color: #ffbc2d;
                            font-size: 12px;
                            font-weight: 600;
                        ">
                            ${escapeHTML(item.label)}
                        </span>

                        <span style="
                            color: #ffffff;
                            font-size: 15px;
                            font-weight: 500;
                            overflow-wrap: anywhere;
                        ">
                            ${escapeHTML(item.value || "—")}
                        </span>
                    </div>
                `).join("")}
            </div>

            <p style="
                margin: 0 12px 12px;
                color: rgba(255, 255, 255, 0.65);
                font-size: 12px;
            ">
                To view another site, use the site selector in the dashboard
                top navigation.
            </p>
        `;

        panel.style.height = "auto";
        panel.style.minHeight = "210px";
        panel.style.maxHeight = "calc(100vh - 220px)";
        panel.style.overflowY = "auto";
    }

    // ========================================
    // LOAD SITE INFORMATION
    // ========================================

    async function loadSiteInformation() {

        if (!sessionStorage.getItem("smsys_access_token")) {
            redirectToSiteAccess();
            return;
        }

        if (!panel) {
            console.error(
                "SMSYS: Site Information panel was not found."
            );
            return;
        }

        const requestId = ++latestRequestId;

        renderMessage("Loading site information...");

        const endpoint = new URL(
            `${API_BASE}/api/sites/mine`
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

            if (response.status === 401) {
                redirectToSiteAccess();
                return;
            }

            const result = await response.json();

            // Ignore outdated requests.
            if (requestId !== latestRequestId) return;

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    "Unable to load site information."
                );
            }

            if (result.site && result.site.id != null) {
                currentSiteId = String(result.site.id);

                sessionStorage.setItem(
                    "smsys_site_id",
                    currentSiteId
                );
            }

            renderSiteInformation(
                result.site,
                result.supervisor_name
            );

        } catch (error) {

            if (requestId !== latestRequestId) return;

            console.error(
                "SMSYS Site Information API error:",
                error
            );

            const message = error.message ||
                "Unable to load site information.";

            renderMessage(message);
        }
    }

    // ========================================
    // SITE CHANGE LISTENER
    // ========================================

    window.addEventListener(
        "smsys:site-change",
        (event) => {

            const changedSiteId =
                event.detail?.siteId ||
                event.detail?.id ||
                "";

            if (!changedSiteId) return;

            currentSiteId = String(changedSiteId);

            loadSiteInformation();
        }
    );

    // ========================================
    // INITIALIZATION
    // ========================================

    if (panel) {
        panel.style.height = "auto";
        panel.style.minHeight = "210px";
        panel.style.maxHeight = "calc(100vh - 220px)";
        panel.style.overflowY = "auto";
    }

    loadSiteInformation();
}
