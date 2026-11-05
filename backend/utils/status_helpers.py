def normalized_status(value):
    return (
        str(value or "")
        .strip()
        .lower()
        .replace("-", "_")
        .replace(" ", "_")
    )


def is_known_status(value):
    return normalized_status(value) not in {
        "",
        "unknown",
        "unmonitored",
        "not_monitored",
        "n_a",
        "na",
        "none",
        "pending",
    }


def is_compliant_status(value):
    return normalized_status(value) in {
        "present",
        "compliant",
        "ok",
        "yes",
        "true",
        "1",
        "detected",
        "safe",
    }


def display_drowsiness_status(value):
    status = normalized_status(value)

    if status in {"normal", "awake", "not_drowsy", "alert"}:
        return "Awake"

    if "drowsy" in status or "drowsiness" in status:
        return "Drowsy"

    return "Unmonitored"


def display_device_status(value):
    status = normalized_status(value)

    if status in {"online", "connected", "active"}:
        return "Online"

    if status in {"offline", "disconnected"}:
        return "Offline"

    return "Unmonitored"


def display_zone(floor, zone):
    if floor is None or zone is None:
        return "Unmonitored"

    floor_text = str(floor).strip()
    zone_text = str(zone).strip()

    if not floor_text or not zone_text:
        return "Unmonitored"

    if not floor_text.lower().startswith("floor"):
        floor_text = f"Floor {floor_text}"

    if not zone_text.lower().startswith("zone"):
        zone_text = f"Zone {zone_text}"

    return f"{floor_text}: {zone_text}"
