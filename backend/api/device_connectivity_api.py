
from datetime import datetime, timedelta

from flask import jsonify, request


def register_device_connectivity_api(
    app,
    get_database,
    get_authenticated_supervisor,
    get_owned_sites,
    get_owned_site_by_id,
    serialize_site,
    display_device_status,
):
    """Register the authenticated Device Connectivity endpoint."""

    def empty_trend():
        result = []

        for hour in range(8, 17):
            label = (
                datetime(2000, 1, 1, hour=hour)
                .strftime("%I:00 %p")
                .lstrip("0")
            )

            result.append({
                "hour": label,
                "online": None,
                "offline": None,
            })

        return result

    @app.route("/api/dashboard/device-connectivity", methods=["GET"])
    def dashboard_device_connectivity():
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

            # Get only the authenticated supervisor's sites.
            sites = get_owned_sites(
                connection,
                supervisor["supervisor_name"],
            )

            sites_payload = [
                serialize_site(site)
                for site in sites
            ]

            requested_site_id = request.args.get(
                "site_id",
                type=int,
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

            empty_summary = {
                "total_devices": 0,
                "online_devices": 0,
                "offline_devices": 0,
                "unmonitored_devices": 0,
            }

            if site_row is None:
                return jsonify({
                    "success": True,
                    "site": None,
                    "sites": sites_payload,
                    "summary": empty_summary,
                    "records": [],
                    "trend": empty_trend(),
                    "trend_basis": (
                        "A device is counted as online when it has "
                        "at least one monitoring record during an hour."
                    ),
                }), 200

            site_id = site_row["id"]

            # Get registered hardhats and their latest monitoring record.
            device_rows = connection.execute(
                """
                SELECT
                    h.id AS hardhat_id,
                    h.device_code,
                    h.status AS device_status,
                    h.last_seen,

                    COALESCE(
                        w.full_name,
                        monitoring_worker.full_name,
                        'Unassigned'
                    ) AS worker_name,

                    m.duration_ms,
                    m.captured_at

                FROM smart_hardhats AS h

                LEFT JOIN workers AS w
                    ON w.id = h.worker_id

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
                "Online": 0,
                "Offline": 0,
                "Unmonitored": 0,
            }

            records = []

            for row in device_rows:
                status = display_device_status(
                    row["device_status"]
                )

                if status not in counts:
                    status = "Unmonitored"

                counts[status] += 1

                records.append({
                    "device_id": row["device_code"],
                    "worker_name": (
                        row["worker_name"] or "Unassigned"
                    ),
                    "status": status,
                    "last_seen": (
                        row["last_seen"] or row["captured_at"]
                    ),
                    "last_monitoring": row["captured_at"],
                    "duration_ms": row["duration_ms"],
                })

            total_devices = len(records)

            summary = {
                "total_devices": total_devices,
                "online_devices": counts["Online"],
                "offline_devices": counts["Offline"],
                "unmonitored_devices": counts["Unmonitored"],
            }

            # Get today's monitoring activity.
            now = datetime.now().astimezone()

            day_start = now.replace(
                hour=0,
                minute=0,
                second=0,
                microsecond=0,
            )

            next_day_start = day_start + timedelta(days=1)

            trend_rows = connection.execute(
                """
                SELECT
                    hardhat_id,
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

            # Track unique devices that sent monitoring records per hour.
            hourly_devices = {
                hour: set()
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

                hour = captured_time.hour

                if hour in hourly_devices:
                    hourly_devices[hour].add(row["hardhat_id"])

            # Build hourly connectivity activity.
            trend = []

            for hour in range(8, 17):
                label = (
                    datetime(2000, 1, 1, hour=hour)
                    .strftime("%I:00 %p")
                    .lstrip("0")
                )

                # Do not display future hours as offline.
                if hour > now.hour:
                    online = None
                    offline = None
                else:
                    online = min(
                        len(hourly_devices[hour]),
                        total_devices,
                    )

                    offline = max(
                        total_devices - online,
                        0,
                    )

                trend.append({
                    "hour": label,
                    "online": online,
                    "offline": offline,
                })

            response = jsonify({
                "success": True,
                "site": serialize_site(site_row),
                "sites": sites_payload,
                "summary": summary,
                "records": records,
                "trend": trend,
                "trend_basis": (
                    "Hourly activity: a device counts as online if "
                    "it has at least one monitoring record during "
                    "that hour. Offline means no monitoring record "
                    "was received during that hour."
                ),
            })

            response.headers["Cache-Control"] = "private, no-store"

            return response, 200

        except Exception:
            app.logger.exception(
                "Device connectivity request failed."
            )

            return jsonify({
                "success": False,
                "message": "Failed to load device connectivity.",
            }), 500

        finally:
            connection.close()
