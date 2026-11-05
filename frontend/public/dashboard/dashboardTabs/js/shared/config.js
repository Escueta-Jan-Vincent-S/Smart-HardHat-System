// ========================================
// SMSYS DASHBOARD - SHARED CONFIGURATION
// ========================================

export const $ = (id) => document.getElementById(id);

export const app = $("app");

export const pageUrl = new URL(window.location.href);

export const params = pageUrl.searchParams;

export const API_HOST =
    window.location.hostname === "localhost"
        ? "127.0.0.1"
        : (window.location.hostname || "127.0.0.1");

export const API_BASE =
    `${window.location.protocol}//${API_HOST}:5000`;

export const currentPage =
    document.body.dataset.active || "dashboard";