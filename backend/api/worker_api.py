
from datetime import datetime

from flask import jsonify, request


def register_worker_api(app, get_database, normalized_status):
    """Register worker login and Smart Hardhat availability endpoints."""

    @app.route("/api/workers/available-hardhats", methods=["GET"])
    def available_worker_hardhats():
        """List the hardhats registered to a site and mark their assignment state."""
        site_code = str(request.args.get("site_code", "")).strip()
        full_name = str(request.args.get("full_name", "")).strip()

        if not site_code:
            return jsonify({
                "success": False,
                "message": "Site Code is required.",
                "hardhats": [],
            }), 400

        connection = get_database()

        try:
            site = connection.execute(
                """
                SELECT id, site_name, site_code, status
                FROM sites
                WHERE UPPER(TRIM(site_code)) = UPPER(?)
                LIMIT 1
                """,
                (site_code,),
            ).fetchone()

            if site is None:
                return jsonify({
                    "success": False,
                    "message": "No site was found with that Site Code.",
                    "hardhats": [],
                }), 404

            if normalized_status(site["status"]) not in {"active", "existing"}:
                return jsonify({
                    "success": False,
                    "message": "This construction site is not active.",
                    "hardhats": [],
                }), 403

            rows = connection.execute(
                """
                SELECT
                    h.id,
                    h.device_code,
                    h.worker_id,
                    w.full_name AS assigned_worker_name,
                    w.status AS assigned_worker_status
                FROM smart_hardhats AS h
                LEFT JOIN workers AS w ON w.id = h.worker_id
                WHERE h.site_id = ?
                ORDER BY h.device_code COLLATE NOCASE
                """,
                (site["id"],),
            ).fetchall()

            hardhats = []

            for row in rows:
                assigned_to_current_worker = bool(
                    full_name
                    and row["assigned_worker_name"]
                    and normalized_status(
                        row["assigned_worker_status"]
                    ) == "active"
                    and row["assigned_worker_name"].strip().casefold()
                    == full_name.casefold()
                )

                is_available = (
                    row["worker_id"] is None
                    or assigned_to_current_worker
                )

                if assigned_to_current_worker:
                    display_status = "Assigned to you"
                elif row["worker_id"] is None:
                    display_status = "Available"
                else:
                    display_status = "In Use"

                hardhats.append({
                    "id": row["id"],
                    "device_code": row["device_code"],
                    "is_available": is_available,
                    "assigned_to_current_worker": assigned_to_current_worker,
                    "display_status": display_status,
                })

            message = None

            if not hardhats:
                message = "No Smart Hardhats are registered for this site yet."

            return jsonify({
                "success": True,
                "site": {
                    "id": site["id"],
                    "site_name": site["site_name"],
                    "site_code": site["site_code"],
                },
                "hardhats": hardhats,
                "message": message,
            }), 200

        except Exception as error:
            app.logger.exception(
                "Loading available worker hardhats failed: %s",
                error,
            )

            return jsonify({
                "success": False,
                "message": "Failed to load Smart Hardhats for this site.",
                "hardhats": [],
            }), 500

        finally:
            connection.close()

    @app.route("/api/workers/login", methods=["POST"])
    def worker_login():
        """Register/find a worker and atomically assign an available hardhat."""
        data = request.get_json(silent=True)

        if not data:
            return jsonify({
                "success": False,
                "message": "No data was received.",
            }), 400

        full_name = str(data.get("full_name", "")).strip()
        site_code = str(data.get("site_code", "")).strip()
        hardhat_code = str(data.get("hardhat_code", "")).strip()

        if not full_name:
            return jsonify({
                "success": False,
                "message": "Full Name is required.",
            }), 400

        if not site_code:
            return jsonify({
                "success": False,
                "message": "Site Code is required.",
            }), 400

        if not hardhat_code:
            return jsonify({
                "success": False,
                "message": "Please select a Smart Hardhat.",
            }), 400

        connection = get_database()

        try:
            # Prevent two workers from claiming the same hardhat simultaneously.
            connection.execute("BEGIN IMMEDIATE")

            site = connection.execute(
                """
                SELECT id, site_name, site_code, status
                FROM sites
                WHERE UPPER(TRIM(site_code)) = UPPER(?)
                LIMIT 1
                """,
                (site_code,),
            ).fetchone()

            if site is None:
                connection.rollback()

                return jsonify({
                    "success": False,
                    "message": "No site was found with that Site Code.",
                }), 404

            if normalized_status(site["status"]) not in {"active", "existing"}:
                connection.rollback()

                return jsonify({
                    "success": False,
                    "message": "This construction site is not active.",
                }), 403

            hardhat = connection.execute(
                """
                SELECT id, device_code, worker_id
                FROM smart_hardhats
                WHERE site_id = ?
                  AND UPPER(TRIM(device_code)) = UPPER(?)
                LIMIT 1
                """,
                (site["id"], hardhat_code),
            ).fetchone()

            if hardhat is None:
                connection.rollback()

                return jsonify({
                    "success": False,
                    "message": (
                        "That Smart Hardhat is not registered to this site. "
                        "Refresh the list and try again."
                    ),
                }), 404

            worker = connection.execute(
                """
                SELECT id, full_name, status
                FROM workers
                WHERE site_id = ?
                  AND LOWER(TRIM(full_name)) = LOWER(?)
                LIMIT 1
                """,
                (site["id"], full_name),
            ).fetchone()

            # A hardhat assigned to a different worker cannot be claimed.
            if hardhat["worker_id"] is not None and (
                worker is None or hardhat["worker_id"] != worker["id"]
            ):
                connection.rollback()

                return jsonify({
                    "success": False,
                    "message": (
                        "This Smart Hardhat is already in use. "
                        "Please select an available one."
                    ),
                }), 409

            if (
                worker is not None
                and normalized_status(worker["status"]) != "active"
            ):
                connection.rollback()

                return jsonify({
                    "success": False,
                    "message": (
                        "This worker account is not active. "
                        "Please contact the site supervisor."
                    ),
                }), 403

            if worker is None:
                created_at = datetime.now().astimezone().isoformat(
                    timespec="seconds"
                )

                cursor = connection.execute(
                    """
                    INSERT INTO workers (
                        site_id,
                        full_name,
                        worker_code,
                        status,
                        created_at
                    )
                    VALUES (?, ?, NULL, 'Active', ?)
                    """,
                    (site["id"], full_name, created_at),
                )

                worker_id = cursor.lastrowid
                saved_worker_name = full_name

            else:
                worker_id = worker["id"]
                saved_worker_name = worker["full_name"]

            # Release the worker's previous hardhat if they are switching.
            connection.execute(
                """
                UPDATE smart_hardhats
                SET worker_id = NULL
                WHERE site_id = ?
                  AND worker_id = ?
                  AND id <> ?
                """,
                (site["id"], worker_id, hardhat["id"]),
            )

            assignment = connection.execute(
                """
                UPDATE smart_hardhats
                SET worker_id = ?
                WHERE id = ?
                  AND site_id = ?
                  AND (worker_id IS NULL OR worker_id = ?)
                """,
                (
                    worker_id,
                    hardhat["id"],
                    site["id"],
                    worker_id,
                ),
            )

            if assignment.rowcount != 1:
                connection.rollback()

                return jsonify({
                    "success": False,
                    "message": (
                        "This Smart Hardhat was just assigned to another worker. "
                        "Refresh the list and try again."
                    ),
                }), 409

            connection.commit()

            return jsonify({
                "success": True,
                "message": (
                    "Worker confirmed and Smart Hardhat assigned successfully."
                ),
                "site": {
                    "id": site["id"],
                    "site_name": site["site_name"],
                    "site_code": site["site_code"],
                },
                "worker": {
                    "id": worker_id,
                    "full_name": saved_worker_name,
                    "status": "Active",
                },
                "hardhat": {
                    "id": hardhat["id"],
                    "device_code": hardhat["device_code"],
                },
            }), 200

        except Exception as error:
            connection.rollback()

            app.logger.exception("Worker login failed: %s", error)

            return jsonify({
                "success": False,
                "message": "Failed to confirm worker login.",
            }), 500

        finally:
            connection.close()