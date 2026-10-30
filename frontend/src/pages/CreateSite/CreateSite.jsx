import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./CreateSite.css";

import bgImage from "../../assets/images/landing-page-background.jpg";
import hardhatLogo from "../../assets/images/hardhat_logo.jpg";


function CreateSite() {
  const navigate = useNavigate();


  // =========================
  // FORM DATA
  // =========================

  const [siteName, setSiteName] = useState("");

  const [province, setProvince] = useState("");

  const [municipalityCity, setMunicipalityCity] = useState("");

  const [barangay, setBarangay] = useState("");

  const [supervisorName, setSupervisorName] = useState("");


  // =========================
  // STATUS
  // =========================

  const [error, setError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);


  // =========================
  // CREATE SITE
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
      setError(
        "Please enter the municipality or city."
      );

      return;
    }


    if (!barangay.trim()) {
      setError("Please enter the barangay.");
      return;
    }


    if (!supervisorName.trim()) {
      setError(
        "Please enter the supervisor full name."
      );

      return;
    }


    try {
      setIsSubmitting(true);


      // -------------------------
      // SEND TO FLASK
      // -------------------------

      const response = await fetch(
        "http://127.0.0.1:5000/api/sites/create",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            site_name: siteName.trim(),

            province: province.trim(),

            municipality_city:
              municipalityCity.trim(),

            barangay: barangay.trim(),

            supervisor_name:
              supervisorName.trim(),
          }),
        }
      );


      const data = await response.json();


      // -------------------------
      // CREATION FAILED
      // -------------------------

      if (!response.ok || !data.success) {
        setError(
          data.message ||
          "Failed to create site."
        );

        return;
      }


      // -------------------------
      // SITE CREATED
      // -------------------------

      navigate(
        "/site-created",
        {
          replace: true,

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
      setIsSubmitting(false);
    }
  };


  // =========================
  // PAGE
  // =========================

  return (
    <div
      className="create-site-page"
      style={{
        backgroundImage: `url(${bgImage})`,
      }}
    >
      <div className="create-site-panel">


        {/* =========================
            HEADER
        ========================= */}

        <header className="cs-header">

          <img
            src={hardhatLogo}
            alt="SMSYS Smart Hardhat Logo"
            className="cs-logo"
          />


          <div className="cs-brand">

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

        <div className="cs-title">

          <h1>
            Site Creation
          </h1>

          <p>
            Enter site information below to create a new site.
          </p>

        </div>


        {/* =========================
            FORM
        ========================= */}

        <div className="cs-card">


          {/* SITE NAME */}

          <label className="cs-label">
            Site Name
          </label>

          <div className="cs-input">

            <span>
              🏢
            </span>

            <input
              type="text"
              placeholder="Enter construction site name"
              value={siteName}
              onChange={(e) =>
                setSiteName(e.target.value)
              }
              disabled={isSubmitting}
            />

          </div>


          {/* PROVINCE */}

          <label className="cs-label">
            Province
          </label>

          <div className="cs-input">

            <span>
              📍
            </span>

            <input
              type="text"
              placeholder="Example: Laguna"
              value={province}
              onChange={(e) =>
                setProvince(e.target.value)
              }
              disabled={isSubmitting}
            />

          </div>


          {/* MUNICIPALITY / CITY */}

          <label className="cs-label">
            Municipality / City
          </label>

          <div className="cs-input">

            <span>
              🏙️
            </span>

            <input
              type="text"
              placeholder="Example: San Pablo City"
              value={municipalityCity}
              onChange={(e) =>
                setMunicipalityCity(
                  e.target.value
                )
              }
              disabled={isSubmitting}
            />

          </div>


          {/* BARANGAY */}

          <label className="cs-label">
            Barangay
          </label>

          <div className="cs-input">

            <span>
              📌
            </span>

            <input
              type="text"
              placeholder="Example: San Roque"
              value={barangay}
              onChange={(e) =>
                setBarangay(e.target.value)
              }
              disabled={isSubmitting}
            />

          </div>


          {/* SUPERVISOR FULL NAME */}

          <label className="cs-label">
            Supervisor Full Name
          </label>

          <div className="cs-input">

            <span>
              👤
            </span>

            <input
              type="text"
              placeholder="Enter your full name"
              value={supervisorName}
              onChange={(e) =>
                setSupervisorName(
                  e.target.value
                )
              }
              disabled={isSubmitting}
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


          {/* CONFIRM */}

          <button
            type="button"
            className="cs-confirm-btn"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {
              isSubmitting
                ? "CREATING SITE..."
                : "✓ CONFIRM"
            }
          </button>


          {/* BACK */}

          <button
            type="button"
            className="cs-back-btn"
            onClick={() =>
              navigate("/site-access")
            }
            disabled={isSubmitting}
          >
            ◀ BACK TO SITE ACCESS
          </button>

        </div>

      </div>
    </div>
  );
}


export default CreateSite;