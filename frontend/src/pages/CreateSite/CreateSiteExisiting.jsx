import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./CreateSite.css";
import bgImage from "../../assets/images/landing-page-background.jpg";

function CreateSiteExisiting() {
  const navigate = useNavigate();

  const [siteName, setSiteName] = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setError("");

    if (!siteName.trim()) {
      setError("Please enter the site name.");
      return;
    }

    if (!siteLocation.trim()) {
      setError("Please enter the site location.");
      return;
    }

    if (!supervisorName.trim()) {
      setError("Please enter the supervisor full name.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(
        "http://127.0.0.1:5000/api/sites/create-existing",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            site_name: siteName.trim(),
            site_location: siteLocation.trim(),
            supervisor_name: supervisorName.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success || !data.site) {
        setError(data.message || "Failed to create the site.");
        return;
      }

      navigate("/site-created", {
        replace: true,
        state: {
          site: data.site,
          supervisorType: "existing",
        },
      });
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to connect to the SMSYS backend.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="create-site-page"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="create-site-panel">
        <header className="cs-header">
          <span className="cs-logo" aria-hidden="true">⛑️</span>
          <div className="cs-brand">
            <h2>SMSYS</h2>
            <p>SMART MONITORING SYSTEM</p>
          </div>
        </header>

        <div className="cs-title">
          <h1>Site Creation</h1>
          <p>Enter the new site information for an existing supervisor.</p>
        </div>

        <div className="cs-card">
          <label className="cs-label" htmlFor="existing-site-name">
            Site Name
          </label>
          <div className="cs-input">
            <span aria-hidden="true">🏢</span>
            <input
              id="existing-site-name"
              type="text"
              placeholder="Enter construction site name"
              value={siteName}
              onChange={(event) => setSiteName(event.target.value)}
              disabled={isSubmitting}
              autoComplete="organization"
            />
          </div>

          <label className="cs-label" htmlFor="existing-site-location">
            Site Location
          </label>
          <div className="cs-input">
            <span aria-hidden="true">📍</span>
            <input
              id="existing-site-location"
              type="text"
              placeholder="Enter site location"
              value={siteLocation}
              onChange={(event) => setSiteLocation(event.target.value)}
              disabled={isSubmitting}
              autoComplete="street-address"
            />
          </div>

          <label className="cs-label" htmlFor="existing-supervisor-name">
            Supervisor Full Name
          </label>
          <div className="cs-input">
            <span aria-hidden="true">👤</span>
            <input
              id="existing-supervisor-name"
              type="text"
              placeholder="Enter registered supervisor full name"
              value={supervisorName}
              onChange={(event) => setSupervisorName(event.target.value)}
              disabled={isSubmitting}
              autoComplete="name"
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
            type="button"
            className="cs-confirm-btn"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "CREATING SITE..." : "✓ CONFIRM"}
          </button>

          <button
            type="button"
            className="cs-back-btn"
            onClick={() => navigate("/site-access")}
            disabled={isSubmitting}
          >
            ◀ BACK TO SITE ACCESS
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateSiteExisiting;
