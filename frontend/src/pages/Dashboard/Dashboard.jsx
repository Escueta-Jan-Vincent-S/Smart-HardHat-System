import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import landingBackground from "../../assets/images/landing-page-background.jpg";

function Dashboard() {
  const location = useLocation();
  const site = location.state?.site;
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // The verification API returns this token only after the site credentials are valid.
    // Store it before mounting the same-origin dashboard iframe so its API calls can use it.
    if (site) {
      if (site.access_token) {
        sessionStorage.setItem("smsys_access_token", String(site.access_token));
      } else {
        // Do not accidentally reuse a different supervisor's previous browser session.
        sessionStorage.removeItem("smsys_access_token");
      }

      if (site.id != null) {
        sessionStorage.setItem("smsys_site_id", String(site.id));
      }

      const verifiedSupervisorName = site.supervisor_name ?? site.supervisorName;
      if (verifiedSupervisorName) {
        sessionStorage.setItem("smsys_supervisor_name", String(verifiedSupervisorName));
      }
    }

    setSessionReady(true);
  }, [site]);

  if (!sessionReady) return null;

  // A dashboard URL by itself is not enough to authorize access.
  // If there is no verified token, return to the site-access screen.
  if (!sessionStorage.getItem("smsys_access_token")) {
    return <Navigate to="/site-access" replace />;
  }

  const siteId = site?.id ?? sessionStorage.getItem("smsys_site_id") ?? "";
  const supervisorName =
    site?.supervisor_name ??
    site?.supervisorName ??
    sessionStorage.getItem("smsys_supervisor_name") ??
    "";

  const params = new URLSearchParams();
  if (siteId) params.set("site_id", String(siteId));
  if (supervisorName) params.set("supervisor_name", String(supervisorName));
  // Importing from src/assets lets Vite resolve the image correctly in dev and production builds.
  params.set("background_url", landingBackground);

  const dashboardUrl = `/dashboard/dashboard.html?${params.toString()}`;

  return (
    <iframe
      title="SMSYS Dashboard"
      src={dashboardUrl}
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
