import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Site from "./pages/Site/Site";
import CreateSite from "./pages/CreateSite/CreateSite";
import CreateSiteExisiting from "./pages/CreateSite/CreateSiteExisiting";
import SiteCreated from "./pages/SiteCreated/SiteCreated";
import Verify from "./pages/Verify/verify";
import Dashboard from "./pages/Dashboard/Dashboard";
import DashboardLogin from "./pages/Dashboard/DashboardLogin";
import WorkerLogin from "./pages/Worker/WorkerLogin";

function RouteTitle() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    if (
      path === "/site-access" ||
      path === "/create-site" ||
      path === "/create-site-existing" ||
      path === "/site-created" ||
      path === "/verify"
    ) {
      document.title = "Site Creation";
    } else if (path.startsWith("/dashboard")) {
      document.title = "Dashboard";
    } else if (path === "/worker-login") {
      document.title = "Worker";
    } else {
      document.title = "SMSYS";
    }
  }, [location.pathname]);

  return null;
}

function App() {
  return (
    <>
      <RouteTitle />

      <Routes>
        <Route
          path="/"
          element={<Navigate to="/site-access" replace />}
        />

        {/* SITE ACCESS */}
        <Route
          path="/site-access"
          element={<Site />}
        />

        {/* CREATE NEW SITE */}
        <Route
          path="/create-site"
          element={<CreateSite />}
        />

        {/* CREATE SITE FOR EXISTING SUPERVISOR */}
        <Route
          path="/create-site-existing"
          element={<CreateSiteExisiting />}
        />

        {/* SITE CREATED */}
        <Route
          path="/site-created"
          element={<SiteCreated />}
        />

        {/* VERIFICATION */}
        <Route
          path="/verify"
          element={<Verify />}
        />

        {/* DASHBOARD */}
        <Route
          path="/dashboard-login"
          element={<DashboardLogin />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        {/* WORKER LOGIN */}
        <Route
          path="/worker-login"
          element={<WorkerLogin />}
        />
      </Routes>
    </>
  );
}

export default App;