import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./Site.css";
import "./CreateSiteModal.css";

import bgImage from "../../assets/images/landing-page-background.jpg";
import hardhatLogo from "../../assets/images/hardhat_logo.jpg";

function Site() {
  const navigate = useNavigate();

  // =========================
  // FORM DATA
  // =========================
  const [siteName, setSiteName] = useState("");
  const [siteCode, setSiteCode] = useState("");
  const [supervisorPin, setSupervisorPin] = useState("");

  // =========================
  // STATUS
  // =========================
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // =========================
  // CREATE SITE MODAL
  // =========================
  const [isCreateSiteModalOpen, setIsCreateSiteModalOpen] = useState(false);
  const [selectedSupervisorType, setSelectedSupervisorType] = useState("");

  const openCreateSiteModal = () => {
    setSelectedSupervisorType("");
    setIsCreateSiteModalOpen(true);
  };

  const closeCreateSiteModal = () => {
    setIsCreateSiteModalOpen(false);
    setSelectedSupervisorType("");
  };

  const handleContinueCreateSite = () => {
    if (!selectedSupervisorType) return;

    const destination = selectedSupervisorType === "existing"
      ? "/create-site-existing"
      : "/create-site";

    closeCreateSiteModal();
    navigate(destination);
  };

  useEffect(() => {
    if (!isCreateSiteModalOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeCreateSiteModal();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isCreateSiteModalOpen]);

  // =========================
  // VERIFY SITE
  // =========================
  const handleVerify = async () => {
    setError("");

    if (!siteName.trim()) {
      setError("Please enter the site name.");
      return;
    }

    if (!siteCode.trim()) {
      setError("Please enter the site code.");
      return;
    }

    if (!supervisorPin.trim()) {
      setError("Please enter the supervisor PIN.");
      return;
    }

    try {
      setIsVerifying(true);

      const response = await fetch(
        "http://127.0.0.1:5000/api/sites/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            site_name: siteName.trim(),
            site_code: siteCode.trim(),
            supervisor_pin: supervisorPin.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success || !data.site) {
        setError(data.message || "Invalid site information.");
        return;
      }

      navigate("/verify", {
        state: {
          site: data.site,
        },
      });
    } catch (error) {
      console.error(error);
      setError("Unable to connect to the SMSYS backend.");
    } finally {
      setIsVerifying(false);
    }
  };

  // =========================
  // PAGE
  // =========================
  return (
    <div
      className="site-page"
      style={{
        backgroundImage: `url(${bgImage})`,
      }}
    >
      <div className="site-panel">
        {/* HEADER */}
        <header className="site-header">
          <img
            src={hardhatLogo}
            alt="Smart Hardhat Logo"
            className="site-logo"
          />

          <div className="site-brand">
            <h2>SMSYS</h2>
            <p>SMART MONITORING SYSTEM</p>
          </div>
        </header>

        {/* TITLE */}
        <div className="site-title">
          <h1>Construction Site Access</h1>
          <p>
            Enter your site information to access the monitoring system.
          </p>
        </div>

        {/* SITE ACCESS CARD */}
        <div className="site-card">
          {/* SITE NAME */}
          <label>Site Name</label>

          <div className="site-input">
            <span>🏢</span>
            <input
              type="text"
              placeholder="Enter construction site name"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              disabled={isVerifying}
            />
          </div>

          {/* SITE CODE */}
          <label>Site Code</label>

          <div className="site-input">
            <span>🔒</span>
            <input
              type="text"
              placeholder="Enter site code"
              value={siteCode}
              onChange={(e) => setSiteCode(e.target.value)}
              disabled={isVerifying}
            />
          </div>

          {/* SUPERVISOR PIN */}
          <label>Supervisor PIN</label>

          <div className="site-input">
            <span>🔑</span>
            <input
              type="password"
              placeholder="Enter supervisor PIN"
              value={supervisorPin}
              onChange={(e) => setSupervisorPin(e.target.value)}
              disabled={isVerifying}
            />
          </div>

          {/* ERROR */}
          {error && (
            <p
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

          {/* VERIFY */}
          <button
            type="button"
            className="verify-btn"
            onClick={handleVerify}
            disabled={isVerifying}
          >
            {isVerifying ? "VERIFYING..." : "✓ VERIFY"}
          </button>

          {/* DIVIDER */}
          <div className="site-divider">
            <span></span>
            <p>OR</p>
            <span></span>
          </div>

          {/* CREATE NEW SITE */}
          <button
            type="button"
            className="create-site-btn"
            onClick={openCreateSiteModal}
            disabled={isVerifying}
          >
            🏢 CREATE NEW SITE
          </button>
        </div>
      </div>

      {/* CREATE NEW SITE MODAL */}
      {isCreateSiteModalOpen && (
        <div
          className="create-site-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateSiteModal();
            }
          }}
        >
          <section
            className="create-site-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-site-modal-title"
          >
            <button
              type="button"
              className="create-site-modal__close"
              onClick={closeCreateSiteModal}
              aria-label="Close create site options"
            >
              ×
            </button>

            <div className="create-site-modal__icon" aria-hidden="true">
              🏢
            </div>

            <p className="create-site-modal__eyebrow">NEW CONSTRUCTION SITE</p>
            <h2 id="create-site-modal-title">Create New Site</h2>
            <p className="create-site-modal__description">
              Choose the type of supervisor for this construction site.
            </p>

            <div className="create-site-modal__options">
              <button
                type="button"
                className={`create-site-option ${
                  selectedSupervisorType === "existing"
                    ? "create-site-option--selected"
                    : ""
                }`}
                onClick={() => setSelectedSupervisorType("existing")}
                aria-pressed={selectedSupervisorType === "existing"}
              >
                <span className="create-site-option__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="10" cy="7" r="4" />
                    <path d="M20 8v6M23 11h-6" />
                  </svg>
                </span>

                <span className="create-site-option__text">
                  <strong>Existing Supervisor</strong>
                  <small>Use a supervisor already registered in SMSYS.</small>
                </span>

                <span className="create-site-option__radio" aria-hidden="true">
                  {selectedSupervisorType === "existing" ? "✓" : ""}
                </span>
              </button>

              <button
                type="button"
                className={`create-site-option ${
                  selectedSupervisorType === "new"
                    ? "create-site-option--selected"
                    : ""
                }`}
                onClick={() => setSelectedSupervisorType("new")}
                aria-pressed={selectedSupervisorType === "new"}
              >
                <span className="create-site-option__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img">
                    <circle cx="9" cy="7" r="4" />
                    <path d="M2 21v-2a7 7 0 0 1 14 0v2M19 8v6M22 11h-6" />
                  </svg>
                </span>

                <span className="create-site-option__text">
                  <strong>New Supervisor</strong>
                  <small>Register a new supervisor for this site.</small>
                </span>

                <span className="create-site-option__radio" aria-hidden="true">
                  {selectedSupervisorType === "new" ? "✓" : ""}
                </span>
              </button>
            </div>

            {selectedSupervisorType && (
              <p className="create-site-modal__selection" aria-live="polite">
                <span aria-hidden="true">✓</span>
                {selectedSupervisorType === "existing"
                  ? "Existing Supervisor selected"
                  : "New Supervisor selected"}
              </p>
            )}

            <button
              type="button"
              className="create-site-modal__continue"
              onClick={handleContinueCreateSite}
              disabled={!selectedSupervisorType}
            >
              CONTINUE
              <span aria-hidden="true">→</span>
            </button>

            <p className="create-site-modal__note" aria-live="polite">
              {selectedSupervisorType === "new"
                ? "Continue to the new supervisor site form."
                : selectedSupervisorType === "existing"
                  ? "Continue to the existing supervisor site form."
                  : "Select a supervisor type to continue."}
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

export default Site;
