
from datetime import date
from flask import jsonify, request

try:
    from ..database.connection import get_database
    from ..utils.site_helpers import (
        get_authenticated_supervisor,
        get_owned_sites,
        get_owned_site_by_id,
        serialize_site,
    )
except ImportError:
    from database.connection import get_database
    from utils.site_helpers import (
        get_authenticated_supervisor,
        get_owned_sites,
        get_owned_site_by_id,
        serialize_site,
    )


def normalized_value(value):
    """Normalize a monitoring status for comparison."""
    return str(value or "").strip().lower().replace("-", "_").replace(" ", "_")


def is_compliant(value):
    return normalized_value(value) in (
        "compliant",
        "compliance",
        "present",
        "detected",
        "yes",
        "true",
        "1",
        "pass",
        "passed",
        "ok",
    )


def is_violation(value):
    status = normalized_value(value)

    return status in (
        "violation",
        "non_compliant",
        "noncompliant",
        "missing",
        "not_detected",
        "absent",
        "no",
        "false",
        "0",
        "fail",
        "failed",
    )


def classify_ppe_record(row):
    """Classify a hardhat's latest PPE record for the selected date."""

    statuses = [
        row["ppe_hardhat_status"],
        row["ppe_vest_status"],
        row["ppe_gloves_status"],
        row["ppe_boots_status"],
    ]

    if any(is_violation(value) for value in statuses):
        return "violation"

    if all(is_compliant(value) for value in statuses):
        return "compliant"

    return "unmonitored"


def classify_drowsiness(value):
    status = normalized_value(value)

    if status in (
        "normal",
        "awake",
        "not_drowsy",
        "alert",
    ):
        return "normal"

    if "drowsy" in status or "drowsiness" in status:
        return "drowsy"

    return "unmonitored"


def register_analytics_api(app):

    @app.route(
        "/api/dashboard/analytics",
        methods=["GET"],
    )
    def dashboard_analytics():

        connection = get_database()

        try:
            # ------------------------------------------------
            # AUTHENTICATE SUPERVISOR
            # ------------------------------------------------

            supervisor = get_authenticated_supervisor(connection)

            if supervisor is None:
                return jsonify({
                    "success": False,
                    "message": (
                        "Supervisor session is missing or expired. "
                        "Please log in again."
                    ),
                }), 401

            supervisor_name = supervisor["supervisor_name"]

            # ------------------------------------------------
            # GET SUPERVISOR'S OWNED SITES
            # ------------------------------------------------

            sites = get_owned_sites(
                connection,
                supervisor_name,
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
                    supervisor_name,
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

            # ------------------------------------------------
            # VALIDATE SELECTED DATE
            # ------------------------------------------------

            selected_date = request.args.get(
                "date",
                default=date.today().isoformat(),
            )

            try:
                selected_date = date.fromisoformat(
                    selected_date
                ).isoformat()
            except (TypeError, ValueError):
                return jsonify({
                    "success": False,
                    "message": "Invalid date. Use YYYY-MM-DD.",
                }), 400

            today = date.today().isoformat()

            # ------------------------------------------------
            # EMPTY SITE RESPONSE
            # ------------------------------------------------

            if site_row is None:
                empty_trend = [
                    {
                        "hour": hour,
                        "normal": 0,
                        "drowsy": 0,
                        "unmonitored": 0,
                    }
                    for hour in range(8, 17)
                ]

                empty_device_trend = [
                    {
                        "hour": hour,
                        "online": 0,
                        "offline": 0,
                    }
                    for hour in range(8, 17)
                ]

                empty_localization_trend = [
                    {
                        "hour": hour,
                        "localized": 0,
                        "unlocalized": 0,
                    }
                    for hour in range(8, 17)
                ]

                return jsonify({
                    "success": True,
                    "site": None,
                    "sites": sites_payload,
                    "date": selected_date,
                    "ppe_breakdown": {
                        "compliant": 0,
                        "violation": 0,
                        "unmonitored": 0,
                        "total": 0,
                    },
                    "drowsiness_trend": empty_trend,
                    "device_trend": empty_device_trend,
                    "localization_trend": empty_localization_trend,
                })

            site_id = site_row["id"]

            # ------------------------------------------------
            # PPE STATUS BREAKDOWN
            #
            # Count each hardhat once, using its latest
            # monitoring record on the selected date.
            # ------------------------------------------------

            ppe_rows = connection.execute(
                """
                SELECT
                    m.ppe_hardhat_status,
                    m.ppe_vest_status,
                    m.ppe_gloves_status,
                    m.ppe_boots_status

                FROM monitoring_records AS m

                WHERE m.site_id = ?
                  AND DATE(m.captured_at) = ?
                  AND m.hardhat_id IS NOT NULL

                  AND m.id = (
                      SELECT mr.id
                      FROM monitoring_records AS mr
                      WHERE mr.site_id = m.site_id
                        AND mr.hardhat_id = m.hardhat_id
                        AND DATE(mr.captured_at) = ?
                      ORDER BY
                          mr.captured_at DESC,
                          mr.id DESC
                      LIMIT 1
                  )
                """,
                (
                    site_id,
                    selected_date,
                    selected_date,
                ),
            ).fetchall()

            ppe_breakdown = {
                "compliant": 0,
                "violation": 0,
                "unmonitored": 0,
            }

            for row in ppe_rows:
                category = classify_ppe_record(row)
                ppe_breakdown[category] += 1

            ppe_breakdown["total"] = sum(
                ppe_breakdown.values()
            )

            # ------------------------------------------------
            # GET TOTAL SITE DEVICES AND WORKERS
            # ------------------------------------------------

            device_count_row = connection.execute(
                """
                SELECT COUNT(*) AS total
                FROM smart_hardhats
                WHERE site_id = ?
                """,
                (site_id,),
            ).fetchone()

            worker_count_row = connection.execute(
                """
                SELECT COUNT(*) AS total
                FROM workers
                WHERE site_id = ?
                """,
                (site_id,),
            ).fetchone()

            total_devices = device_count_row["total"]
            total_workers = worker_count_row["total"]

            # ------------------------------------------------
            # GET SELECTED-DATE MONITORING RECORDS
            # ------------------------------------------------

            monitoring_rows = connection.execute(
                """
                SELECT
                    id,
                    hardhat_id,
                    worker_id,
                    drowsiness_status,
                    floor,
                    zone,
                    captured_at

                FROM monitoring_records

                WHERE site_id = ?
                  AND DATE(captured_at) = ?
                  AND TIME(captured_at) >= '08:00:00'
                  AND TIME(captured_at) <= '16:59:59'

                ORDER BY captured_at ASC, id ASC
                """,
                (
                    site_id,
                    selected_date,
                ),
            ).fetchall()

            # ------------------------------------------------
            # INITIALIZE HOURLY CHART DATA
            # ------------------------------------------------

            drowsiness_trend = []
            device_trend = []
            localization_trend = []

            for hour in range(8, 17):

                drowsiness_trend.append({
                    "hour": hour,
                    "normal": 0,
                    "drowsy": 0,
                    "unmonitored": 0,
                })

                device_trend.append({
                    "hour": hour,
                    "online": 0,
                    "offline": 0,
                })

                localization_trend.append({
                    "hour": hour,
                    "localized": 0,
                    "unlocalized": 0,
                })

            # ------------------------------------------------
            # GROUP MONITORING DATA BY HOUR
            # ------------------------------------------------

            hourly_devices = {
                hour: set()
                for hour in range(8, 17)
            }

            hourly_localized_workers = {
                hour: set()
                for hour in range(8, 17)
            }

            for row in monitoring_rows:

                captured_at = row["captured_at"]

                if not captured_at:
                    continue

                try:
                    recorded_time = str(captured_at).replace(
                        "Z",
                        "",
                    )

                    hour = int(
                        recorded_time[11:13]
                    )

                except (ValueError, IndexError):
                    continue

                if hour not in range(8, 17):
                    continue

                # --------------------------------------------
                # DROWSINESS
                # --------------------------------------------

                drowsiness_category = classify_drowsiness(
                    row["drowsiness_status"]
                )

                drowsiness_trend[hour - 8][
                    drowsiness_category
                ] += 1

                # --------------------------------------------
                # DEVICE CONNECTIVITY
                # --------------------------------------------

                if row["hardhat_id"] is not None:
                    hourly_devices[hour].add(
                        row["hardhat_id"]
                    )

                # --------------------------------------------
                # LOCALIZATION
                # --------------------------------------------

                floor = str(row["floor"] or "").strip()
                zone = str(row["zone"] or "").strip()

                if (
                    row["worker_id"] is not None
                    and floor
                    and zone
                ):
                    hourly_localized_workers[hour].add(
                        row["worker_id"]
                    )

            # ------------------------------------------------
            # COMPLETE DEVICE CONNECTIVITY TREND
            # ------------------------------------------------

            for hour in range(8, 17):

                online_count = len(
                    hourly_devices[hour]
                )

                is_future_hour = (
                    selected_date == today
                    and hour > datetime_now_hour()
                )

                if is_future_hour:
                    device_trend[hour - 8]["online"] = None
                    device_trend[hour - 8]["offline"] = None
                else:
                    device_trend[hour - 8]["online"] = online_count

                    device_trend[hour - 8]["offline"] = max(
                        total_devices - online_count,
                        0,
                    )

            # ------------------------------------------------
            # COMPLETE LOCALIZATION TREND
            # ------------------------------------------------

            for hour in range(8, 17):

                localized_count = len(
                    hourly_localized_workers[hour]
                )

                is_future_hour = (
                    selected_date == today
                    and hour > datetime_now_hour()
                )

                if is_future_hour:
                    localization_trend[hour - 8][
                        "localized"
                    ] = None

                    localization_trend[hour - 8][
                        "unlocalized"
                    ] = None

                else:
                    localization_trend[hour - 8][
                        "localized"
                    ] = localized_count

                    localization_trend[hour - 8][
                        "unlocalized"
                    ] = max(
                        total_workers - localized_count,
                        0,
                    )

            # ------------------------------------------------
            # RETURN ANALYTICS DATA
            # ------------------------------------------------

            return jsonify({
                "success": True,
                "site": serialize_site(site_row),
                "sites": sites_payload,
                "date": selected_date,

                "ppe_breakdown": ppe_breakdown,

                "drowsiness_trend": drowsiness_trend,

                "device_trend": device_trend,

                "localization_trend": localization_trend,
            })

        except Exception as error:
            app.logger.exception(
                "Analytics request failed: %s",
                error,
            )

            return jsonify({
                "success": False,
                "message": "Failed to load analytics data.",
            }), 500

        finally:
            connection.close()


def datetime_now_hour():
    """Return the current local hour."""
    from datetime import datetime
    return datetime.now().hour
