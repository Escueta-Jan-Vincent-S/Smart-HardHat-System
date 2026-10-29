import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import landingBackground from "../../assets/images/landing-page-background.jpg";

function Dashboard() {
  const location = useLocation();
  const site = location.state?.site;

  // The verified site object comes from the supervisor PIN verification response.
  // sessionStorage keeps the same supervisor/site when the iframe reloads or opens a tab page.
  const siteId = site?.id ?? sessionStorage.getItem("smsys_site_id") ?? "";
  const supervisorName =
    site?.supervisor_name ??
    site?.supervisorName ??
    sessionStorage.getItem("smsys_supervisor_name") ??
    "";

  useEffect(() => {
    if (site?.id != null) {
      sessionStorage.setItem("smsys_site_id", String(site.id));
    }

    const verifiedSupervisorName = site?.supervisor_name ?? site?.supervisorName;
    if (verifiedSupervisorName) {
      sessionStorage.setItem("smsys_supervisor_name", String(verifiedSupervisorName));
    }
  }, [site?.id, site?.supervisor_name, site?.supervisorName]);

  const params = new URLSearchParams();
  if (siteId) params.set("site_id", String(siteId));
  if (supervisorName) params.set("supervisor_name", String(supervisorName));
  // Importing from src/assets lets Vite resolve the image correctly for dev and production builds.
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
