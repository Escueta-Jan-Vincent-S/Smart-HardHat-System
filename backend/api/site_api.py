
from datetime import datetime, timedelta
import secrets

from flask import jsonify, request

try:
    from ..database.connection import get_database
    from ..utils.site_helpers import (
        generate_site_code,
        generate_supervisor_pin,
        hash_access_token,
    )
except ImportError:
    from database.connection import get_database
    from utils.site_helpers import (
        generate_site_code,
        generate_supervisor_pin,
        hash_access_token,
    )


def register_site_api(app):

    # ========================================================
    # CREATE SITE
    # ========================================================

    @app.route("/api/sites/create", methods=["POST"])
    def create_site():
        data = request.get_json(silent=True)

        if not data:
            return jsonify({
                "success": False,
                "message": "No data was received.",
            }), 400

        site_name = str(data.get("site_name", "")).strip()
        site_location = str(data.get("site_location", "")).strip()
        province = str(data.get("province", "")).strip()
        municipality_city = str(data.get("municipality_city", "")).strip()
        barangay = str(data.get("barangay", "")).strip()
        supervisor_name = str(data.get("supervisor_name", "")).strip()

        if not site_name:
            return jsonify({
                "success": False,
                "message": "Site name is required.",
            }), 400

        if not site_location and province and municipality_city and barangay:
            site_location = f"{barangay}, {municipality_city}, {province}"

        if not site_location:
            return jsonify({
                "success": False,
                "message": "Site location is required.",
            }), 400

        if not supervisor_name:
            return jsonify({
                "success": False,
                "message": "Supervisor full name is required.",
            }), 400

        connection = get_database()
        cursor = connection.cursor()

        try:
            while True:
                site_code = generate_site_code(site_name)

                exists = cursor.execute(
                    "SELECT id FROM sites WHERE site_code = ?",
                    (site_code,),
                ).fetchone()

                if exists is None:
                    break

            supervisor_pin = generate_supervisor_pin()

            issued_at = datetime.now().astimezone()
            expires_at = issued_at + timedelta(hours=12)

            created_at = issued_at.isoformat(timespec="seconds")

            cursor.execute(
                """
                INSERT INTO sites (
                    site_name,
                    site_code,
                    site_location,
                    status,
                    created_at
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (
                    site_name,
                    site_code,
                    site_location,
                    "Active",
                    created_at,
                ),
            )

            site_id = cursor.lastrowid

            cursor.execute(
                """
                INSERT INTO supervisors (
                    site_id,
                    full_name,
                    supervisor_pin,
                    created_at
                ) VALUES (?, ?, ?, ?)
                """,
                (
                    site_id,
                    supervisor_name,
                    supervisor_pin,
                    created_at,
                ),
            )

            supervisor_id = cursor.lastrowid

            # Generate an authenticated supervisor session.
            access_token = secrets.token_urlsafe(32)

            cursor.execute(
                """
                INSERT INTO supervisor_sessions (
                    token_hash,
                    supervisor_id,
                    site_id,
                    created_at,
                    expires_at
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (
                    hash_access_token(access_token),
                    supervisor_id,
                    site_id,
                    created_at,
                    expires_at.isoformat(timespec="seconds"),
                ),
            )

            connection.commit()

            return jsonify({
                "success": True,
                "message": "Site created successfully.",
                "site": {
                    "id": site_id,
                    "site_name": site_name,
                    "site_code": site_code,
                    "site_location": site_location,
                    "province": province,
                    "municipality_city": municipality_city,
                    "barangay": barangay,
                    "supervisor_name": supervisor_name,
                    "supervisor_pin": supervisor_pin,
                    "status": "Active",
                    "created_at": created_at,
                    "access_token": access_token,
                    "token_type": "Bearer",
                    "expires_at": expires_at.isoformat(timespec="seconds"),
                },
            }), 201

        except Exception as error:
            connection.rollback()
            app.logger.exception("Site creation failed: %s", error)

            return jsonify({
                "success": False,
                "message": "Failed to create the site.",
            }), 500

        finally:
            connection.close()

    # ========================================================
    # CREATE SITE FOR AN EXISTING SUPERVISOR
    # ========================================================

    @app.route("/api/sites/create-existing", methods=["POST"])
    def create_site_existing_supervisor():
        data = request.get_json(silent=True)

        if not data:
            return jsonify({
                "success": False,
                "message": "No data was received.",
            }), 400

        site_name = str(data.get("site_name", "")).strip()
        province = str(data.get("province", "")).strip()
        municipality_city = str(data.get("municipality_city", "")).strip()
        barangay = str(data.get("barangay", "")).strip()
        supervisor_name = str(data.get("supervisor_name", "")).strip()
        supervisor_pin = str(data.get("supervisor_pin", "")).strip()

        if not site_name:
            return jsonify({
                "success": False,
                "message": "Site name is required.",
            }), 400

        if not province:
            return jsonify({
                "success": False,
                "message": "Province is required.",
            }), 400

        if not municipality_city:
            return jsonify({
                "success": False,
                "message": "Municipality or city is required.",
            }), 400

        if not barangay:
            return jsonify({
                "success": False,
                "message": "Barangay is required.",
            }), 400

        if not supervisor_name:
            return jsonify({
                "success": False,
                "message": "Supervisor full name is required.",
            }), 400

        if not supervisor_pin:
            return jsonify({
                "success": False,
                "message": "Supervisor PIN is required.",
            }), 400

        if not supervisor_pin.isdigit() or len(supervisor_pin) != 6:
            return jsonify({
                "success": False,
                "message": "Supervisor PIN must be 6 digits.",
            }), 400

        site_location = f"{barangay}, {municipality_city}, {province}"

        connection = get_database()
        cursor = connection.cursor()

        try:
            existing_supervisor = cursor.execute(
                """
                SELECT id, full_name, supervisor_pin
                FROM supervisors
                WHERE LOWER(TRIM(full_name)) = LOWER(TRIM(?))
                ORDER BY id DESC
                LIMIT 1
                """,
                (supervisor_name,),
            ).fetchone()

            if (
                existing_supervisor is None
                or not secrets.compare_digest(
                    str(existing_supervisor["supervisor_pin"]).strip(),
                    supervisor_pin,
                )
            ):
                return jsonify({
                    "success": False,
                    "message": (
                        "Supervisor full name or PIN is incorrect. "
                        "Please check your details."
                    ),
                }), 401

            while True:
                site_code = generate_site_code(site_name)

                exists = cursor.execute(
                    "SELECT id FROM sites WHERE site_code = ?",
                    (site_code,),
                ).fetchone()

                if exists is None:
                    break

            verified_pin = str(
                existing_supervisor["supervisor_pin"]
            ).strip()

            issued_at = datetime.now().astimezone()
            expires_at = issued_at + timedelta(hours=12)

            created_at = issued_at.isoformat(timespec="seconds")

            cursor.execute(
                """
                INSERT INTO sites (
                    site_name,
                    site_code,
                    site_location,
                    status,
                    created_at
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (
                    site_name,
                    site_code,
                    site_location,
                    "Active",
                    created_at,
                ),
            )

            site_id = cursor.lastrowid

            cursor.execute(
                """
                INSERT INTO supervisors (
                    site_id,
                    full_name,
                    supervisor_pin,
                    created_at
                ) VALUES (?, ?, ?, ?)
                """,
                (
                    site_id,
                    existing_supervisor["full_name"],
                    verified_pin,
                    created_at,
                ),
            )

            supervisor_id = cursor.lastrowid

            # Generate an authenticated session for the new site.
            access_token = secrets.token_urlsafe(32)

            cursor.execute(
                """
                INSERT INTO supervisor_sessions (
                    token_hash,
                    supervisor_id,
                    site_id,
                    created_at,
                    expires_at
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (
                    hash_access_token(access_token),
                    supervisor_id,
                    site_id,
                    created_at,
                    expires_at.isoformat(timespec="seconds"),
                ),
            )

            connection.commit()

            return jsonify({
                "success": True,
                "message": (
                    "Site created successfully for the existing supervisor."
                ),
                "site": {
                    "id": site_id,
                    "site_name": site_name,
                    "site_code": site_code,
                    "site_location": site_location,
                    "province": province,
                    "municipality_city": municipality_city,
                    "barangay": barangay,
                    "supervisor_name": existing_supervisor["full_name"],
                    "supervisor_pin": verified_pin,
                    "status": "Active",
                    "created_at": created_at,
                    "access_token": access_token,
                    "token_type": "Bearer",
                    "expires_at": expires_at.isoformat(timespec="seconds"),
                },
            }), 201

        except Exception as error:
            connection.rollback()
            app.logger.exception(
                "Existing-supervisor site creation failed: %s",
                error,
            )

            return jsonify({
                "success": False,
                "message": "Failed to create the site.",
            }), 500

        finally:
            connection.close()
