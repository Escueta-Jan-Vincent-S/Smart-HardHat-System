try:
    from .connection import get_database
except ImportError:
    from database.connection import get_database


def initialize_database():
    connection = get_database()
    cursor = connection.cursor()

    try:
        # Sites
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS sites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                site_name TEXT NOT NULL,
                site_code TEXT NOT NULL UNIQUE,
                site_location TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Active',
                created_at TEXT NOT NULL
            )
            """
        )

        # Supervisors
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS supervisors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                site_id INTEGER NOT NULL,
                full_name TEXT NOT NULL,
                supervisor_pin TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (site_id)
                    REFERENCES sites(id)
                    ON DELETE CASCADE
            )
            """
        )

        # Supervisor sessions
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS supervisor_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token_hash TEXT NOT NULL UNIQUE,
                supervisor_id INTEGER NOT NULL,
                site_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (supervisor_id)
                    REFERENCES supervisors(id)
                    ON DELETE CASCADE,
                FOREIGN KEY (site_id)
                    REFERENCES sites(id)
                    ON DELETE CASCADE
            )
            """
        )

        # Workers
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS workers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                site_id INTEGER NOT NULL,
                full_name TEXT NOT NULL,
                worker_code TEXT,
                status TEXT NOT NULL DEFAULT 'Active',
                created_at TEXT NOT NULL,
                UNIQUE (site_id, worker_code),
                FOREIGN KEY (site_id)
                    REFERENCES sites(id)
                    ON DELETE CASCADE
            )
            """
        )

        # Smart hardhats
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS smart_hardhats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                site_id INTEGER NOT NULL,
                device_code TEXT NOT NULL,
                worker_id INTEGER,
                status TEXT NOT NULL DEFAULT 'Unmonitored',
                last_seen TEXT,
                created_at TEXT NOT NULL,
                UNIQUE (site_id, device_code),
                FOREIGN KEY (site_id)
                    REFERENCES sites(id)
                    ON DELETE CASCADE,
                FOREIGN KEY (worker_id)
                    REFERENCES workers(id)
                    ON DELETE SET NULL
            )
            """
        )

        # Monitoring records
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS monitoring_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                site_id INTEGER NOT NULL,
                worker_id INTEGER,
                hardhat_id INTEGER NOT NULL,
                ppe_hardhat_status TEXT,
                ppe_vest_status TEXT,
                ppe_gloves_status TEXT,
                ppe_boots_status TEXT,
                face_visible INTEGER,
                drowsiness_status TEXT,
                floor TEXT,
                zone TEXT,
                duration_ms INTEGER,
                frame_path TEXT,
                captured_at TEXT NOT NULL,
                FOREIGN KEY (site_id)
                    REFERENCES sites(id)
                    ON DELETE CASCADE,
                FOREIGN KEY (worker_id)
                    REFERENCES workers(id)
                    ON DELETE SET NULL,
                FOREIGN KEY (hardhat_id)
                    REFERENCES smart_hardhats(id)
                    ON DELETE CASCADE
            )
            """
        )

        # Alerts
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                site_id INTEGER NOT NULL,
                worker_id INTEGER,
                hardhat_id INTEGER,
                alert_type TEXT NOT NULL,
                message TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Active',
                frame_path TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (site_id)
                    REFERENCES sites(id)
                    ON DELETE CASCADE,
                FOREIGN KEY (worker_id)
                    REFERENCES workers(id)
                    ON DELETE SET NULL,
                FOREIGN KEY (hardhat_id)
                    REFERENCES smart_hardhats(id)
                    ON DELETE SET NULL
            )
            """
        )

        # Indexes
        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_supervisor_sessions_expiry
            ON supervisor_sessions(expires_at)
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_workers_site
            ON workers(site_id)
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_hardhats_site
            ON smart_hardhats(site_id)
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_monitoring_site_time
            ON monitoring_records(site_id, captured_at)
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_monitoring_hardhat_time
            ON monitoring_records(hardhat_id, captured_at)
            """
        )

        cursor.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_alerts_site_time
            ON alerts(site_id, created_at)
            """
        )

        connection.commit()

        print("[DATABASE] SQLite database initialized.")

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()
