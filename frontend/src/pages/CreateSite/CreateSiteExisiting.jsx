import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./CreateSite.css";
import bgImage from "../../assets/images/landing-page-background.jpg";

function CreateSiteExisiting() {
  const navigate = useNavigate();

  // =========================
  // FORM DATA
  // =========================

  const [siteName, setSiteName] = useState("");
  const [province, setProvince] = useState("");
  const [municipalityCity, setMunicipalityCity] = useState("");
  const [barangay, setBarangay] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [supervisorPin, setSupervisorPin] = useState("");

  // =========================
  // STATUS
  // =========================

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // =========================
  // CREATE SITE FOR EXISTING SUPERVISOR
  // =========================

  const handleConfirm = async () => {
    setError("");

    // -------------------------
    // VALIDATION
    // -------------------------

    if (!siteName.trim()) {
      setError("Please enter the site name.");
      return;
    }

    if (!province.trim()) {
      setError("Please enter the province.");
      return;
    }

    if (!municipalityCity.trim()) {
      setError("Please enter the municipality or city.");
      return;
    }

    if (!barangay.trim()) {
      setError("Please enter the barangay.");
      return;
    }

    if (!supervisorName.trim()) {
      setError("Please enter the supervisor full name.");
      return;
    }

    if (!/^\d{6}$/.test(supervisorPin)) {
      setError("Please enter your existing 6-digit Supervisor PIN.");
      return;
    }

    try {
      setIsSubmitting(true);

      // -------------------------
      // SEND TO FLASK
      // -------------------------

      const response = await fetch(
        "http://127.0.0.1:5000/api/sites/create-existing",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            site_name: siteName.trim(),
            province: province.trim(),
            municipality_city: municipalityCity.trim(),
            barangay: barangay.trim(),
            supervisor_name: supervisorName.trim(),
            supervisor_pin: supervisorPin,
          }),
        }
      );

      const data = await response.json();

      // -------------------------
      // CREATION FAILED
      // -------------------------

      if (!response.ok || !data.success || !data.site) {
        setError(data.message || "Failed to create the site.");
        return;
      }

      // -------------------------
      // SITE CREATED
      // -------------------------

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

  // =========================
  // PAGE
  // =========================

  return (
    <div
      className="create-site-page"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="create-site-panel">
        {/* HEADER */}
        <header className="cs-header">
          <span className="cs-logo" aria-hidden="true">
            ⛑️
          </span>

          <div className="cs-brand">
            <h2>SMSYS</h2>
            <p>SMART MONITORING SYSTEM</p>
          </div>
        </header>

        {/* TITLE */}
        <div className="cs-title">
          <h1>Site Creation</h1>
          <p>
            Enter the new site information for an existing supervisor.
          </p>
        </div>

        {/* FORM */}
        <div className="cs-card">
          {/* SITE NAME */}
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
            />
          </div>

          {/* PROVINCE */}
          <label className="cs-label" htmlFor="existing-site-province">
            Province
          </label>
          <div className="cs-input">
            <span aria-hidden="true">📍</span>
            <input
              id="existing-site-province"
              type="text"
              placeholder="Example: Laguna"
              value={province}
              onChange={(event) => setProvince(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* MUNICIPALITY / CITY */}
          <label className="cs-label" htmlFor="existing-site-municipality">
            Municipality / City
          </label>
          <div className="cs-input">
            <span aria-hidden="true">🏙️</span>
            <input
              id="existing-site-municipality"
              type="text"
              placeholder="Example: San Pablo City"
              value={municipalityCity}
              onChange={(event) => setMunicipalityCity(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* BARANGAY */}
          <label className="cs-label" htmlFor="existing-site-barangay">
            Barangay
          </label>
          <div className="cs-input">
            <span aria-hidden="true">📌</span>
            <input
              id="existing-site-barangay"
              type="text"
              placeholder="Example: San Roque"
              value={barangay}
              onChange={(event) => setBarangay(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* SUPERVISOR FULL NAME */}
          <label className="cs-label" htmlFor="existing-supervisor-name">
            Supervisor Full Name
          </label>
          <div className="cs-input">
            <span aria-hidden="true">👤</span>
            <input
              id="existing-supervisor-name"
              type="text"
              placeholder="Enter your registered full name"
              value={supervisorName}
              onChange={(event) => setSupervisorName(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* EXISTING SUPERVISOR PIN */}
          <label className="cs-label" htmlFor="existing-supervisor-pin">
            Supervisor PIN
          </label>
          <div className="cs-input">
            <span aria-hidden="true">🔐</span>
            <input
              id="existing-supervisor-pin"
              type="password"
              placeholder="Enter your existing 6-digit PIN"
              value={supervisorPin}
              onChange={(event) =>
                setSupervisorPin(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              maxLength={6}
              autoComplete="off"
              disabled={isSubmitting}
            />
          </div>

          {/* ERROR */}
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

          {/* CONFIRM */}
          <button
            type="button"
            className="cs-confirm-btn"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "CREATING SITE..." : "✓ CONFIRM"}
          </button>

          {/* BACK */}
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
