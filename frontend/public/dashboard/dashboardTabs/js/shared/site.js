// ========================================
// SMSYS DASHBOARD - SITE MANAGEMENT HELPERS
// ========================================

import { params } from "./config.js";

export function getCurrentSiteId() {
    return (
        params.get("site_id") ||
        sessionStorage.getItem("smsys_site_id") ||
        ""
    );
}

export function setCurrentSiteId(siteId) {
    if (!siteId) return;

    sessionStorage.setItem("smsys_site_id", String(siteId));
}

export function notifySiteChange(site) {
    if (!site || !site.id) return;

    setCurrentSiteId(site.id);

    window.dispatchEvent(
        new CustomEvent("smsys:site-change", {
            detail: site
        })
    );
}