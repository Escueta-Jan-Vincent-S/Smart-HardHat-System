import hashlib
import secrets
import string
from datetime import datetime

from flask import request


def generate_site_prefix(site_name):
    cleaned_name = ""

    for character in site_name.upper():
        if character in string.ascii_uppercase:
            cleaned_name += character

    if len(cleaned_name) >= 3:
        return cleaned_name[:3]

    return (cleaned_name + "SMS")[:3]


def generate_site_code(site_name):
    prefix = generate_site_prefix(site_name)
    first_number = secrets.randbelow(900) + 100
    second_number = secrets.randbelow(9000) + 1000

    return f"{prefix}-{first_number}-{second_number}"


def generate_supervisor_pin():
    return str(secrets.randbelow(900000) + 100000)


def serialize_site(site):
    if site is None:
        return None

    return {
        "id": site["id"],
        "site_name": site["site_name"],
        "site_code": site["site_code"],
        "site_location": site["site_location"],
        "status": site["status"],
        "created_at": site["created_at"],
    }


def hash_access_token(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_authenticated_supervisor(connection):
    """Resolve a valid, unexpired bearer token to its saved supervisor identity."""
    authorization = request.headers.get("Authorization", "")
    scheme, separator, token = authorization.partition(" ")

    if not separator or scheme.lower() != "bearer" or not token.strip():
        return None

    session = connection.execute(
        """
        SELECT
            sessions.id AS session_id,
            sessions.supervisor_id,
            sessions.site_id,
            sessions.expires_at,
            supervisors.full_name AS supervisor_name
        FROM supervisor_sessions AS sessions
        INNER JOIN supervisors ON supervisors.id = sessions.supervisor_id
        WHERE sessions.token_hash = ?
        LIMIT 1
        """,
        (hash_access_token(token.strip()),),
    ).fetchone()

    if session is None:
        return None

    try:
        expires_at = datetime.fromisoformat(session["expires_at"])
        now = datetime.now().astimezone()

        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=now.tzinfo)

    except (TypeError, ValueError):
        expires_at = datetime.min.replace(
            tzinfo=datetime.now().astimezone().tzinfo
        )

    if expires_at <= datetime.now().astimezone():
        connection.execute(
            "DELETE FROM supervisor_sessions WHERE id = ?",
            (session["session_id"],),
        )
        connection.commit()
        return None

    return session


def get_owned_sites(connection, supervisor_name):
    """Sites associated with the authenticated supervisor name, never all sites."""
    return connection.execute(
        """
        SELECT DISTINCT
            sites.id,
            sites.site_name,
            sites.site_code,
            sites.site_location,
            sites.status,
            sites.created_at
        FROM sites
        INNER JOIN supervisors AS site_supervisor
            ON site_supervisor.site_id = sites.id
        WHERE LOWER(TRIM(site_supervisor.full_name)) = LOWER(TRIM(?))
        ORDER BY sites.id DESC
        """,
        (supervisor_name,),
    ).fetchall()


def get_owned_site_by_id(connection, site_id, supervisor_name):
    """Return a site only when its associated supervisor matches the login."""
    return connection.execute(
        """
        SELECT DISTINCT
            sites.id,
            sites.site_name,
            sites.site_code,
            sites.site_location,
            sites.status,
            sites.created_at
        FROM sites
        INNER JOIN supervisors AS site_supervisor
            ON site_supervisor.site_id = sites.id
        WHERE sites.id = ?
          AND LOWER(TRIM(site_supervisor.full_name)) = LOWER(TRIM(?))
        LIMIT 1
        """,
        (site_id, supervisor_name),
    ).fetchone()
