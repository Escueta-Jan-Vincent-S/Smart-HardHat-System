
from datetime import datetime, timedelta
import secrets

from flask import jsonify, request

try:
    from ..database.connection import get_database
    from ..utils.site_helpers import (
        hash_access_token,
        get_authenticated_supervisor,
        get_owned_sites,
        get_owned_site_by_id,
        serialize_site,
    )
except ImportError:
    from database.connection import get_database
    from utils.site_helpers import (
        hash_access_token,
        get_authenticated_supervisor,
        get_owned_sites,
        get_owned_site_by_id,
        serialize_site,
    )


def register_site_auth_api(app):

    # ========================================================
    # VERIFY SITE ACCESS
    # ========================================================

    @app.route("/api/sites/verify", methods=["POST"])
    def verify_site():
        data = request.get_json(silent=True)

        if not data:
            return jsonify({
                "success": False,
                "message": "No data was received.",
            }), 400

        site_name = str(data.get("site_name", "")).strip()
        site_code = str(data.get("site_code", "")).strip()
        supervisor_pin = str(data.get("supervisor_pin", "")).strip()

        if not site_name:
            return jsonify({
                "success": False,
                "message": "Site name is required.",
            }), 400

        if not site_code:
            return jsonify({
                "success": False,
                "message": "Site code is required.",
            }), 400

        if not supervisor_pin:
            return jsonify({
                "success": False,
                "message": "Supervisor PIN is required.",
            }), 400

        connection = get_database()

        try:
            site = connection.execute(
                """
                SELECT
                    sites.id,
                    sites.site_name,
                    sites.site_code,
                    sites.site_location,
                    sites.status,
                    sites.created_at,
                    supervisors.id AS supervisor_id,
                    supervisors.full_name AS supervisor_name
                FROM sites
                INNER JOIN supervisors
                    ON supervisors.site_id = sites.id
                WHERE LOWER(TRIM(sites.site_name)) = LOWER(?)
                  AND sites.site_code = ?
                  AND supervisors.supervisor_pin = ?
                LIMIT 1
                """,
                (site_name, site_code, supervisor_pin),
            ).fetchone()

            if site is None:
                return jsonify({
                    "success": False,
                    "message": (
                        "Invalid Site Name, Site Code, or Supervisor PIN."
                    ),
                }), 401

            issued_at = datetime.now().astimezone()
            expires_at = issued_at + timedelta(hours=12)
            access_token = secrets.token_urlsafe(32)

            connection.execute(
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
                    site["supervisor_id"],
                    site["id"],
                    issued_at.isoformat(timespec="seconds"),
                    expires_at.isoformat(timespec="seconds"),
                ),
            )

            connection.commit()

            return jsonify({
                "success": True,
                "message": "Site verified successfully.",
                "site": {
                    **serialize_site(site),
                    "supervisor_name": site["supervisor_name"],
                    "access_token": access_token,
                    "token_type": "Bearer",
                    "expires_at": expires_at.isoformat(timespec="seconds"),
                },
            }), 200

        except Exception as error:
            app.logger.exception("Site verification failed: %s", error)

            return jsonify({
                "success": False,
                "message": "Failed to verify the site.",
            }), 500

        finally:
            connection.close()

    # ========================================================
    # DASHBOARD LOGIN
    # ========================================================

    @app.route("/api/dashboard/login", methods=["POST"])
    def dashboard_login():
        """Verify dashboard credentials, including supervisor full name."""
        data = request.get_json(silent=True)

        if not data:
            return jsonify({
                "success": False,
                "message": "No data was received.",
            }), 400

        site_name = str(data.get("site_name", "")).strip()
        site_code = str(data.get("site_code", "")).strip()
        supervisor_name = str(data.get("full_name", "")).strip()
        supervisor_pin = str(data.get("supervisor_pin", "")).strip()

        if not site_name:
            return jsonify({
                "success": False,
                "message": "Site Name is required.",
            }), 400

        if not site_code:
            return jsonify({
                "success": False,
                "message": "Site Code is required.",
            }), 400

        if not supervisor_name:
            return jsonify({
                "success": False,
                "message": "Full Name is required.",
            }), 400

        if not supervisor_pin:
            return jsonify({
                "success": False,
                "message": "Supervisor PIN is required.",
            }), 400

        connection = get_database()

        try:
            site = connection.execute(
                """
                SELECT
                    sites.id,
                    sites.site_name,
                    sites.site_code,
                    sites.site_location,
                    sites.status,
                    sites.created_at,
                    supervisors.id AS supervisor_id,
                    supervisors.full_name AS supervisor_name
                FROM sites
                INNER JOIN supervisors
                    ON supervisors.site_id = sites.id
                WHERE LOWER(TRIM(sites.site_name)) = LOWER(?)
                  AND sites.site_code = ?
                  AND LOWER(TRIM(supervisors.full_name)) = LOWER(?)
                  AND supervisors.supervisor_pin = ?
                LIMIT 1
                """,
                (
                    site_name,
                    site_code,
                    supervisor_name,
                    supervisor_pin,
                ),
            ).fetchone()

            if site is None:
                return jsonify({
                    "success": False,
                    "message": (
                        "Invalid Site Name, Site Code, Full Name, "
                        "or Supervisor PIN."
                    ),
                }), 401

            issued_at = datetime.now().astimezone()
            expires_at = issued_at + timedelta(hours=12)
            access_token = secrets.token_urlsafe(32)

            connection.execute(
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
                    site["supervisor_id"],
                    site["id"],
                    issued_at.isoformat(timespec="seconds"),
                    expires_at.isoformat(timespec="seconds"),
                ),
            )

            connection.commit()

            return jsonify({
                "success": True,
                "message": "Dashboard login successful.",
                "site": {
                    **serialize_site(site),
                    "supervisor_name": site["supervisor_name"],
                    "access_token": access_token,
                    "token_type": "Bearer",
                    "expires_at": expires_at.isoformat(timespec="seconds"),
                },
            }), 200

        except Exception as error:
            app.logger.exception("Dashboard login failed: %s", error)

            return jsonify({
                "success": False,
                "message": "Failed to verify dashboard login.",
            }), 500

        finally:
            connection.close()

    # ========================================================
    # AUTHENTICATED SUPERVISOR SITES
    # ========================================================

    @app.route("/api/sites/mine", methods=["GET"])
    def my_sites():
        """Return only sites associated with the authenticated supervisor."""

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

            requested_site_id = request.args.get(
                "site_id",
                type=int,
            )

            if requested_site_id is not None:
                site = get_owned_site_by_id(
                    connection,
                    requested_site_id,
                    supervisor["supervisor_name"],
                )

                if site is None:
                    return jsonify({
                        "success": False,
                        "message": (
                            "You do not have permission to access this site."
                        ),
                    }), 403

            else:
                site = sites[0] if sites else None

            return jsonify({
                "success": True,
                "site": serialize_site(site),
                "sites": [
                    serialize_site(row)
                    for row in sites
                ],
                "supervisor_name": supervisor["supervisor_name"],
            }), 200

        except Exception as error:
            app.logger.exception(
                "Loading supervisor sites failed: %s",
                error,
            )

            return jsonify({
                "success": False,
                "message": "Failed to load supervisor sites.",
            }), 500

        finally:
            connection.close()

    # ========================================================
    # SUPERVISOR LOGOUT
    # ========================================================

    @app.route("/api/auth/logout", methods=["POST"])
    def api_logout():
        """Revoke the bearer token used by the current dashboard session."""

        authorization = request.headers.get("Authorization", "")
        scheme, separator, token = authorization.partition(" ")

        connection = get_database()

        try:
            if (
                separator
                and scheme.lower() == "bearer"
                and token.strip()
            ):
                connection.execute(
                    """
                    DELETE FROM supervisor_sessions
                    WHERE token_hash = ?
                    """,
                    (hash_access_token(token.strip()),),
                )

                connection.commit()

            return jsonify({
                "success": True,
                "message": "Logged out.",
            }), 200

        except Exception as error:
            app.logger.exception("Logout failed: %s", error)

            return jsonify({
                "success": False,
                "message": "Could not revoke the session.",
            }), 500

        finally:
            connection.close()