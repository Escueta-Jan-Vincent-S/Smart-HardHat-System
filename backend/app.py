
from flask import Flask
from flask_cors import CORS

# ============================================================
# DATABASE
# ============================================================

try:
    from .database.connection import get_database
    from .database.initialization import initialize_database
except ImportError:
    from database.connection import get_database
    from database.initialization import initialize_database


# ============================================================
# SHARED HELPERS
# ============================================================

try:
    from .utils.site_helpers import (
        get_authenticated_supervisor,
        get_owned_site_by_id,
        get_owned_sites,
        serialize_site,
    )
    from .utils.status_helpers import (
        display_device_status,
        normalized_status,
    )
except ImportError:
    from utils.site_helpers import (
        get_authenticated_supervisor,
        get_owned_site_by_id,
        get_owned_sites,
        serialize_site,
    )
    from utils.status_helpers import (
        display_device_status,
        normalized_status,
    )


# ============================================================
# API MODULES
# ============================================================

try:
    from .api.system_api import register_system_api
    from .api.site_api import register_site_api
    from .api.site_auth_api import register_site_auth_api
    from .api.dashboard_overview_api import register_dashboard_overview_api
    from .api.ppe_status_api import register_ppe_status_api
    from .api.drowsiness_status_api import register_drowsiness_status_api
    from .api.device_connectivity_api import register_device_connectivity_api
    from .api.alerts_history_api import register_alerts_history_api
    from .api.worker_api import register_worker_api
    from .api.zone_localization_api import register_zone_localization_api

except ImportError:
    from api.system_api import register_system_api
    from api.site_api import register_site_api
    from api.site_auth_api import register_site_auth_api
    from api.dashboard_overview_api import register_dashboard_overview_api
    from api.ppe_status_api import register_ppe_status_api
    from api.drowsiness_status_api import register_drowsiness_status_api
    from api.device_connectivity_api import register_device_connectivity_api
    from api.alerts_history_api import register_alerts_history_api
    from api.worker_api import register_worker_api
    from api.zone_localization_api import register_zone_localization_api


# ============================================================
# FLASK APPLICATION
# ============================================================

app = Flask(__name__)
CORS(app)


# ============================================================
# REGISTER API ROUTES
# ============================================================

register_system_api(app)
register_site_api(app)
register_site_auth_api(app)
register_dashboard_overview_api(app)
register_ppe_status_api(app)

register_drowsiness_status_api(
    app=app,
    get_database=get_database,
    get_authenticated_supervisor=get_authenticated_supervisor,
    get_owned_sites=get_owned_sites,
    get_owned_site_by_id=get_owned_site_by_id,
    serialize_site=serialize_site,
    normalized_status=normalized_status,
)

register_device_connectivity_api(
    app=app,
    get_database=get_database,
    get_authenticated_supervisor=get_authenticated_supervisor,
    get_owned_sites=get_owned_sites,
    get_owned_site_by_id=get_owned_site_by_id,
    serialize_site=serialize_site,
    display_device_status=display_device_status,
)

register_alerts_history_api(
    app=app,
    get_database=get_database,
    get_authenticated_supervisor=get_authenticated_supervisor,
    get_owned_sites=get_owned_sites,
    get_owned_site_by_id=get_owned_site_by_id,
)

register_worker_api(
    app=app,
    get_database=get_database,
    normalized_status=normalized_status,
)

register_zone_localization_api(app)


print("\n========== REGISTERED API ROUTES ==========")

for rule in app.url_map.iter_rules():
    print(rule.methods, rule.rule)

print("===========================================\n")


# ============================================================
# START BACKEND
# ============================================================

if __name__ == "__main__":
    initialize_database()

    print("Starting SMSYS Backend...")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
    )
