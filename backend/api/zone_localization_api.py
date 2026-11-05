
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


def register_zone_localization_api(app):

    # ========================================================
    # ZONE LOCALIZATION API
    # ========================================================

    @app.route(
        "/api/dashboard/zone-localization",
        methods=["GET"],
    )
    def dashboard_zone_localization():
        """Return worker localization data for an authorized site."""

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

            supervisor_name = supervisor["supervisor_name"]

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

            if site_row is None:
                return jsonify({
                    "success": True,
                    "site": None,
                    "sites": sites_payload,
                    "summary": {
                        "total_workers": 0,
                        "localized_workers": 0,
                        "unlocalized_workers": 0,
                        "localized_percent": None,
                        "unlocalized_percent": None,
                    },
                    "records": [],
                    "trend": [],
                })

            site_id = site_row["id"]

            # ------------------------------------------------
            # GET EACH WORKER'S LATEST MONITORING RECORD
            # ------------------------------------------------

            worker_rows = connection.execute(
                """
                SELECT
                    w.id AS worker_id,
                    w.full_name AS worker_name,
                    w.worker_code,
                    w.status AS worker_status,

                    m.id AS monitoring_id,
                    m.floor,
                    m.zone,
                    m.captured_at,

                    h.device_code

                FROM workers AS w

                LEFT JOIN monitoring_records AS m
                    ON m.id = (
                        SELECT mr.id
                        FROM monitoring_records AS mr
                        WHERE mr.worker_id = w.id
                          AND mr.site_id = w.site_id
                        ORDER BY
                            mr.captured_at DESC,
                            mr.id DESC
                        LIMIT 1
                    )

                LEFT JOIN smart_hardhats AS h
                    ON h.id = m.hardhat_id

                WHERE w.site_id = ?

                ORDER BY w.full_name COLLATE NOCASE
                """,
                (site_id,),
            ).fetchall()

            records = []

            localized_workers = 0
            unlocalized_workers = 0

            for row in worker_rows:

                floor = str(row["floor"] or "").strip()
                zone = str(row["zone"] or "").strip()

                has_valid_location = bool(floor and zone)

                if has_valid_location:
                    location_status = "Localized"
                    localized_workers += 1
                else:
                    location_status = "Unlocalized"
                    unlocalized_workers += 1

                records.append({
                    "worker_id": row["worker_id"],
                    "worker_name": row["worker_name"],
                    "worker_code": row["worker_code"],
                    "worker_status": row["worker_status"],
                    "device_id": row["device_code"],
                    "monitoring_id": row["monitoring_id"],
                    "floor": floor or None,
                    "zone": zone or None,
                    "location_status": location_status,
                    "captured_at": row["captured_at"],
                })

            total_workers = len(records)

            # ------------------------------------------------
            # GET DAILY LOCALIZATION TREND
            # ------------------------------------------------

            trend_rows = connection.execute(
                """
                SELECT
                    DATE(captured_at) AS recorded_date,
                    COUNT(DISTINCT worker_id) AS localized_count

                FROM monitoring_records

                WHERE site_id = ?
                  AND worker_id IS NOT NULL
                  AND floor IS NOT NULL
                  AND TRIM(floor) <> ''
                  AND zone IS NOT NULL
                  AND TRIM(zone) <> ''
                  AND DATE(captured_at) >= DATE('now', '-6 days')

                GROUP BY DATE(captured_at)
                ORDER BY recorded_date ASC
                """,
                (site_id,),
            ).fetchall()

            trend = [
                {
                    "date": row["recorded_date"],
                    "localized_count": row["localized_count"],
                }
                for row in trend_rows
            ]

            return jsonify({
                "success": True,
                "site": serialize_site(site_row),
                "sites": sites_payload,

                "summary": {
                    "total_workers": total_workers,
                    "localized_workers": localized_workers,
                    "unlocalized_workers": unlocalized_workers,

                    "localized_percent": (
                        round(
                            (localized_workers / total_workers) * 100,
                            1,
                        )
                        if total_workers else None
                    ),

                    "unlocalized_percent": (
                        round(
                            (unlocalized_workers / total_workers) * 100,
                            1,
                        )
                        if total_workers else None
                    ),
                },

                "records": records,
                "trend": trend,
            })

        except Exception as error:
            app.logger.exception(
                "Zone localization request failed: %s",
                error,
            )

            return jsonify({
                "success": False,
                "message": "Failed to load zone localization data.",
            }), 500

        finally:
            connection.close()