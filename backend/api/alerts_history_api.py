
from datetime import datetime

from flask import jsonify, request


def register_alerts_history_api(
    app,
    get_database,
    get_authenticated_supervisor,
    get_owned_sites,
    get_owned_site_by_id,
):
    """Register the SQLite-backed Alerts History endpoint on the main Flask app."""

    @app.route("/api/dashboard/alerts-history", methods=["GET"])
    def dashboard_alerts_history():
        connection = get_database()

        try:
            supervisor = get_authenticated_supervisor(connection)

            if supervisor is None:
                return jsonify({
                    "success": False,
                    "message": "Supervisor session is missing or expired. Please log in again.",
                }), 401

            sites = get_owned_sites(
                connection,
                supervisor["supervisor_name"],
            )

            requested_site_id = request.args.get("site_id", type=int)

            if requested_site_id is not None:
                site_row = get_owned_site_by_id(
                    connection,
                    requested_site_id,
                    supervisor["supervisor_name"],
                )

                if site_row is None:
                    return jsonify({
                        "success": False,
                        "message": "You do not have permission to access this site.",
                    }), 403
            else:
                site_row = sites[0] if sites else None

            if site_row is None:
                return jsonify({
                    "success": True,
                    "site": None,
                    "date": request.args.get("date", "").strip() or None,
                    "alerts": {
                        "ppe": [],
                        "drowsiness": [],
                        "device": [],
                    },
                    "total": 0,
                }), 200

            selected_date = request.args.get("date", "").strip()

            if selected_date:
                try:
                    datetime.strptime(selected_date, "%Y-%m-%d")
                except ValueError:
                    return jsonify({
                        "success": False,
                        "message": "Invalid date. Use YYYY-MM-DD.",
                    }), 400

            date_condition = ""
            parameters = [site_row["id"]]

            if selected_date:
                date_condition = "AND substr(a.created_at, 1, 10) = ?"
                parameters.append(selected_date)

            alert_rows = connection.execute(
                f"""
                SELECT
                    a.id,
                    a.alert_type,
                    a.message,
                    a.status,
                    a.frame_path,
                    a.created_at,
                    h.device_code,
                    COALESCE(w.full_name, device_worker.full_name, 'Unassigned')
                        AS worker_name
                FROM alerts AS a
                LEFT JOIN smart_hardhats AS h
                    ON h.id = a.hardhat_id
                LEFT JOIN workers AS w
                    ON w.id = a.worker_id
                LEFT JOIN workers AS device_worker
                    ON device_worker.id = h.worker_id
                WHERE a.site_id = ?
                  {date_condition}
                ORDER BY a.created_at DESC, a.id DESC
                """,
                parameters,
            ).fetchall()

            categorized_alerts = {
                "ppe": [],
                "drowsiness": [],
                "device": [],
            }

            for row in alert_rows:
                alert = dict(row)

                alert_type = str(
                    alert.get("alert_type") or ""
                ).strip().lower()

                message = str(
                    alert.get("message") or ""
                ).strip().lower()

                searchable_text = (
                    f"{alert_type} {message}"
                    .replace("-", "_")
                    .replace(" ", "_")
                )

                if any(term in searchable_text for term in (
                    "drowsiness",
                    "drowsy",
                )):
                    category = "drowsiness"

                elif any(term in searchable_text for term in (
                    "device",
                    "connectivity",
                    "offline",
                    "disconnected",
                    "connection_lost",
                )):
                    category = "device"

                elif any(term in searchable_text for term in (
                    "ppe",
                    "hardhat",
                    "hard_hat",
                    "safety_vest",
                    "vest",
                    "gloves",
                    "boots",
                )):
                    category = "ppe"

                else:
                    continue

                alert["device_id"] = alert.get("device_code") or "—"
                alert["worker_name"] = alert.get("worker_name") or "Unassigned"
                alert["status"] = alert.get("status") or "Active"
                alert["message"] = alert.get("message") or alert_type or "Alert"

                categorized_alerts[category].append(alert)

            return jsonify({
                "success": True,
                "site": {
                    "id": site_row["id"],
                    "site_name": site_row["site_name"],
                },
                "date": selected_date or None,
                "alerts": categorized_alerts,
                "total": sum(
                    len(items)
                    for items in categorized_alerts.values()
                ),
            }), 200

        except Exception as error:
            app.logger.exception(
                "Alerts History request failed: %s",
                error,
            )

            return jsonify({
                "success": False,
                "message": "Failed to load Alerts History.",
            }), 500

        finally:
            connection.close()
