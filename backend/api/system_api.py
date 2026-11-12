from flask import jsonify


def register_system_api(app):

    # ========================================================
    # STATUS / HEALTH CHECK
    # ========================================================

    @app.route("/api/status", methods=["GET"])
    def api_status():
        return jsonify({
            "system": "SMSYS",
            "backend": "online",
            "database": "SQLite",
            "status": "ok",
        })
