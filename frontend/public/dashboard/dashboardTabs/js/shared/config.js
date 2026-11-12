
// ========================================
// SMSYS DASHBOARD - SHARED CONFIGURATION
// ========================================

export const $ = (id) => document.getElementById(id);

export const app = $("app");

export const pageUrl = new URL(window.location.href);

export const params = pageUrl.searchParams;

export const API_BASE =
    `${window.location.protocol}//${window.location.hostname}:5000`;

export const API_HOST = window.location.hostname;

export const currentPage =
    document.body.dataset.active || "dashboard";
