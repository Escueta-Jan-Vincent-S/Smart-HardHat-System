import { useState } from "react";
import bgImage from "../../assets/images/landing-page-background.jpg";
import "../Site/Site.css";
import "./WorkerLogin.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

function HardhatIcon({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Hardhat"
      fill="none"
    >
      <path
        d="M8 39.5h48l-4.5-9.2a20.7 20.7 0 0 0-40 0L8 39.5Z"
        fill="#FEAF1C"
        stroke="#FFE09A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M32 10v20M21.5 13.5l3.2 17M42.5 13.5l-3.2 17M6 40h52v7.5a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5V40Z"
        stroke="#FEAF1C"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11 45h42" stroke="#6D4200" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="m5 12.5 4.2 4.2L19.5 6.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ isOpen }) {
  return (
    <svg
      className={`worker-picker__arrow ${isOpen ? "is-open" : ""}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WorkerLogin() {
  const [fullName, setFullName] = useState("");
  const [siteCode, setSiteCode] = useState("");
  const [hardhats, setHardhats] = useState([]);
  const [selectedHardhat, setSelectedHardhat] = useState("");
  const [site, setSite] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(true);
  const [isLoadingHardhats, setIsLoadingHardhats] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [hasLoadedHardhats, setHasLoadedHardhats] = useState(false);

  const clearLoadedSite = () => {
    setHardhats([]);
    setSelectedHardhat("");
    setSite(null);
    setHasLoadedHardhats(false);
    setSuccess(null);
    setError("");
  };

  const loadHardhats = async ({ keepMessages = false } = {}) => {
    const cleanSiteCode = siteCode.trim();

    if (!cleanSiteCode) {
      if (!keepMessages) setError("Please enter the Site Code first.");
      return;
    }

    setIsLoadingHardhats(true);
    if (!keepMessages) {
      setError("");
      setSuccess(null);
    }

    try {
      const query = new URLSearchParams({ site_code: cleanSiteCode });
      if (fullName.trim()) query.set("full_name", fullName.trim());

      const response = await fetch(
        `${API_BASE}/api/workers/available-hardhats?${query.toString()}`,
        { headers: { Accept: "application/json" } }
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        setHardhats([]);
        setSite(null);
        setHasLoadedHardhats(false);
        if (!keepMessages) {
          setError(data.message || "Unable to load Smart Hardhats for this site.");
        }
        return;
      }

      const returnedHardhats = Array.isArray(data.hardhats) ? data.hardhats : [];
      setHardhats(returnedHardhats);
      setSite(data.site || null);
      setHasLoadedHardhats(true);

      setSelectedHardhat((current) => {
        const stillSelectable = returnedHardhats.some(
          (hardhat) => hardhat.device_code === current && hardhat.is_available
        );
        return stillSelectable ? current : "";
      });

    } catch (requestError) {
      console.error("Could not load Smart Hardhats:", requestError);
      setHardhats([]);
      setSite(null);
      setHasLoadedHardhats(false);
      if (!keepMessages) {
        setError("Unable to connect to the SMSYS backend. Check that Flask is running.");
      }
    } finally {
      setIsLoadingHardhats(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess(null);

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!siteCode.trim()) {
      setError("Please enter the Site Code.");
      return;
    }

    if (!hasLoadedHardhats) {
      setError("Please load the Smart Hardhat list by leaving the Site Code or Full Name field.");
      return;
    }

    if (!selectedHardhat) {
      setError("Please select an available Smart Hardhat.");
      return;
    }

    const chosenHardhat = hardhats.find(
      (hardhat) => hardhat.device_code === selectedHardhat
    );

    if (!chosenHardhat || !chosenHardhat.is_available) {
      setError("That Smart Hardhat is no longer available. Refresh the list and select another one.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/workers/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          site_code: siteCode.trim(),
          hardhat_code: selectedHardhat,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Unable to confirm worker login.");
        await loadHardhats({ keepMessages: true });
        return;
      }

      setSuccess({
        message: data.message || "Worker confirmed successfully.",
        workerName: data.worker?.full_name || fullName.trim(),
        siteName: data.site?.site_name || site?.site_name || "",
        hardhatCode: data.hardhat?.device_code || selectedHardhat,
      });

      await loadHardhats({ keepMessages: true });
    } catch (requestError) {
      console.error("Worker login failed:", requestError);
      setError("Unable to connect to the SMSYS backend. Check that Flask is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      className="site-page worker-site-page"
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
          <h1>Worker Page</h1>
          <p>Please enter your name and select an available Smart Hardhat.</p>
        </div>

        <form className="site-card worker-login-card" onSubmit={handleSubmit}>
          <div className="worker-field">
            <label htmlFor="worker-full-name">Full Name</label>
            <div className="site-input">
              <span aria-hidden="true">👤</span>
              <input
                id="worker-full-name"
                type="text"
                placeholder="Enter your full name"
                autoComplete="name"
                value={fullName}
                required
                disabled={isSubmitting}
                onChange={(event) => {
                  setFullName(event.target.value);
                  setHardhats([]);
                  setSelectedHardhat("");
                  setSite(null);
                  setHasLoadedHardhats(false);
                  setSuccess(null);
                  setError("");
                }}
                onBlur={() => {
                  if (siteCode.trim()) loadHardhats();
                }}
              />
            </div>
          </div>

          <div className="worker-field">
            <label htmlFor="worker-site-code">Site Code</label>
            <div className="site-input">
              <span aria-hidden="true">🔒</span>
              <input
                id="worker-site-code"
                type="text"
                placeholder="Enter site code"
                autoComplete="off"
                value={siteCode}
                required
                disabled={isSubmitting}
                onChange={(event) => {
                  setSiteCode(event.target.value);
                  clearLoadedSite();
                }}
                onBlur={() => loadHardhats()}
              />
            </div>
          </div>

          <fieldset className="worker-field worker-hardhat-field">
            <legend className="worker-field__label">Select Available Smart Hardhat</legend>

            <div className="worker-picker">
              <button
                className="worker-picker__header"
                type="button"
                aria-expanded={pickerOpen}
                onClick={() => setPickerOpen((open) => !open)}
              >
                <HardhatIcon className="worker-picker__icon" />
                <span>{selectedHardhat || "Choose a hardhat"}</span>
                <ChevronIcon isOpen={pickerOpen} />
              </button>

              {pickerOpen && (
                <div className="worker-picker__list">
                  {isLoadingHardhats ? (
                    <p className="worker-picker__message">Loading Smart Hardhats...</p>
                  ) : !hasLoadedHardhats ? (
                    <p className="worker-picker__message">
                      Enter your Site Code, then move to the next field to load the list.
                    </p>
                  ) : hardhats.length === 0 ? (
                    <p className="worker-picker__message">
                      No Smart Hardhats are registered for this site yet.
                    </p>
                  ) : (
                    hardhats.map((hardhat) => {
                      const statusClass = hardhat.assigned_to_current_worker
                        ? "worker-option__status--mine"
                        : hardhat.is_available
                          ? "worker-option__status--available"
                          : "worker-option__status--in-use";

                      return (
                        <label
                          className={[
                            "worker-option",
                            !hardhat.is_available ? "worker-option--disabled" : "",
                            selectedHardhat === hardhat.device_code ? "worker-option--selected" : "",
                          ].filter(Boolean).join(" ")}
                          key={hardhat.id}
                        >
                          <input
                            className="worker-option__radio"
                            type="radio"
                            name="hardhat"
                            value={hardhat.device_code}
                            checked={selectedHardhat === hardhat.device_code}
                            disabled={!hardhat.is_available || isSubmitting}
                            onChange={() => {
                              setSelectedHardhat(hardhat.device_code);
                              setError("");
                              setSuccess(null);
                            }}
                            required
                          />
                          <span
                            className={`worker-option__dot ${hardhat.is_available ? "is-available" : "is-in-use"}`}
                            aria-hidden="true"
                          />
                          <span className="worker-option__id">{hardhat.device_code}</span>
                          <span className={`worker-option__status ${statusClass}`}>
                            {hardhat.display_status || (hardhat.is_available ? "Available" : "In Use")}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            {site && <p className="worker-site-note">Site: {site.site_name}</p>}
          </fieldset>

          {error && (
            <p className="worker-feedback worker-feedback--error" role="alert">
              {error}
            </p>
          )}

          {success && (
            <div className="worker-feedback worker-feedback--success" role="status" aria-live="polite">
              <span className="worker-feedback__check" aria-hidden="true">
                <CheckIcon />
              </span>
              <div>
                <strong>{success.message}</strong>
                <p>{success.workerName} · {success.hardhatCode}</p>
                {success.siteName && <p>{success.siteName}</p>}
              </div>
            </div>
          )}

          <button
            className="verify-btn worker-confirm-btn"
            type="submit"
            disabled={isSubmitting || isLoadingHardhats}
          >
            <CheckIcon />
            {isSubmitting ? "CONFIRMING..." : "CONFIRM"}
          </button>

          <button
            className="worker-refresh-btn"
            type="button"
            disabled={isLoadingHardhats || isSubmitting || !siteCode.trim()}
            onClick={() => loadHardhats()}
          >
            Refresh Smart Hardhat List
          </button>
        </form>
      </div>
    </main>
  );
}

export default WorkerLogin;
