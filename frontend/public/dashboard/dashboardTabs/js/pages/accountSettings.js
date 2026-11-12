
import { API_BASE } from "../shared/config.js";
import {
    getAuthHeaders,
    redirectToSiteAccess
} from "../shared/auth.js";

if (document.body.dataset.active === "account") {
    const form = document.querySelector(".pin-form");

    const currentPinInput = document.getElementById("current-pin");
    const newPinInput = document.getElementById("new-pin");
    const confirmPinInput = document.getElementById("confirm-pin");

    const submitButton = form?.querySelector(
        'button[type="submit"]'
    );

    if (form && currentPinInput && newPinInput && confirmPinInput) {

        // ========================================================
        // PIN INPUT SETTINGS
        // ========================================================

        const pinInputs = [
            currentPinInput,
            newPinInput,
            confirmPinInput
        ];

        pinInputs.forEach((input) => {
            input.setAttribute("inputmode", "numeric");
            input.setAttribute("maxlength", "6");
            input.setAttribute("pattern", "[0-9]{6}");
        });

        // ========================================================
        // SHOW / HIDE PIN
        // ========================================================

        const eyeIcons = form.querySelectorAll(".pin-icon-end");

        eyeIcons.forEach((eyeIcon) => {
            const pinField = eyeIcon.closest(".pin-field");
            const pinInput = pinField?.querySelector("input");

            if (!pinInput) return;

            // Make the existing eye icon interactive.
            eyeIcon.style.cursor = "pointer";
            eyeIcon.style.pointerEvents = "auto";
            eyeIcon.setAttribute("role", "button");
            eyeIcon.setAttribute("tabindex", "0");
            eyeIcon.setAttribute("aria-label", "Show PIN");
            eyeIcon.setAttribute("aria-pressed", "false");

            function togglePinVisibility() {
                const isHidden = pinInput.type === "password";

                pinInput.type = isHidden ? "text" : "password";

                eyeIcon.setAttribute(
                    "aria-label",
                    isHidden ? "Hide PIN" : "Show PIN"
                );

                eyeIcon.setAttribute(
                    "aria-pressed",
                    isHidden ? "true" : "false"
                );
            }

            // Mouse / touchscreen click.
            eyeIcon.addEventListener("click", (event) => {
                event.preventDefault();
                togglePinVisibility();
            });

            // Keyboard support.
            eyeIcon.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    togglePinVisibility();
                }
            });
        });

        // ========================================================
        // STATUS MESSAGE
        // ========================================================

        const message = document.createElement("p");

        message.id = "pin-message";
        message.setAttribute("role", "status");
        message.setAttribute("aria-live", "polite");

        message.style.display = "none";
        message.style.margin = "12px 0";
        message.style.fontSize = "13px";
        message.style.fontWeight = "500";
        message.style.lineHeight = "1.5";

        form.parentNode.insertBefore(message, form);

        function showMessage(text, type = "error") {
            message.textContent = text;
            message.style.display = "block";

            if (type === "success") {
                message.style.color = "#16a34a";
            } else {
                message.style.color = "#dc2626";
            }
        }

        function clearMessage() {
            message.textContent = "";
            message.style.display = "none";
        }

        // ========================================================
        // FORM SUBMISSION
        // ========================================================

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            clearMessage();

            const currentPin = currentPinInput.value.trim();
            const newPin = newPinInput.value.trim();
            const confirmPin = confirmPinInput.value.trim();

            // Check supervisor session.
            const token = sessionStorage.getItem(
                "smsys_access_token"
            );

            if (!token) {
                redirectToSiteAccess();
                return;
            }

            // Validate PIN format.
            if (
                !/^\d{6}$/.test(currentPin) ||
                !/^\d{6}$/.test(newPin) ||
                !/^\d{6}$/.test(confirmPin)
            ) {
                showMessage(
                    "All PIN fields must contain exactly 6 digits."
                );
                return;
            }

            // Check new PIN confirmation.
            if (newPin !== confirmPin) {
                showMessage(
                    "New PIN and confirmation PIN do not match."
                );
                confirmPinInput.focus();
                return;
            }

            // Check whether the new PIN differs.
            if (currentPin === newPin) {
                showMessage(
                    "New PIN must be different from the current PIN."
                );
                newPinInput.focus();
                return;
            }

            // Prevent repeated submissions.
            submitButton.disabled = true;
            submitButton.setAttribute("aria-busy", "true");

            try {
                const response = await fetch(
                    `${API_BASE}/api/account/change-pin`,
                    {
                        method: "POST",
                        headers: {
                            ...getAuthHeaders(),
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            current_pin: currentPin,
                            new_pin: newPin
                        })
                    }
                );

                const result = await response.json();

                // Session expired or invalid.
                if (response.status === 401) {
                    showMessage(
                        "Your session has expired. Please log in again."
                    );

                    redirectToSiteAccess();
                    return;
                }

                if (!response.ok || !result.success) {
                    showMessage(
                        result.message ||
                        "Unable to update your supervisor PIN."
                    );
                    return;
                }

                // Successful PIN update.
                showMessage(
                    result.message ||
                    "Supervisor PIN updated successfully.",
                    "success"
                );

                form.reset();

                // Ensure PIN fields return to hidden state.
                pinInputs.forEach((input) => {
                    input.type = "password";
                });

                eyeIcons.forEach((eyeIcon) => {
                    eyeIcon.setAttribute("aria-label", "Show PIN");
                    eyeIcon.setAttribute("aria-pressed", "false");
                });

            } catch (error) {
                console.error(
                    "Account Settings Error:",
                    error
                );

                showMessage(
                    "Unable to connect to the backend. Please check your connection."
                );

            } finally {
                submitButton.disabled = false;
                submitButton.removeAttribute("aria-busy");
            }
        });

        // ========================================================
        // CLEAR MESSAGE WHEN USER EDITS THE FORM
        // ========================================================

        pinInputs.forEach((input) => {
            input.addEventListener("input", clearMessage);
        });
    }
}
