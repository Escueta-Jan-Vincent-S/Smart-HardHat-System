
// ========================================
// SMSYS DASHBOARD - SHARED LAYOUT
// ========================================

import {
    $,
    app,
    API_BASE,
    params
} from "./shared/config.js";

import {
    getAuthHeaders,
    logoutSupervisor,
    redirectToSiteAccess
} from "./shared/auth.js";

import { escapeHTML } from "./shared/helpers.js";

import {
    getCurrentSiteId,
    setCurrentSiteId
} from "./shared/site.js";

// ========================================
// PAGE INFORMATION
// ========================================

const isTabPage = Boolean(app);
const active = document.body.dataset.active || "dashboard";

// ========================================
// SESSION INFORMATION
// ========================================

const incomingSupervisorName = params.get("supervisor_name");
const incomingSiteId = params.get("site_id");
const incomingBackgroundUrl = params.get("background_url");

if (incomingSupervisorName) {
    sessionStorage.setItem(
        "smsys_supervisor_name",
        incomingSupervisorName
    );
}

if (incomingSiteId) {
    setCurrentSiteId(incomingSiteId);
}

if (incomingBackgroundUrl) {
    sessionStorage.setItem(
        "smsys_dashboard_background",
        incomingBackgroundUrl
    );
}

// ========================================
// BACKGROUND
// ========================================

function applyDashboardBackground() {
    const backgroundUrl = sessionStorage.getItem(
        "smsys_dashboard_background"
    );

    if (!backgroundUrl) return;

    try {
        const parsedUrl = new URL(
            backgroundUrl,
            window.location.origin
        );

        if (
            parsedUrl.protocol !== "http:" &&
            parsedUrl.protocol !== "https:"
        ) {
            return;
        }

        document.documentElement.style.setProperty(
            "--dashboard-background-image",
            `url("${parsedUrl.href.replace(/["\\\n\r]/g, "")}")`
        );
    } catch (error) {
        console.warn("Invalid dashboard background URL:", error);
    }
}

// ========================================
// NAVIGATION ITEMS
// ========================================

const NAV = [
    [
        "dashboard",
        "Dashboard",
        "/dashboard/dashboard.html",
        "M3 3h8v10H3zm10 0h8v6h-8zM3 15h8v6H3zm10-4h8v10h-8z"
    ],
    [
        "ppe",
        "PPE Status",
        "/dashboard/dashboardTabs/ppeStatus.html",
        "M4 6h3l1.5-2h7L17 6h3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm8 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"
    ],
    [
        "drowsy",
        "Drowsiness Status",
        "/dashboard/dashboardTabs/drowsinessStatus.html",
        "M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"
    ],
    [
        "devices",
        "Device Connectivity",
        "/dashboard/dashboardTabs/deviceConnectivity.html",
        "M3 4h14v10H3zm4 12h6v2H7zM19 8h2v10h-2z"
    ],
    [
        "history",
        "Alerts History",
        "/dashboard/dashboardTabs/alertsHistory.html",
        "M6 2h9l5 5v15H6zm2 10h9v2H8zm0 4h9v2H8z"
    ],
    [
        "zone",
        "Zone Localization",
        "/dashboard/dashboardTabs/zoneLocalization.html",
        "M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"
    ],
    [
        "analytics",
        "Analytics",
        "/dashboard/dashboardTabs/analytics.html",
        "M3 20h18v2H3zM5 11h3v8H5zm5-4h3v12h-3zm5-4h3v16h-3z"
    ],
    [
        "siteinfo",
        "Site Information",
        "/dashboard/dashboardTabs/siteInformation.html",
        "M6 2h9l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1v5h5M8 12h8v2H8zm0 4h8v2H8z"
    ],
    [
        "settings",
        "Account Settings",
        "/dashboard/dashboardTabs/accountSettings.html",
        "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 5.5-2 .8a7.5 7.5 0 0 1-.7 1.7l.9 2-2 2-2-.9a7.5 7.5 0 0 1-1.7.7l-.8 2h-2.8l-.8-2a7.5 7.5 0 0 1-1.7-.7l-2 .9-2-2 .9-2a7.5 7.5 0 0 1-.7-1.7l-2-.8v-2.8l2-.8a7.5 7.5 0 0 1 .7-1.7l-.9-2 2-2 2 .9a7.5 7.5 0 0 1 1.7-.7l.8-2h2.8l.8 2a7.5 7.5 0 0 1 1.7.7l2-.9 2 2-.9 2a7.5 7.5 0 0 1 .7 1.7l2 .8z"
    ]
];

// ========================================
// ICON HELPER
// ========================================

function ico(path) {
    return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="${path}"/>
        </svg>
    `;
}

// ========================================
// SHARED SIDEBAR AND TOPBAR
// ========================================

function initializeSharedLayout() {
    if (!app) {
        console.info(
            "SMSYS: No #app container found. Using the existing dashboard layout."
        );
        return;
    }

    // Prevent duplicate layout injection.
    if (app.querySelector(".nav") && app.querySelector(".topbar")) {
        return;
    }

    app.classList.add("page");

    const items = NAV.map(([key, label, href, path]) => {
        const isActive = key === active;

        return `
            <li>
                <a
                    class="nav-item${isActive ? " active" : ""}"
                    href="${encodeURI(href)}"
                >
                    ${ico(path)}
                    ${label}
                </a>
            </li>
        `;
    }).join("");

    app.insertAdjacentHTML(
        "afterbegin",
        `
        <!-- SIDEBAR -->
        <nav class="nav" data-active="${active}">
            <div class="nav-head">
                <img src="../../assets/icons/1.hardhat_logo.png" alt="">
                <div>
                    <strong>SMSYS</strong>
                    <small>SMART MONITORING SYSTEM</small>
                </div>
            </div>

            <div class="nav-body"></div>
            <div class="nav-rail"></div>
            <div class="nav-notch"></div>

            <ul class="nav-list">
                ${items}

                <li class="nav-item-logout">
                    <a class="nav-item" href="#logout">
                        ${ico("M5 3h9v4h-2V5H7v14h5v-2h2v4H5zm11 5l5 4-5 4v-3h-5v-2h5z")}
                        Logout
                    </a>
                </li>
            </ul>
        </nav>

        <!-- TOPBAR -->
        <header class="topbar">
            <div class="topbar-item topbar-site">
                <details class="dropdown">
                    <summary class="site-toggle">
                        <small>SITE</small>
                        <span class="value" id="siteNameValue">
                            Loading site...
                        </span>

                        <svg
                            class="chevron"
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            aria-hidden="true"
                        >
                            <path
                                d="M1 3l4 4 4-4"
                                fill="none"
                                stroke="#ffbc2d"
                                stroke-width="1.8"
                            />
                        </svg>
                    </summary>

                    <ul class="dropdown-menu" id="siteOptions">
                        <li>
                            <a href="#">Loading sites...</a>
                        </li>
                    </ul>
                </details>
            </div>

            <div class="topbar-item topbar-datetime">
                <small>DATE &amp; TIME</small>

                <div class="datetime">
                    <span class="value" id="date"></span>
                    <span class="divider"></span>
                    <span class="value" id="time"></span>
                </div>
            </div>

            <div class="topbar-item topbar-notifications">
                <details class="dropdown">
                    <summary
                        class="bell-toggle"
                        aria-label="Notifications"
                    >
                        <svg
                            width="30"
                            height="30"
                            viewBox="0 0 24 24"
                            fill="#feaf1c"
                            aria-hidden="true"
                        >
                            <path d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22zm7-6V11a7 7 0 0 0-5.5-6.8V3.5a1.5 1.5 0 0 0-3 0v.7A7 7 0 0 0 5 11v5l-2 2v1h18v-1z"/>
                        </svg>

                        <span class="badge" id="notificationBadge">0</span>
                    </summary>

                    <div class="dropdown-menu notifications-menu">
                        <h4>Notifications</h4>

                        <ul id="notificationList">
                            <li>No alerts recorded yet.</li>
                        </ul>
                    </div>
                </details>
            </div>

            <div class="topbar-item topbar-account">
                <svg
                    width="50"
                    height="50"
                    viewBox="0 0 50 50"
                    aria-hidden="true"
                >
                    <circle cx="25" cy="25" r="23" fill="#d0d0d0"/>
                    <circle cx="25" cy="19" r="8" fill="#0b1735"/>
                    <path
                        d="M9 40c3-9 9-12 16-12s13 3 16 12a23 23 0 0 1-32 0z"
                        fill="#0b1735"
                    />
                </svg>

                <span id="supervisorNameValue">Supervisor</span>
            </div>
        </header>

        <!-- LOGOUT CONFIRMATION -->
        <div class="modal" id="logout">
            <a
                class="modal-backdrop"
                href="#"
                aria-label="Close"
            ></a>

            <div
                class="modal-box"
                role="dialog"
                aria-modal="true"
                aria-labelledby="logout-title"
            >
                <h2 id="logout-title">LOG OUT</h2>

                <p>Are you sure you want to log out?</p>

                <div class="modal-actions">
                    <a class="btn btn-primary" href="#">
                        YES, LOG OUT
                    </a>

                    <a class="btn btn-outline" href="#">
                        CANCEL
                    </a>
                </div>
            </div>
        </div>
        `
    );

    // Put the existing tab content inside <main>,
    // matching the structure of dashboard.html.
    let main = app.querySelector(":scope > main");

    if (!main) {
        main = document.createElement("main");

        const existingContent = Array.from(app.children).filter(
            (element) =>
                !element.matches(
                    ".nav, .topbar, .modal"
                )
        );

        existingContent.forEach((element) => {
            main.appendChild(element);
        });

        app.appendChild(main);
    }
}

// ========================================
// SUPERVISOR INFORMATION
// ========================================

function updateSupervisorName() {
    const supervisorName =
        sessionStorage.getItem("smsys_supervisor_name") ||
        "Supervisor";

    const nameElement = $("supervisorNameValue");

    if (nameElement) {
        nameElement.textContent = supervisorName;
    }
}

// ========================================
// LIVE CLOCK
// ========================================

function updateClock() {
    const now = new Date();

    const dateElement = $("date");
    const timeElement = $("time");

    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString(
            "en-US",
            {
                month: "long",
                day: "numeric",
                year: "numeric"
            }
        );
    }

    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString(
            "en-US",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );
    }
}

function initializeClock() {
    updateClock();

    window.setInterval(updateClock, 1000);
}

// ========================================
// LOGOUT MODAL
// ========================================

function initializeLogout() {
    const logoutModal = $("logout");

    if (!logoutModal) return;

    const logoutLinks = document.querySelectorAll(
        'a[href="#logout"]'
    );

    const confirmLogout = logoutModal.querySelector(
        ".modal-actions .btn-primary"
    );

    const cancelLogout = logoutModal.querySelector(
        ".modal-actions .btn-outline"
    );

    const backdrop = logoutModal.querySelector(
        ".modal-backdrop"
    );

    function openModal(event) {
        event.preventDefault();

        logoutModal.classList.add("show");
        logoutModal.style.display = "flex";
    }

    function closeModal(event) {
        if (event) {
            event.preventDefault();
        }

        logoutModal.classList.remove("show");
        logoutModal.style.display = "none";
    }

    logoutLinks.forEach((link) => {
        link.addEventListener("click", openModal);
    });

    if (confirmLogout) {
        confirmLogout.addEventListener("click", async (event) => {
            event.preventDefault();
            await logoutSupervisor();
        });
    }

    if (cancelLogout) {
        cancelLogout.addEventListener("click", closeModal);
    }

    if (backdrop) {
        backdrop.addEventListener("click", closeModal);
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeModal();
        }
    });
}

// ========================================
// TAB PAGE SITE SELECTION
// ========================================

let currentTabSiteId = getCurrentSiteId();
let latestSiteRequestId = 0;

function getSiteId(site) {
    return site?.id ?? site?.site_id ?? "";
}

function getSiteName(site) {
    return site?.site_name || site?.name || "Unnamed Site";
}

function updateSiteSelection(site) {
    if (!site) return;

    const siteId = getSiteId(site);

    if (!siteId) return;

    currentTabSiteId = String(siteId);

    setCurrentSiteId(currentTabSiteId);

    const siteNameElement = $("siteNameValue");

    if (siteNameElement) {
        siteNameElement.textContent = getSiteName(site);
    }

    const siteOptionsElement = $("siteOptions");

    if (siteOptionsElement) {
        siteOptionsElement
            .querySelectorAll("[data-site-id]")
            .forEach((option) => {
                option.classList.toggle(
                    "selected",
                    option.dataset.siteId === currentTabSiteId
                );
            });
    }

    const nextUrl = new URL(window.location.href);

    nextUrl.searchParams.set("site_id", currentTabSiteId);

    window.history.replaceState({}, "", nextUrl);

    window.dispatchEvent(
        new CustomEvent("smsys:site-change", {
            detail: {
                id: currentTabSiteId,
                siteId: currentTabSiteId,
                ...site
            }
        })
    );
}

// ========================================
// LOAD SUPERVISOR SITES
// ========================================

async function loadOwnedSitesForTab() {
    const siteNameElement = $("siteNameValue");
    const siteOptionsElement = $("siteOptions");

    if (!siteNameElement || !siteOptionsElement) return;

    if (!sessionStorage.getItem("smsys_access_token")) {
        redirectToSiteAccess();
        return;
    }

    const requestId = ++latestSiteRequestId;

    const endpoint = new URL(`${API_BASE}/api/sites/mine`);

    if (currentTabSiteId) {
        endpoint.searchParams.set("site_id", currentTabSiteId);
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

        if (requestId !== latestSiteRequestId) return;

        if (!response.ok || !data.success) {
            siteNameElement.textContent =
                response.status === 403
                    ? "Access denied"
                    : "Unable to load sites";

            siteOptionsElement.replaceChildren();
            return;
        }

        const sites = Array.isArray(data.sites)
            ? data.sites
            : [];

        const selectedSite =
            data.site ||
            sites.find(
                (site) =>
                    String(getSiteId(site)) ===
                    String(currentTabSiteId)
            ) ||
            sites[0] ||
            null;

        siteOptionsElement.replaceChildren();

        if (!sites.length) {
            currentTabSiteId = "";

            siteNameElement.textContent = "No site created";

            const item = document.createElement("li");
            const link = document.createElement("a");

            link.href = "#";
            link.textContent = "No sites created yet.";

            item.appendChild(link);
            siteOptionsElement.appendChild(item);

            return;
        }

        sites.forEach((site) => {
            const siteId = String(getSiteId(site));

            const item = document.createElement("li");
            const link = document.createElement("a");

            link.href = "#";
            link.dataset.siteId = siteId;
            link.textContent = getSiteName(site);

            if (
                selectedSite &&
                String(getSiteId(selectedSite)) === siteId
            ) {
                link.classList.add("selected");
            }

            link.addEventListener("click", (event) => {
                event.preventDefault();

                updateSiteSelection(site);

                const dropdown = link.closest("details");

                if (dropdown) {
                    dropdown.open = false;
                }
            });

            item.appendChild(link);
            siteOptionsElement.appendChild(item);
        });

        if (selectedSite) {
            currentTabSiteId = String(getSiteId(selectedSite));

            setCurrentSiteId(currentTabSiteId);

            siteNameElement.textContent = getSiteName(selectedSite);
        } else {
            siteNameElement.textContent = "No site created";
        }

    } catch (error) {
        if (requestId !== latestSiteRequestId) return;

        console.error(
            "Could not load supervisor sites:",
            error
        );

        siteNameElement.textContent = "Backend unavailable";
    }
}

// ========================================
// TAB PAGE NOTIFICATIONS
// ========================================

let latestNotificationRequestId = 0;

function renderTabNotifications(notifications, count) {
    const badge = $("notificationBadge");
    const list = $("notificationList");

    const numericCount = Number(count);

    if (badge) {
        badge.textContent = Number.isFinite(numericCount)
            ? String(Math.max(0, Math.trunc(numericCount)))
            : "0";
    }

    if (!list) return;

    if (
        !Array.isArray(notifications) ||
        notifications.length === 0
    ) {
        list.innerHTML = "<li>No active notifications.</li>";
        return;
    }

    list.innerHTML = notifications.map((item) => {
        const date = item.created_at
            ? new Date(item.created_at)
            : null;

        const formattedDate =
            date && !Number.isNaN(date.getTime())
                ? date.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit"
                })
                : "—";

        return `
            <li>
                ${escapeHTML(
                    item.message || item.alert_type || "Alert"
                )}
                <small>${escapeHTML(formattedDate)}</small>
            </li>
        `;
    }).join("");
}

async function loadTabNotifications() {
    const badge = $("notificationBadge");
    const list = $("notificationList");

    if (!sessionStorage.getItem("smsys_access_token")) {
        if (badge) {
            badge.textContent = "—";
        }

        if (list) {
            list.innerHTML =
                "<li>Sign in to view notifications.</li>";
        }

        return;
    }

    const requestId = ++latestNotificationRequestId;

    const endpoint = new URL(
        `${API_BASE}/api/dashboard/overview`
    );

    if (currentTabSiteId) {
        endpoint.searchParams.set(
            "site_id",
            currentTabSiteId
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

        if (requestId !== latestNotificationRequestId) return;

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || "Could not load notifications."
            );
        }

        if (data.site && data.site.id != null) {
            currentTabSiteId = String(data.site.id);

            setCurrentSiteId(currentTabSiteId);
        }

        renderTabNotifications(
            data.notifications || [],
            data.notification_count ?? 0
        );

    } catch (error) {
        if (requestId !== latestNotificationRequestId) return;

        console.error(
            "SMSYS notification API error:",
            error
        );

        if (badge) {
            badge.textContent = "—";
        }

        if (list) {
            list.innerHTML =
                "<li>Unable to load notifications.</li>";
        }
    }
}

// ========================================
// TAB PAGE INITIALIZATION
// ========================================

function initializeTabPage() {
    if (!isTabPage) return;

    loadOwnedSitesForTab().then(() => {
        loadTabNotifications();
    });

    window.addEventListener("smsys:site-change", (event) => {
        const changedSiteId =
            event.detail?.siteId ||
            event.detail?.id ||
            "";

        if (changedSiteId) {
            currentTabSiteId = String(changedSiteId);

            setCurrentSiteId(currentTabSiteId);
        }

        loadTabNotifications();
    });

    window.setInterval(loadTabNotifications, 5000);
}

// ========================================
// INITIALIZATION
// ========================================

function initializeDashboardLayout() {
    applyDashboardBackground();

    // Dashboard Overview already contains its own layout.
    // Tab pages receive the shared layout through JavaScript.
    initializeSharedLayout();

    updateSupervisorName();
    initializeClock();
    initializeLogout();
    initializeTabPage();
}

initializeDashboardLayout();
