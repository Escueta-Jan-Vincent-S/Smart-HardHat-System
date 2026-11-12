
from flask import jsonify, request


def register_account_settings_api(
    app,
    get_database,
    get_authenticated_supervisor,
):
    """Register the authenticated supervisor account settings endpoint."""

    @app.route("/api/account/change-pin", methods=["POST"])
    def change_supervisor_pin():
        connection = get_database()

        try:
            # Verify the active supervisor session.
            supervisor = get_authenticated_supervisor(connection)

            if supervisor is None:
                return jsonify({
                    "success": False,
                    "message": (
                        "Supervisor session is missing or expired. "
                        "Please log in again."
                    ),
                }), 401

            data = request.get_json(silent=True)

            if not data:
                return jsonify({
                    "success": False,
                    "message": "No data was received.",
                }), 400

            current_pin = str(data.get("current_pin", "")).strip()
            new_pin = str(data.get("new_pin", "")).strip()

            if not current_pin or not new_pin:
                return jsonify({
                    "success": False,
                    "message": "Current PIN and new PIN are required.",
                }), 400

            if not current_pin.isdigit() or len(current_pin) != 6:
                return jsonify({
                    "success": False,
                    "message": "Current PIN must contain exactly 6 digits.",
                }), 400

            if not new_pin.isdigit() or len(new_pin) != 6:
                return jsonify({
                    "success": False,
                    "message": "New PIN must contain exactly 6 digits.",
                }), 400

            if current_pin == new_pin:
                return jsonify({
                    "success": False,
                    "message": "New PIN must be different from the current PIN.",
                }), 400

            # Retrieve the authenticated supervisor's actual PIN.
            supervisor_record = connection.execute(
                """
                SELECT id, full_name, supervisor_pin
                FROM supervisors
                WHERE id = ?
                LIMIT 1
                """,
                (supervisor["supervisor_id"],),
            ).fetchone()

            if supervisor_record is None:
                return jsonify({
                    "success": False,
                    "message": "Supervisor account could not be found.",
                }), 404

            if supervisor_record["supervisor_pin"] != current_pin:
                return jsonify({
                    "success": False,
                    "message": "Current PIN is incorrect.",
                }), 400

            # Keep the PIN consistent across sites associated with
            # this supervisor identity, following the existing
            # full-name-based ownership model.
            connection.execute(
                """
                UPDATE supervisors
                SET supervisor_pin = ?
                WHERE LOWER(TRIM(full_name)) = LOWER(TRIM(?))
                """,
                (
                    new_pin,
                    supervisor_record["full_name"],
                ),
            )

            connection.commit()

            return jsonify({
                "success": True,
                "message": "Supervisor PIN updated successfully.",
            }), 200

        except Exception as error:
            connection.rollback()

            app.logger.exception(
                "Changing supervisor PIN failed: %s",
                error,
            )

            return jsonify({
                "success": False,
                "message": "Failed to update supervisor PIN.",
            }), 500

        finally:
            connection.close()
