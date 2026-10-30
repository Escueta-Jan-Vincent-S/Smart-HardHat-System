import { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import landingBackground from "../../assets/images/landing-page-background.jpg";

function Dashboard() {
  const location = useLocation();
  const site = location.state?.site;
  const iframeRef = useRef(null);

  const siteId = site?.id ?? sessionStorage.getItem("smsys_site_id") ?? "";

  const supervisorName =
    site?.supervisor_name ??
    site?.supervisorName ??
    sessionStorage.getItem("smsys_supervisor_name") ??
    "";

  const params = new URLSearchParams();

  if (siteId) {
    params.set("site_id", String(siteId));
  }

  if (supervisorName) {
    params.set("supervisor_name", String(supervisorName));
  }

  // Importing from src/assets lets Vite resolve the image correctly.
  params.set("background_url", landingBackground);

  const dashboardUrl = `/dashboard/dashboard.html?${params.toString()}`;

  // A verified site token or an existing browser session is required.
  const hasVerifiedAccess = site
    ? Boolean(site.access_token)
    : Boolean(sessionStorage.getItem("smsys_access_token"));

  useEffect(() => {
    // Save the verified site information before loading the dashboard iframe.
    if (site) {
      if (site.access_token) {
        sessionStorage.setItem(
          "smsys_access_token",
          String(site.access_token)
        );
      } else {
        // Prevent reuse of another supervisor's previous session.
        sessionStorage.removeItem("smsys_access_token");
      }

      if (site.id != null) {
        sessionStorage.setItem("smsys_site_id", String(site.id));
      }

      const verifiedSupervisorName =
        site.supervisor_name ?? site.supervisorName;

      if (verifiedSupervisorName) {
        sessionStorage.setItem(
          "smsys_supervisor_name",
          String(verifiedSupervisorName)
        );
      }
    }

    // Do not load the iframe without a valid session token.
    if (!sessionStorage.getItem("smsys_access_token")) {
      return;
    }

    // Load the dashboard only after sessionStorage has been updated.
    if (iframeRef.current) {
      iframeRef.current.src = dashboardUrl;
    }
  }, [site, dashboardUrl]);

  // A dashboard URL alone is not enough to authorize access.
  if (!hasVerifiedAccess) {
    return <Navigate to="/site-access" replace />;
  }

  return (
    <iframe
      ref={iframeRef}
      title="SMSYS Dashboard"
      style={{
        display: "block",
        width: "100%",
        height: "100vh",
        border: "none",
      }}
    />
  );
}

export default Dashboard;