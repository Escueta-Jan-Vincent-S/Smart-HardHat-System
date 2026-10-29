import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Reuse the same styles and background as the existing Site.jsx page.
import "../Site/Site.css";
import bgImage from "../../assets/images/landing-page-background.jpg";

function DashboardLogin() {
  const navigate = useNavigate();

  const [siteName, setSiteName] = useState("");
  const [siteCode, setSiteCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [supervisorPin, setSupervisorPin] = useState("");

  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleContinue = async (event) => {
    event.preventDefault();
    setError("");

    if (!siteName.trim()) {
      setError("Please enter the site name.");
      return;
    }

    if (!siteCode.trim()) {
      setError("Please enter the site code.");
      return;
    }

    if (!fullName.trim()) {
      setError("Please enter the full name.");
      return;
    }

    if (!supervisorPin.trim()) {
      setError("Please enter the supervisor PIN.");
      return;
    }

    setIsVerifying(true);

    // Do not allow an earlier browser session to authorize this login attempt.
    sessionStorage.removeItem("smsys_access_token");
    sessionStorage.removeItem("smsys_site_id");
    sessionStorage.removeItem("smsys_supervisor_name");

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/dashboard/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            site_name: siteName.trim(),
            site_code: siteCode.trim(),
            full_name: fullName.trim(),
            supervisor_pin: supervisorPin.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success || !data.site?.access_token) {
        setError(data.message || "Invalid dashboard login information.");
        return;
      }

      navigate("/dashboard", {
        state: { site: data.site },
        replace: true,
      });
    } catch (requestError) {
      console.error("Dashboard login failed:", requestError);
      setError("Unable to connect to the SMSYS backend.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      className="site-page"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="site-panel">
        <header className="site-header">
          <span className="site-logo" aria-hidden="true">
            ⛑️
          </span>

          <div className="site-brand">
            <h2>SMSYS</h2>
            <p>SMART MONITORING SYSTEM</p>
          </div>
        </header>

        <div className="site-title">
          <h1>Dashboard Page</h1>
          <p>
            Enter site information below to view the monitoring dashboard.
          </p>
        </div>

        <form className="site-card" onSubmit={handleContinue}>
          <label htmlFor="dashboard-site-name">Site Name</label>
          <div className="site-input">
            <span aria-hidden="true">🏢</span>
            <input
              id="dashboard-site-name"
              type="text"
              placeholder="Enter construction site name"
              value={siteName}
              onChange={(event) => setSiteName(event.target.value)}
              autoComplete="organization"
              disabled={isVerifying}
            />
          </div>

          <label htmlFor="dashboard-site-code">Site Code</label>
          <div className="site-input">
            <span aria-hidden="true">🔒</span>
            <input
              id="dashboard-site-code"
              type="text"
              placeholder="Enter site code"
              value={siteCode}
              onChange={(event) => setSiteCode(event.target.value)}
              autoComplete="off"
              disabled={isVerifying}
            />
          </div>

          <label htmlFor="dashboard-full-name">Full Name</label>
          <div className="site-input">
            <span aria-hidden="true">👤</span>
            <input
              id="dashboard-full-name"
              type="text"
              placeholder="Enter supervisor full name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              disabled={isVerifying}
            />
          </div>

          <label htmlFor="dashboard-supervisor-pin">Supervisor PIN</label>
          <div className="site-input">
            <span aria-hidden="true">🔑</span>
            <input
              id="dashboard-supervisor-pin"
              type="password"
              placeholder="Enter supervisor PIN"
              value={supervisorPin}
              onChange={(event) =>
                setSupervisorPin(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              maxLength={6}
              autoComplete="current-password"
              disabled={isVerifying}
            />
          </div>

          {error && (
            <p
              role="alert"
              style={{
                color: "#ff6b6b",
                fontSize: "13px",
                margin: "14px 0 0",
                textAlign: "center",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="verify-btn"
            disabled={isVerifying}
          >
            {isVerifying ? "CHECKING..." : "CONTINUE"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default DashboardLogin;
