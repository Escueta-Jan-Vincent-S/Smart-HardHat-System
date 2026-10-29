import { useLocation, useNavigate, Navigate } from "react-router-dom";
import bgImage from "../../assets/images/landing-page-background.jpg";
import "./SiteCreated.css";

function formatCreatedAt(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SiteCreated() {
  const location = useLocation();
  const navigate = useNavigate();
  const site = location.state?.site;
  const supervisorType = location.state?.supervisorType || "new";
  const isExistingSupervisor = supervisorType === "existing";

  if (!site) {
    return <Navigate to="/site-access" replace />;
  }

  const rows = [
    ["Site Name:", site.site_name],
    ["Site Code:", site.site_code],
    ["Supervisor Full Name:", site.supervisor_name],
    [
      isExistingSupervisor ? "Supervisor PIN (unchanged):" : "New Supervisor PIN:",
      site.supervisor_pin,
    ],
    ["Site Location:", site.site_location],
    ["Created at:", formatCreatedAt(site.created_at)],
  ];

  return (
    <main
      className="site-result-page"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <section className="site-result-shell">
        <header className="sr-header">
          <span className="sr-logo" aria-hidden="true">
            ⛑️
          </span>
          <div className="sr-brand">
            <h2>SMSYS</h2>
            <p>SMART MONITORING SYSTEM</p>
          </div>
        </header>

        <div className="sr-card">
          <span className="sr-check" aria-hidden="true">
            ✓
          </span>
          <h1>SITE CREATED SUCCESSFULLY!</h1>
          <p className="sr-subtitle">Site Information</p>

          <div className="sr-info">
            {rows.map(([label, value]) => (
              <div className="sr-row" key={label}>
                <label>{label}</label>
                <div className="sr-value">{value || "—"}</div>
              </div>
            ))}
          </div>

          <button
            className="sr-confirm"
            type="button"
            onClick={() => navigate("/site-access", { replace: true })}
          >
            ✓ &nbsp; CONFIRM
          </button>
        </div>
      </section>
    </main>
  );
}

export default SiteCreated;
