from datetime import datetime, timedelta

from flask import jsonify, request

try:
    from ..database.connection import get_database
    from ..utils.site_helpers import (
        get_authenticated_supervisor,
        get_owned_sites,
        get_owned_site_by_id,
        serialize_site,
    )
    from ..utils.status_helpers import (
        is_known_status,
        is_compliant_status,
        display_drowsiness_status,
        display_device_status,
        display_zone,
    )
except ImportError:
    from database.connection import get_database
    from utils.site_helpers import (
        get_authenticated_supervisor,
        get_owned_sites,
        get_owned_site_by_id,
        serialize_site,
    )
    from utils.status_helpers import (
        is_known_status,
        is_compliant_status,
        display_drowsiness_status,
        display_device_status,
        display_zone,
    )


def register_dashboard_overview_api(app):

    # ========================================================
    # DASHBOARD OVERVIEW API
    # ========================================================

    @app.route("/api/dashboard/overview", methods=["GET"])
    def dashboard_overview():
        """Return real SQLite-backed overview data for an authorized supervisor site.

        A valid bearer token is required. The token resolves the saved supervisor
        identity; the site list and every selected site are filtered to that identity.
        The monitoring tables stay empty until the worker/device/hardware pipeline
        records real events. This endpoint deliberately does not insert demo data.
        """

        connection = get_database()

        try:
            supervisor = get_authenticated_supervisor(connection)

            if supervisor is None:
                return jsonify({
                    "success": False,
                    "message": (
                        "Supervisor session is missing or expired. "
                        "Please log in again."
                    ),
                }), 401

            sites = get_owned_sites(
                connection,
                supervisor["supervisor_name"],
            )

            sites_payload = [
                serialize_site(row)
                for row in sites
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

            if site_row is None:
                return jsonify({
                    "success": True,
                    "site": None,
                    "sites": sites_payload,
                    "summary": {
                        "active_devices": 0,
                        "total_devices": 0,
                        "ppe_compliance_percent": None,
                        "ppe_compliant_checks": 0,
                        "ppe_checked_checks": 0,
                        "drowsiness_alerts": 0,
                        "ppe_violations_today": 0,
                    },
                    "ppe_compliance_status": [],
                    "device_connectivity": [],
                    "drowsiness_status": [],
                    "zone_localization": [],
                    "recent_alerts": [],
                    "notifications": [],
                    "notification_count": 0,
                })

            site_id = site_row["id"]

            # Get each hardhat and its latest monitoring record.
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
                    m.ppe_hardhat_status,
                    m.ppe_vest_status,
                    m.ppe_gloves_status,
                    m.ppe_boots_status,
                    m.drowsiness_status,
                    m.face_visible,
                    m.floor,
                    m.zone,
                    m.duration_ms,
                    m.frame_path,
                    m.captured_at
                FROM smart_hardhats AS h
                LEFT JOIN workers AS w
                    ON w.id = h.worker_id
                LEFT JOIN monitoring_records AS m
                    ON m.id = (
                        SELECT mr.id
                        FROM monitoring_records AS mr
                        WHERE mr.hardhat_id = h.id
                        ORDER BY mr.captured_at DESC, mr.id DESC
                        LIMIT 1
                    )
                LEFT JOIN workers AS monitoring_worker
                    ON monitoring_worker.id = m.worker_id
                WHERE h.site_id = ?
                ORDER BY h.device_code
                """,
                (site_id,),
            ).fetchall()

            devices = [
                dict(row)
                for row in device_rows
            ]

            active_devices = sum(
                1
                for device in devices
                if display_device_status(
                    device.get("device_status")
                ) == "Online"
            )

            # PPE status summary uses the latest record for each hardhat.
            ppe_fields = [
                ("Hardhat", "ppe_hardhat_status"),
                ("Safety Vest", "ppe_vest_status"),
                ("Gloves", "ppe_gloves_status"),
                ("Safety Boots", "ppe_boots_status"),
            ]

            ppe_compliance_status = []
            compliant_checks = 0
            checked_checks = 0

            for label, field in ppe_fields:
                checked = [
                    device.get(field)
                    for device in devices
                    if is_known_status(device.get(field))
                ]

                compliant = sum(
                    1
                    for status in checked
                    if is_compliant_status(status)
                )

                compliant_checks += compliant
                checked_checks += len(checked)

                ppe_compliance_status.append({
                    "item": label,
                    "compliant": compliant,
                    "total": len(checked),
                })

            ppe_compliance_percent = (
                round(
                    (compliant_checks / checked_checks) * 100,
                    1,
                )
                if checked_checks
                else None
            )

            device_connectivity = []
            drowsiness_status = []
            zone_localization = []

            for device in devices:
                common = {
                    "device_id": device["device_code"],
                    "worker_name": device["worker_name"],
                    "time": (
                        device.get("captured_at")
                        or device.get("last_seen")
                    ),
                    "duration_ms": device.get("duration_ms"),
                }

                device_connectivity.append({
                    **common,
                    "status": display_device_status(
                        device.get("device_status")
                    ),
                    "last_seen": device.get("last_seen"),
                })

                drowsiness_status.append({
                    **common,
                    "status": display_drowsiness_status(
                        device.get("drowsiness_status")
                    ),
                })

                zone_localization.append({
                    **common,
                    "status": (
                        "Localized"
                        if (
                            device.get("floor") is not None
                            and device.get("zone")
                        )
                        else "Unmonitored"
                    ),
                    "floor": device.get("floor"),
                    "zone": device.get("zone"),
                    "location_label": display_zone(
                        device.get("floor"),
                        device.get("zone"),
                    ),
                })

            # Use local calendar day boundaries because created_at is
            # stored with the machine's local timezone offset.
            now = datetime.now().astimezone()

            day_start = now.replace(
                hour=0,
                minute=0,
                second=0,
                microsecond=0,
            ).isoformat(timespec="seconds")

            next_day_start = (
                now.replace(
                    hour=0,
                    minute=0,
                    second=0,
                    microsecond=0,
                )
                + timedelta(days=1)
            ).isoformat(timespec="seconds")

            active_alerts = connection.execute(
                """
                SELECT
                    a.id,
                    a.alert_type,
                    a.message,
                    a.status,
                    a.frame_path,
                    a.created_at,
                    h.device_code,
                    COALESCE(
                        w.full_name,
                        device_worker.full_name,
                        'Unassigned'
                    ) AS worker_name
                FROM alerts AS a
                LEFT JOIN smart_hardhats AS h
                    ON h.id = a.hardhat_id
                LEFT JOIN workers AS w
                    ON w.id = a.worker_id
                LEFT JOIN workers AS device_worker
                    ON device_worker.id = h.worker_id
                WHERE a.site_id = ?
                  AND LOWER(a.status)
                      IN ('active', 'open', 'unresolved')
                ORDER BY a.created_at DESC, a.id DESC
                LIMIT 5
                """,
                (site_id,),
            ).fetchall()

            active_alert_count = connection.execute(
                """
                SELECT COUNT(*) AS count
                FROM alerts
                WHERE site_id = ?
                  AND LOWER(status)
                      IN ('active', 'open', 'unresolved')
                """,
                (site_id,),
            ).fetchone()["count"]

            recent_alert_rows = connection.execute(
                """
                SELECT
                    a.id,
                    a.alert_type,
                    a.message,
                    a.status,
                    a.frame_path,
                    a.created_at,
                    h.device_code,
                    COALESCE(
                        w.full_name,
                        device_worker.full_name,
                        'Unassigned'
                    ) AS worker_name
                FROM alerts AS a
                LEFT JOIN smart_hardhats AS h
                    ON h.id = a.hardhat_id
                LEFT JOIN workers AS w
                    ON w.id = a.worker_id
                LEFT JOIN workers AS device_worker
                    ON device_worker.id = h.worker_id
                WHERE a.site_id = ?
                ORDER BY a.created_at DESC, a.id DESC
                LIMIT 3
                """,
                (site_id,),
            ).fetchall()

            def serialize_alert(row):
                return {
                    "id": row["id"],
                    "alert_type": row["alert_type"],
                    "message": row["message"],
                    "status": row["status"],
                    "frame_path": row["frame_path"],
                    "created_at": row["created_at"],
                    "device_id": row["device_code"] or "—",
                    "worker_name": (
                        row["worker_name"] or "Unassigned"
                    ),
                }

            notifications = [
                serialize_alert(row)
                for row in active_alerts
            ]

            recent_alerts = [
                serialize_alert(row)
                for row in recent_alert_rows
            ]

            drowsiness_alert_count = connection.execute(
                """
                SELECT COUNT(*) AS count
                FROM alerts
                WHERE site_id = ?
                  AND LOWER(
                      REPLACE(
                          REPLACE(alert_type, ' ', '_'),
                          '-',
                          '_'
                      )
                  ) IN (
                      'drowsiness',
                      'drowsy',
                      'drowsiness_alert'
                  )
                  AND LOWER(status)
                      IN ('active', 'open', 'unresolved')
                """,
                (site_id,),
            ).fetchone()["count"]

            ppe_violations_today = connection.execute(
                """
                SELECT COUNT(*) AS count
                FROM alerts
                WHERE site_id = ?
                  AND LOWER(
                      REPLACE(
                          REPLACE(alert_type, ' ', '_'),
                          '-',
                          '_'
                      )
                  ) IN (
                      'ppe_violation',
                      'missing_ppe',
                      'ppe_missing'
                  )
                  AND created_at >= ?
                  AND created_at < ?
                """,
                (
                    site_id,
                    day_start,
                    next_day_start,
                ),
            ).fetchone()["count"]

            return jsonify({
                "success": True,
                "site": serialize_site(site_row),
                "sites": sites_payload,
                "summary": {
                    "active_devices": active_devices,
                    "total_devices": len(devices),
                    "ppe_compliance_percent": ppe_compliance_percent,
                    "ppe_compliant_checks": compliant_checks,
                    "ppe_checked_checks": checked_checks,
                    "drowsiness_alerts": drowsiness_alert_count,
                    "ppe_violations_today": ppe_violations_today,
                },
                "ppe_compliance_status": ppe_compliance_status,
                "device_connectivity": device_connectivity,
                "drowsiness_status": drowsiness_status,
                "zone_localization": zone_localization,
                "recent_alerts": recent_alerts,
                "notifications": notifications,
                "notification_count": active_alert_count,
            })

        except Exception as error:
            app.logger.exception(
                "Dashboard overview failed: %s",
                error,
            )

            return jsonify({
                "success": False,
                "message": "Failed to load dashboard overview.",
            }), 500

        finally:
            connection.close()
