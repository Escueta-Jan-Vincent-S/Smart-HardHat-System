
 // ========================================
 // SMSYS DASHBOARD - PPE STATUS
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

if (currentPage === "ppe") {
    initializePPEStatus();
}

// ========================================
// STATE
// ========================================

let currentPpeSiteId = getCurrentSiteId();
let latestPPERequestId = 0;
let ppeRefreshInterval = null;

const frameUrlCache = new Map();

// ========================================
// ELEMENT HELPERS
// ========================================

function setPPEText(id, value) {
    const element = $(id);

    if (element) {
        element.textContent = value ?? "—";
    }
}

function formatPPEPercent(value) {
    if (value == null || !Number.isFinite(Number(value))) {
        return "—";
    }

    return `${Number(value).toFixed(1).replace(/\.0$/, "")}%`;
}

// ========================================
// SUMMARY
// ========================================

function renderPPESummary(summary = {}) {
    setPPEText(
        "pCompliant",
        formatPPEPercent(summary.compliant_percent)
    );

    setPPEText(
        "pViolation",
        formatPPEPercent(summary.violation_percent)
    );

    setPPEText(
        "pUnmon",
        formatPPEPercent(summary.unmonitored_percent)
    );
}

// ========================================
// PPE STATUS INDICATORS
// ========================================

function renderPPEDot(status) {
    const normalized = String(status || "")
        .toLowerCase()
        .trim();

    let className = "na";
    let symbol = "?";

    if (normalized === "compliant") {
        className = "yes";
        symbol = "✓";
    } else if (normalized === "violation") {
        className = "no";
        symbol = "✕";
    }

    return `
        <i class="status-dot ${className}">
            ${symbol}
        </i>
    `;
}

// ========================================
// PPE TABLE
// ========================================

function renderPPETable(records = []) {
    const table = $("ppeTable");

    if (!table) return;

    if (!Array.isArray(records) || records.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="8">
                    No PPE records available.
                </td>
            </tr>
        `;

        return;
    }

    table.innerHTML = records.map((record) => {
        const deviceId = escapeHTML(record.device_id || "—");

        const workerName = escapeHTML(
            record.worker_name || "Unassigned"
        );

        const hardhat = renderPPEDot(record.hardhat);
        const vest = renderPPEDot(record.vest);
        const gloves = renderPPEDot(record.gloves);
        const boots = renderPPEDot(record.boots);

        const overallStatus = escapeHTML(
            record.overall_status || "Unmonitored"
        );

        const capturedAt = escapeHTML(
            formatDateTime(record.captured_at)
        );

        return `
            <tr>
                <td>${deviceId}</td>
                <td>${workerName}</td>
                <td>${hardhat}</td>
                <td>${vest}</td>
                <td>${gloves}</td>
                <td>${boots}</td>
                <td>${overallStatus}</td>
                <td>${capturedAt}</td>
            </tr>
        `;
    }).join("");
}

// ========================================
// PPE PIE CHART AND LEGEND
// ========================================

function renderPPEBreakdown(summary = {}) {
    const pie = $("pie");
    const legend = $("legend");

    const compliant = Number(summary.compliant_percent) || 0;
    const violation = Number(summary.violation_percent) || 0;

    if (pie) {
        if (
            summary.compliant_percent == null &&
            summary.violation_percent == null &&
            summary.unmonitored_percent == null
        ) {
            pie.style.background = "#8a8d93";
        } else {
            const compliantEnd = compliant;
            const violationEnd = compliant + violation;

            pie.style.background = `
                conic-gradient(
                    #2ecc40 0% ${compliantEnd}%,
                    #e5484d ${compliantEnd}% ${violationEnd}%,
                    #8a8d93 ${violationEnd}% 100%
                )
            `;
        }
    }

    if (legend) {
        legend.innerHTML = [
            {
                className: "yes",
                symbol: "✓",
                label: "Compliant",
                value: formatPPEPercent(summary.compliant_percent)
            },
            {
                className: "no",
                symbol: "✕",
                label: "Violation",
                value: formatPPEPercent(summary.violation_percent)
            },
            {
                className: "na",
                symbol: "?",
                label: "Unmonitored",
                value: formatPPEPercent(summary.unmonitored_percent)
            }
        ].map((item) => `
            <div class="lg">
                <i class="status-dot ${item.className}">
                    ${item.symbol}
                </i>

                <span>${item.label}</span>

                <b>${item.value}</b>
            </div>
        `).join("");
    }
}

// ========================================
// PPE DETECTION FRAMES
// ========================================

function revokeUnusedFrameUrls(activeFrameIds) {
    for (const [frameId, objectUrl] of frameUrlCache.entries()) {
        if (!activeFrameIds.has(frameId)) {
            URL.revokeObjectURL(objectUrl);
            frameUrlCache.delete(frameId);
        }
    }
}

function renderPPEFramePlaceholders(frames = []) {
    const container = $("frames");

    if (!container) return;

    const usableFrames = Array.isArray(frames)
        ? frames.filter((frame) => frame && frame.id != null)
        : [];

    const activeLocalFrameIds = new Set(
        usableFrames
            .filter((frame) => !frame.frame_url)
            .map((frame) => String(frame.id))
    );

    revokeUnusedFrameUrls(activeLocalFrameIds);

    if (usableFrames.length === 0) {
        container.innerHTML = `
            <div class="frame">
                <div class="frame-img frame-placeholder">
                    No detection frames available.
                </div>

                <figcaption>
                    Waiting for monitoring data
                </figcaption>
            </div>
        `;

        return;
    }

    container.innerHTML = usableFrames.map((frame) => `
        <figure
            class="frame"
            data-frame-id="${escapeHTML(frame.id)}"
        >
            <div class="frame-img frame-placeholder">
                Loading frame...
            </div>

            <figcaption>
                ${escapeHTML(frame.device_id || "Device")} ·
                ${escapeHTML(frame.worker_name || "Unassigned")}
            </figcaption>
        </figure>
    `).join("");
}

async function loadPPEFrame(frame, requestId) {
    const container = $("frames");

    if (!container) return;

    const frameId = String(frame.id);

    let imageUrl = frame.frame_url || "";

    try {
        if (!imageUrl) {
            imageUrl = frameUrlCache.get(frameId) || "";

            if (!imageUrl) {
                const endpoint =
                    `${API_BASE}/api/dashboard/ppe-frames/` +
                    encodeURIComponent(frameId);

                const response = await fetch(endpoint, {
                    method: "GET",
                    headers: getAuthHeaders(),
                    cache: "no-store"
                });

                if (response.status === 401) {
                    redirectToSiteAccess();
                    return;
                }

                if (!response.ok) {
                    throw new Error(
                        `Frame request failed (${response.status})`
                    );
                }

                imageUrl = URL.createObjectURL(
                    await response.blob()
                );

                frameUrlCache.set(frameId, imageUrl);
            }
        }

        if (requestId !== latestPPERequestId) return;

        const figure = Array.from(
            container.querySelectorAll("[data-frame-id]")
        ).find(
            (element) => element.dataset.frameId === frameId
        );

        if (!figure) return;

        const image = document.createElement("img");

        image.className = "frame-img";

        image.alt =
            `PPE detection frame for ${frame.device_id || "device"}`;

        image.src = imageUrl;

        image.onerror = () => {
            if (requestId !== latestPPERequestId) return;

            const placeholder = document.createElement("div");

            placeholder.className =
                "frame-img frame-placeholder";

            placeholder.textContent = "Frame unavailable";

            image.replaceWith(placeholder);
        };

        const caption = document.createElement("figcaption");

        caption.textContent = [
            frame.device_id || "Device",
            frame.worker_name || "Unassigned",
            formatDateTime(frame.captured_at)
        ].join(" · ");

        caption.title = caption.textContent;

        figure.replaceChildren(image, caption);

    } catch (error) {
        console.warn(
            "Could not load PPE detection frame:",
            error
        );

        if (requestId !== latestPPERequestId) return;

        const figure = Array.from(
            container.querySelectorAll("[data-frame-id]")
        ).find(
            (element) => element.dataset.frameId === frameId
        );

        if (figure) {
            const placeholder = document.createElement("div");

            placeholder.className =
                "frame-img frame-placeholder";

            placeholder.textContent = "Frame unavailable";

            const caption = figure.querySelector("figcaption");

            figure.replaceChildren(
                placeholder,
                caption || document.createElement("figcaption")
            );
        }
    }
}

function renderPPEFrames(frames = [], requestId) {
    const usableFrames = Array.isArray(frames)
        ? frames.filter((frame) => frame && frame.id != null)
        : [];

    renderPPEFramePlaceholders(usableFrames);

    usableFrames.forEach((frame) => {
        loadPPEFrame(frame, requestId);
    });
}

// ========================================
// RENDER PPE PAGE
// ========================================

function renderPPEStatus(data, requestId) {
    const summary = data.summary || {};

    renderPPESummary(summary);
    renderPPETable(data.records || []);
    renderPPEBreakdown(summary);
    renderPPEFrames(data.frames || [], requestId);
}

// ========================================
// LOAD PPE API DATA
// ========================================

async function loadPPEStatus() {
    if (!sessionStorage.getItem("smsys_access_token")) {
        redirectToSiteAccess();
        return;
    }

    const requestId = ++latestPPERequestId;

    const selectedSiteId =
        currentPpeSiteId ||
        getCurrentSiteId();

    const endpoint = new URL(
        `${API_BASE}/api/dashboard/ppe-status`
    );

    if (selectedSiteId) {
        endpoint.searchParams.set("site_id", selectedSiteId);
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

        if (requestId !== latestPPERequestId) return;

        if (!response.ok || !data.success) {
            const error = new Error(
                data.message || "Could not load PPE status."
            );

            error.status = response.status;
            throw error;
        }

        if (data.site && data.site.id != null) {
            currentPpeSiteId = String(data.site.id);

            setCurrentSiteId(currentPpeSiteId);
        }

        if (!data.site) {
            renderPPEStatus({
                summary: {},
                records: [],
                frames: []
            }, requestId);

            setPPEText("pCompliant", "0%");
            setPPEText("pViolation", "0%");
            setPPEText("pUnmon", "0%");

            return;
        }

        renderPPEStatus(data, requestId);

    } catch (error) {
        if (requestId !== latestPPERequestId) return;

        console.error("SMSYS PPE status API error:", error);

        setPPEText("pCompliant", "—");
        setPPEText("pViolation", "—");
        setPPEText("pUnmon", "—");

        const table = $("ppeTable");

        if (table) {
            const message = error.status === 403
                ? "You do not have permission to access this site."
                : "Unable to load PPE status. Check that Flask is running.";

            table.innerHTML = `
                <tr>
                    <td colspan="8">${escapeHTML(message)}</td>
                </tr>
            `;
        }

        const container = $("frames");

        if (container) {
            container.innerHTML = `
                <div class="frame">
                    <div class="frame-img frame-placeholder">
                        Unable to load detection frames.
                    </div>
                </div>
            `;
        }
    }
}

// ========================================
// SITE CHANGE LISTENER
// ========================================

function initializePPESiteListener() {
    window.addEventListener("smsys:site-change", (event) => {
        const siteId =
            event.detail?.siteId ||
            event.detail?.id ||
            "";

        if (!siteId) return;

        currentPpeSiteId = String(siteId);

        setCurrentSiteId(currentPpeSiteId);

        loadPPEStatus();
    });
}

// ========================================
// CLEANUP
// ========================================

function cleanupPPEStatus() {
    if (ppeRefreshInterval) {
        window.clearInterval(ppeRefreshInterval);
        ppeRefreshInterval = null;
    }

    for (const objectUrl of frameUrlCache.values()) {
        URL.revokeObjectURL(objectUrl);
    }

    frameUrlCache.clear();
}

// ========================================
// INITIALIZATION
// ========================================

function initializePPEStatus() {
    loadPPEStatus();

    initializePPESiteListener();

    ppeRefreshInterval = window.setInterval(
        loadPPEStatus,
        5000
    );

    window.addEventListener(
        "beforeunload",
        cleanupPPEStatus,
        { once: true }
    );
}
