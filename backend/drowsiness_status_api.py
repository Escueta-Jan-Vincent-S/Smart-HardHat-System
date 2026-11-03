
from datetime import datetime, timedelta

from flask import jsonify, request


def register_drowsiness_status_api(
    app,
    get_database,
    get_authenticated_supervisor,
    get_owned_sites,
    get_owned_site_by_id,
    serialize_site,
    normalized_status,
):
    """Register the authenticated, site-scoped Drowsiness Status endpoint."""

    def page_drowsiness_status(value):
        status = normalized_status(value)

        if status in {"normal", "awake", "not_drowsy", "alert"}:
            return "Normal"

        if "drowsy" in status or "drowsiness" in status:
            return "Drowsy"

        return "Unmonitored"

    def empty_trend():
        result = []

        for hour in range(8, 17):
            hour_label = (
                datetime(2000, 1, 1, hour=hour)
                .strftime("%I:00 %p")
                .lstrip("0")
            )

            result.append({
                "hour": hour_label,
                "normal": 0,
                "drowsy": 0,
                "unmonitored": 0,
            })

        return result

    def make_summary(counts):
        total = sum(counts.values())

        return {
            "total_devices": total,
            "normal_devices": counts["Normal"],
            "drowsy_devices": counts["Drowsy"],
            "unmonitored_devices": counts["Unmonitored"],

            "normal_percent": (
                round((counts["Normal"] / total) * 100, 1)
                if total else None
            ),

            "drowsy_percent": (
                round((counts["Drowsy"] / total) * 100, 1)
                if total else None
            ),

            "unmonitored_percent": (
                round((counts["Unmonitored"] / total) * 100, 1)
                if total else None
            ),
        }

    @app.route("/api/dashboard/drowsiness-status", methods=["GET"])
    def dashboard_drowsiness_status():
        connection = get_database()

        try:
            # Validate supervisor session.
            supervisor = get_authenticated_supervisor(connection)

            if supervisor is None:
                return jsonify({
                    "success": False,
                    "message": (
                        "Supervisor session is missing or expired. "
                        "Please log in again."
                    ),
                }), 401

            # Only return sites owned by the authenticated supervisor.
            sites = get_owned_sites(
                connection,
                supervisor["supervisor_name"]
            )

            sites_payload = [
                serialize_site(site)
                for site in sites
            ]

            requested_site_id = request.args.get(
                "site_id",
                type=int
            )

            if requested_site_id is not None:
                site_row = get_owned_site_by_id(
                    connection,
                    requested_site_id,
                    supervisor["supervisor_name"],
                )

                if site_row is None:
                    return jsonify({
                        "success": False,
                        "message": (
                            "You do not have permission to access this site."
                        ),
                    }), 403

            else:
                site_row = sites[0] if sites else None

            empty_counts = {
                "Normal": 0,
                "Drowsy": 0,
                "Unmonitored": 0,
            }

            # No site available.
            if site_row is None:
                return jsonify({
                    "success": True,
                    "site": None,
                    "sites": sites_payload,
                    "summary": make_summary(empty_counts),
                    "records": [],
                    "trend": empty_trend(),
                }), 200

            site_id = site_row["id"]

            # Get each registered hardhat and its latest monitoring record.
            device_rows = connection.execute(
                """
                SELECT
                    h.id AS hardhat_id,
                    h.device_code,
                    h.last_seen,

                    COALESCE(
                        monitoring_worker.full_name,
                        device_worker.full_name,
                        'Unassigned'
                    ) AS worker_name,

                    m.drowsiness_status,
                    m.duration_ms,
                    m.captured_at

                FROM smart_hardhats AS h

                LEFT JOIN workers AS device_worker
                    ON device_worker.id = h.worker_id

                LEFT JOIN monitoring_records AS m
                    ON m.id = (
                        SELECT mr.id
                        FROM monitoring_records AS mr
                        WHERE mr.hardhat_id = h.id
                          AND mr.site_id = h.site_id
                        ORDER BY mr.captured_at DESC, mr.id DESC
                        LIMIT 1
                    )

                LEFT JOIN workers AS monitoring_worker
                    ON monitoring_worker.id = m.worker_id

                WHERE h.site_id = ?

                ORDER BY h.device_code COLLATE NOCASE
                """,
                (site_id,),
            ).fetchall()

            counts = {
                "Normal": 0,
                "Drowsy": 0,
                "Unmonitored": 0,
            }

            records = []

            # Build the latest status table.
            for row in device_rows:
                status = page_drowsiness_status(
                    row["drowsiness_status"]
                )

                counts[status] += 1

                records.append({
                    "device_id": row["device_code"],
                    "worker_name": row["worker_name"] or "Unassigned",
                    "status": status,
                    "captured_at": (
                        row["captured_at"] or row["last_seen"]
                    ),
                    "duration_ms": row["duration_ms"],
                })

            # Get today's monitoring records for the trend chart.
            now = datetime.now().astimezone()

            day_start = now.replace(
                hour=0,
                minute=0,
                second=0,
                microsecond=0
            )

            next_day_start = day_start + timedelta(days=1)

            trend_rows = connection.execute(
                """
                SELECT
                    drowsiness_status,
                    captured_at
                FROM monitoring_records
                WHERE site_id = ?
                  AND captured_at >= ?
                  AND captured_at < ?
                ORDER BY captured_at ASC, id ASC
                """,
                (
                    site_id,
                    day_start.isoformat(timespec="seconds"),
                    next_day_start.isoformat(timespec="seconds"),
                ),
            ).fetchall()

            # Prepare hourly counts from 8 AM to 4 PM.
            trend_counts = {
                hour: {
                    "Normal": 0,
                    "Drowsy": 0,
                    "Unmonitored": 0,
                }
                for hour in range(8, 17)
            }

            for row in trend_rows:
                captured_at = str(
                    row["captured_at"] or ""
                ).strip()

                if not captured_at:
                    continue

                try:
                    captured_time = datetime.fromisoformat(
                        captured_at.replace("Z", "+00:00")
                    )

                    if captured_time.tzinfo is None:
                        captured_time = captured_time.replace(
                            tzinfo=now.tzinfo
                        )
                    else:
                        captured_time = captured_time.astimezone(
                            now.tzinfo
                        )

                except ValueError:
                    continue

                if captured_time.hour not in trend_counts:
                    continue

                status = page_drowsiness_status(
                    row["drowsiness_status"]
                )

                trend_counts[captured_time.hour][status] += 1

            trend = []

            for hour in range(8, 17):
                hour_label = (
                    datetime(2000, 1, 1, hour=hour)
                    .strftime("%I:00 %p")
                    .lstrip("0")
                )

                trend.append({
                    "hour": hour_label,
                    "normal": trend_counts[hour]["Normal"],
                    "drowsy": trend_counts[hour]["Drowsy"],
                    "unmonitored": trend_counts[hour]["Unmonitored"],
                })

            response = jsonify({
                "success": True,
                "site": serialize_site(site_row),
                "sites": sites_payload,
                "summary": make_summary(counts),
                "records": records,
                "trend": trend,
            })

            response.headers["Cache-Control"] = "private, no-store"

            return response, 200

        except Exception:
            app.logger.exception(
                "Drowsiness status request failed."
            )

            return jsonify({
                "success": False,
                "message": "Failed to load drowsiness status.",
            }), 500

        finally:
            connection.close()
