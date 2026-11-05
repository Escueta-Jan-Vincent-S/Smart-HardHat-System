// ========================================
// SMSYS DASHBOARD - AUTHENTICATION
// ========================================

import { API_BASE } from "./config.js";

export function getAuthHeaders() {
    const token = sessionStorage.getItem("smsys_access_token");

    return {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
}

export function clearRememberedSupervisorSession() {
    sessionStorage.removeItem("smsys_access_token");
    sessionStorage.removeItem("smsys_supervisor_name");
    sessionStorage.removeItem("smsys_site_id");
    sessionStorage.removeItem("smsys_dashboard_background");
}

export function redirectToSiteAccess() {
    clearRememberedSupervisorSession();

    if (window.top) {
        window.top.location.href = "/site-access";
    } else {
        window.location.href = "/site-access";
    }
}

export async function logoutSupervisor() {
    try {
        await fetch(`${API_BASE}/api/auth/logout`, {
            method: "POST",
            headers: getAuthHeaders()
        });
    } catch (error) {
        console.warn(
            "Could not contact the backend to revoke the session.",
            error
        );
    } finally {
        redirectToSiteAccess();
    }
}