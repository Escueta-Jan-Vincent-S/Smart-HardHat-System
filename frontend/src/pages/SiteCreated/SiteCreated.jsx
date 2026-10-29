import { useLocation, useNavigate } from "react-router-dom";

import "./SiteCreated.css";

import bgImage from "../../assets/images/landing-page-background.jpg";


function SiteCreated() {
  const location = useLocation();
  const navigate = useNavigate();

  const site = location.state?.site;


  // =========================
  // NO SITE DATA
  // =========================

  if (!site) {
    return (
      <div className="site-created-missing">

        <div className="site-created-missing-card">

          <h2>
            No Site Information Found
          </h2>

          <p>
            Please create or select a construction site first.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/site-access",
                {
                  replace: true,
                }
              )
            }
          >
            BACK TO SITE ACCESS
          </button>

        </div>

      </div>
    );
  }


  // =========================
  // FORMAT CREATED DATE
  // =========================

  const formattedDate = new Date(
    site.created_at
  ).toLocaleString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  );


  // =========================
  // CONFIRM
  // =========================

  const handleConfirm = () => {
    navigate(
      "/site-access",
      {
        replace: true,
      }
    );
  };


  // =========================
  // PAGE
  // =========================

  return (
    <div
      className="site-created-page"
      style={{
        backgroundImage: `url(${bgImage})`,
      }}
    >

      <div className="site-created-overlay"></div>


      <main className="site-created-container">


        {/* =========================
            HEADER
        ========================= */}

        <header className="sc-header">

          <div className="sc-logo">
            👷
          </div>


          <div className="sc-brand">

            <h1>
              SMSYS
            </h1>

            <p>
              SMART MONITORING SYSTEM
            </p>

          </div>

        </header>


        {/* =========================
            SUCCESS CARD
        ========================= */}

        <section className="sc-card">


          <div className="sc-success-icon">
            ✓
          </div>


          <h2 className="sc-success-title">
            SITE CREATED SUCCESSFULLY!
          </h2>


          <p className="sc-information-title">
            Site Information
          </p>


          {/* =========================
              SITE INFORMATION
          ========================= */}

          <div className="sc-information">


            {/* SITE NAME */}

            <div className="sc-row">

              <div className="sc-label">
                Site Name:
              </div>

              <div className="sc-value">
                {site.site_name}
              </div>

            </div>


            {/* SITE CODE */}

            <div className="sc-row">

              <div className="sc-label">
                Site Code:
              </div>

              <div className="sc-value">
                {site.site_code}
              </div>

            </div>


            {/* SUPERVISOR NAME */}

            <div className="sc-row">

              <div className="sc-label">
                Supervisor Full Name:
              </div>

              <div className="sc-value">
                {site.supervisor_name}
              </div>

            </div>


            {/* SUPERVISOR PIN */}

            <div className="sc-row">

              <div className="sc-label">
                Supervisor PIN:
              </div>

              <div className="sc-value">
                {site.supervisor_pin}
              </div>

            </div>


            {/* SITE LOCATION */}

            <div className="sc-row">

              <div className="sc-label">
                Site Location:
              </div>

              <div className="sc-value">
                {site.site_location}
              </div>

            </div>


            {/* CREATED AT */}

            <div className="sc-row">

              <div className="sc-label">
                Created at:
              </div>

              <div className="sc-value">
                {formattedDate}
              </div>

            </div>

          </div>


          {/* =========================
              CONFIRM
          ========================= */}

          <button
            type="button"
            className="sc-confirm-btn"
            onClick={handleConfirm}
          >
            <span>
              ✓
            </span>

            CONFIRM
          </button>

        </section>

      </main>

    </div>
  );
}


export default SiteCreated;