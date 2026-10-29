import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./Site.css";

import bgImage from "../../assets/images/landing-page-background.jpg";


function Site() {

  const navigate = useNavigate();


  // =========================
  // FORM DATA
  // =========================

  const [siteName, setSiteName] =
    useState("");

  const [siteCode, setSiteCode] =
    useState("");

  const [supervisorPin, setSupervisorPin] =
    useState("");


  // =========================
  // STATUS
  // =========================

  const [error, setError] =
    useState("");

  const [isVerifying, setIsVerifying] =
    useState(false);


  // =========================
  // VERIFY SITE
  // =========================

  const handleVerify = async () => {

    setError("");


    // -------------------------
    // FRONTEND VALIDATION
    // -------------------------

    if (!siteName.trim()) {

      setError(
        "Please enter the site name."
      );

      return;
    }


    if (!siteCode.trim()) {

      setError(
        "Please enter the site code."
      );

      return;
    }


    if (!supervisorPin.trim()) {

      setError(
        "Please enter the supervisor PIN."
      );

      return;
    }


    try {

      setIsVerifying(true);


      // -------------------------
      // SEND TO FLASK
      // -------------------------

      const response = await fetch(
        "http://127.0.0.1:5000/api/sites/verify",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            site_name: siteName,
            site_code: siteCode,
            supervisor_pin: supervisorPin,
          }),
        }
      );


      const data =
        await response.json();


      // -------------------------
      // INVALID SITE
      // -------------------------

      if (
        !response.ok ||
        !data.success
      ) {

        setError(
          data.message ||
          "Invalid site information."
        );

        return;
      }


      // -------------------------
      // SITE VERIFIED
      // -------------------------

      navigate(
        "/dashboard",
        {
          state: {
            site: data.site,
          },
        }
      );


    } catch (error) {

      console.error(error);

      setError(
        "Unable to connect to the SMSYS backend."
      );


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
        backgroundImage:
          `url(${bgImage})`,
      }}
    >

      <div className="site-panel">


        {/* =========================
            HEADER
        ========================= */}

        <header className="site-header">

          <span className="site-logo">
            ⛑️
          </span>


          <div className="site-brand">

            <h2>
              SMSYS
            </h2>

            <p>
              SMART MONITORING SYSTEM
            </p>

          </div>

        </header>


        {/* =========================
            TITLE
        ========================= */}

        <div className="site-title">

          <h1>
            Construction Site Access
          </h1>

          <p>
            Enter your site information
            to access the monitoring system.
          </p>

        </div>


        {/* =========================
            SITE ACCESS CARD
        ========================= */}

        <div className="site-card">


          {/* SITE NAME */}

          <label>
            Site Name
          </label>

          <div className="site-input">

            <span>
              🏢
            </span>

            <input
              type="text"
              placeholder="Enter construction site name"
              value={siteName}
              onChange={(e) =>
                setSiteName(
                  e.target.value
                )
              }
              disabled={isVerifying}
            />

          </div>


          {/* SITE CODE */}

          <label>
            Site Code
          </label>

          <div className="site-input">

            <span>
              🔒
            </span>

            <input
              type="text"
              placeholder="Enter site code"
              value={siteCode}
              onChange={(e) =>
                setSiteCode(
                  e.target.value
                )
              }
              disabled={isVerifying}
            />

          </div>


          {/* SUPERVISOR PIN */}

          <label>
            Supervisor PIN
          </label>

          <div className="site-input">

            <span>
              🔑
            </span>

            <input
              type="password"
              placeholder="Enter supervisor PIN"
              value={supervisorPin}
              onChange={(e) =>
                setSupervisorPin(
                  e.target.value
                )
              }
              disabled={isVerifying}
            />

          </div>


          {/* ERROR */}

          {error && (

            <p
              style={{
                color: "#ff6b6b",
                fontSize: "13px",
                margin:
                  "14px 0 0",
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

            {
              isVerifying
                ? "VERIFYING..."
                : "✓ VERIFY"
            }

          </button>


          {/* =========================
              DIVIDER
          ========================= */}

          <div className="site-divider">

            <span></span>

            <p>
              OR
            </p>

            <span></span>

          </div>


          {/* =========================
              CREATE NEW SITE
          ========================= */}

          <button
            type="button"
            className="create-site-btn"
            onClick={() =>
              navigate(
                "/create-site"
              )
            }
            disabled={isVerifying}
          >

            🏢 CREATE NEW SITE

          </button>

        </div>

      </div>

    </div>

  );
}


export default Site;