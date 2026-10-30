import { useLocation, useNavigate } from "react-router-dom";

import bgImage from "../../assets/images/landing-page-background.jpg";
import hardhatLogo from "../../assets/images/hardhat_logo.jpg";

import "./verify.css";

function formatCreatedAt(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Verify() {
  const navigate = useNavigate();
  const { state } = useLocation();

  // Site.jsx passes the successful response from the Flask verification API.
  const site =
    state?.site ||
    state?.verifiedSite ||
    state?.data?.site ||
    (state?.site_name || state?.siteName ? state : null);

  const siteName = site?.site_name || site?.siteName || "";
  const siteCode = site?.site_code || site?.siteCode || "";
  const siteLocation = site?.site_location || site?.siteLocation || "";
  const supervisorName =
    site?.supervisor_name || site?.supervisorName || site?.full_name || "";
  const siteStatus = site?.status || "Existing";
  const createdAt = formatCreatedAt(site?.created_at || site?.createdAt);

  // Only show success when the backend returned the verified site's name and code.
  const hasVerifiedSite = Boolean(
    String(siteName).trim() && String(siteCode).trim()
  );

  const returnToSite = () => {
    navigate("/site-access", { replace: true });
  };

  return (
    <main
      className="verify-page"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="verify-page__overlay" aria-hidden="true" />

      <section className="verify-content">
        <header className="verify-header">
          <img
            src={hardhatLogo}
            alt="SMSYS Smart Hardhat Logo"
            className="verify-header__logo"
          />

          <div className="verify-header__brand">
            <h2>SMSYS</h2>
            <p>SMART MONITORING SYSTEM</p>
          </div>
        </header>

        <section
          className={`verify-card ${
            hasVerifiedSite ? "verify-card--success" : "verify-card--error"
          }`}
          aria-live="polite"
        >
          {hasVerifiedSite ? (
            <>
              <div className="verify-result-icon" aria-hidden="true">
                ✓
              </div>

              <h1 className="verify-result-title">
                SITE VERIFIED SUCCESSFULLY!
              </h1>

              <p className="verify-description">
                The site information and supervisor credentials have been
                verified successfully.
              </p>

              <h2 className="verify-section-title">Site Information</h2>

              <dl className="verify-details">
                <div className="verify-detail-row">
                  <dt>Site Name:</dt>
                  <dd>{siteName || "—"}</dd>
                </div>

                <div className="verify-detail-row">
                  <dt>Site Code:</dt>
                  <dd>{siteCode || "—"}</dd>
                </div>

                {supervisorName && (
                  <div className="verify-detail-row">
                    <dt>Supervisor Full Name:</dt>
                    <dd>{supervisorName}</dd>
                  </div>
                )}

                <div className="verify-detail-row">
                  <dt>Site Location:</dt>
                  <dd>{siteLocation || "—"}</dd>
                </div>

                <div className="verify-detail-row">
                  <dt>Status:</dt>
                  <dd>{siteStatus}</dd>
                </div>

                <div className="verify-detail-row">
                  <dt>Created at:</dt>
                  <dd>{createdAt}</dd>
                </div>
              </dl>

              <p className="verify-security-note">
                The supervisor PIN is not displayed. Confirm to return to Site
                Access and verify another site or create a new one.
              </p>

              <button
                type="button"
                className="verify-confirm-btn"
                onClick={returnToSite}
              >
                ✓ CONFIRM
              </button>
            </>
          ) : (
            <>
              <div
                className="verify-result-icon verify-result-icon--error"
                aria-hidden="true"
              >
                !
              </div>

              <h1 className="verify-result-title verify-result-title--error">
                NO SITE INFORMATION FOUND
              </h1>

              <p className="verify-description">
                No verified site details were provided. Return to the Site
                Access page and try verifying the site again.
              </p>

              <button
                type="button"
                className="verify-confirm-btn"
                onClick={returnToSite}
              >
                ◀ BACK TO SITE ACCESS
              </button>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

export default Verify;