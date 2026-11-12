import os

from flask import jsonify, request, send_file

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
    )


BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

PROJECT_ROOT = os.path.dirname(BASE_DIR)


def resolve_local_frame_path(saved_path):
    """Resolve a saved frame path only when the file is inside the project folder."""

    raw_path = str(saved_path or "").strip()

    if not raw_path or raw_path.lower().startswith(
        ("https://", "http://")
    ):
        return None

    normalized_path = raw_path.replace("\\", os.sep)

    if os.path.isabs(normalized_path):
        candidates = [normalized_path]
    else:
        relative_path = normalized_path.lstrip("/\\")

        candidates = [
            os.path.join(BASE_DIR, relative_path),
            os.path.join(PROJECT_ROOT, relative_path),
        ]

    project_root_real = os.path.realpath(PROJECT_ROOT)

    for candidate in candidates:
        resolved = os.path.realpath(candidate)

        try:
            inside_project = (
                os.path.commonpath([
                    project_root_real,
                    resolved,
                ]) == project_root_real
            )
        except ValueError:
            inside_project = False

        if inside_project and os.path.isfile(resolved):
            return resolved

    return None


def register_ppe_status_api(app):

    # ========================================================
    # PPE STATUS PAGE API
    # ========================================================

    @app.route("/api/dashboard/ppe-status", methods=["GET"])
    def dashboard_ppe_status():
        """Return real PPE status for one authorized construction site."""

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
                "compliant_devices": 0,
                "violation_devices": 0,
                "unmonitored_devices": 0,
                "compliant_percent": None,
                "violation_percent": None,
                "unmonitored_percent": None,
            }

            if site_row is None:
                return jsonify({
                    "success": True,
                    "site": None,
                    "sites": sites_payload,
                    "summary": empty_summary,
                    "records": [],
                    "frames": [],
                })

            site_id = site_row["id"]

            device_rows = connection.execute(
                """
                SELECT
                    h.id AS hardhat_id,
                    h.device_code,
                    h.status AS device_status,
                    h.last_seen,
                    COALESCE(
                        monitoring_worker.full_name,
                        device_worker.full_name,
                        'Unassigned'
                    ) AS worker_name,
                    m.id AS monitoring_id,
                    m.ppe_hardhat_status,
                    m.ppe_vest_status,
                    m.ppe_gloves_status,
                    m.ppe_boots_status,
                    m.frame_path,
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
                ORDER BY h.device_code
                """,
                (site_id,),
            ).fetchall()

            ppe_fields = {
                "hardhat": "ppe_hardhat_status",
                "vest": "ppe_vest_status",
                "gloves": "ppe_gloves_status",
                "boots": "ppe_boots_status",
            }

            summary_counts = {
                "Compliant": 0,
                "Violation": 0,
                "Unmonitored": 0,
            }

            records = []

            for row in device_rows:
                item_statuses = {}

                for item, field in ppe_fields.items():
                    value = row[field]

                    if not is_known_status(value):
                        item_statuses[item] = "Unmonitored"

                    elif is_compliant_status(value):
                        item_statuses[item] = "Compliant"

                    else:
                        item_statuses[item] = "Violation"

                # A device is compliant only when all four PPE items
                # were checked. Any known missing/non-compliant item
                # makes it a violation.
                if "Violation" in item_statuses.values():
                    overall_status = "Violation"

                elif all(
                    value == "Compliant"
                    for value in item_statuses.values()
                ):
                    overall_status = "Compliant"

                else:
                    overall_status = "Unmonitored"

                summary_counts[overall_status] += 1

                records.append({
                    "device_id": row["device_code"],
                    "worker_name": (
                        row["worker_name"] or "Unassigned"
                    ),
                    "hardhat": item_statuses["hardhat"],
                    "vest": item_statuses["vest"],
                    "gloves": item_statuses["gloves"],
                    "boots": item_statuses["boots"],
                    "overall_status": overall_status,
                    "captured_at": (
                        row["captured_at"] or row["last_seen"]
                    ),
                    "monitoring_id": row["monitoring_id"],
                })

            total_devices = len(records)

            compliant_devices = summary_counts["Compliant"]
            violation_devices = summary_counts["Violation"]
            unmonitored_devices = summary_counts["Unmonitored"]

            frame_rows = connection.execute(
                """
                SELECT
                    m.id,
                    m.frame_path,
                    m.captured_at,
                    h.device_code,
                    COALESCE(
                        monitoring_worker.full_name,
                        device_worker.full_name,
                        'Unassigned'
                    ) AS worker_name
                FROM smart_hardhats AS h
                JOIN monitoring_records AS m
                    ON m.id = (
                        SELECT mr.id
                        FROM monitoring_records AS mr
                        WHERE mr.hardhat_id = h.id
                          AND mr.site_id = h.site_id
                          AND mr.frame_path IS NOT NULL
                          AND TRIM(mr.frame_path) <> ''
                        ORDER BY mr.captured_at DESC, mr.id DESC
                        LIMIT 1
                    )
                LEFT JOIN workers AS device_worker
                    ON device_worker.id = h.worker_id
                LEFT JOIN workers AS monitoring_worker
                    ON monitoring_worker.id = m.worker_id
                WHERE h.site_id = ?
                ORDER BY m.captured_at DESC, m.id DESC
                LIMIT 3
                """,
                (site_id,),
            ).fetchall()

            frames = []

            for row in frame_rows:
                saved_path = str(
                    row["frame_path"] or ""
                ).strip()

                is_remote_url = saved_path.lower().startswith(
                    ("https://", "http://")
                )

                frames.append({
                    "id": row["id"],
                    "device_id": row["device_code"],
                    "worker_name": (
                        row["worker_name"] or "Unassigned"
                    ),
                    "captured_at": row["captured_at"],
                    "frame_url": (
                        saved_path if is_remote_url else None
                    ),
                })

            return jsonify({
                "success": True,
                "site": serialize_site(site_row),
                "sites": sites_payload,
                "summary": {
                    "total_devices": total_devices,
                    "compliant_devices": compliant_devices,
                    "violation_devices": violation_devices,
                    "unmonitored_devices": unmonitored_devices,
                    "compliant_percent": (
                        round(
                            (compliant_devices / total_devices) * 100,
                            1,
                        )
                        if total_devices else None
                    ),
                    "violation_percent": (
                        round(
                            (violation_devices / total_devices) * 100,
                            1,
                        )
                        if total_devices else None
                    ),
                    "unmonitored_percent": (
                        round(
                            (unmonitored_devices / total_devices) * 100,
                            1,
                        )
                        if total_devices else None
                    ),
                },
                "records": records,
                "frames": frames,
            })

        except Exception as error:
            app.logger.exception(
                "PPE status request failed: %s",
                error,
            )

            return jsonify({
                "success": False,
                "message": "Failed to load PPE status.",
            }), 500

        finally:
            connection.close()

    # ========================================================
    # PPE DETECTION FRAME API
    # ========================================================

    @app.route(
        "/api/dashboard/ppe-frames/<int:record_id>",
        methods=["GET"],
    )
    def dashboard_ppe_frame(record_id):
        """Serve a local detection frame after validating the supervisor session and site."""

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

            record = connection.execute(
                """
                SELECT id, site_id, frame_path
                FROM monitoring_records
                WHERE id = ?
                LIMIT 1
                """,
                (record_id,),
            ).fetchone()

            if record is None:
                return jsonify({
                    "success": False,
                    "message": "Detection frame was not found.",
                }), 404

            owned_site = get_owned_site_by_id(
                connection,
                record["site_id"],
                supervisor["supervisor_name"],
            )

            if owned_site is None:
                return jsonify({
                    "success": False,
                    "message": (
                        "You do not have permission to access this frame."
                    ),
                }), 403

            frame_path = resolve_local_frame_path(
                record["frame_path"]
            )

            if frame_path is None:
                return jsonify({
                    "success": False,
                    "message": (
                        "The saved detection frame file is unavailable."
                    ),
                }), 404

            response = send_file(
                frame_path,
                conditional=True,
            )

            response.headers["Cache-Control"] = "private, no-store"

            return response

        except Exception as error:
            app.logger.exception(
                "PPE frame request failed: %s",
                error,
            )

            return jsonify({
                "success": False,
                "message": "Failed to load the detection frame.",
            }), 500

        finally:
            connection.close()
