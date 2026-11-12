
import os
import shutil
import socket
import subprocess
import sys
import time
import webbrowser


# =========================
# CONFIGURATION
# =========================

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")

# Listen on all network interfaces
FRONTEND_HOST = "0.0.0.0"
BACKEND_HOST = "0.0.0.0"

# Local address used for server readiness checks
LOCAL_HOST = "127.0.0.1"

FRONTEND_PORT = 5173
BACKEND_PORT = 5000


# =========================
# NETWORK IP
# =========================

def get_local_ip():
    try:
        connection = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        connection.connect(("8.8.8.8", 80))
        ip_address = connection.getsockname()[0]
        connection.close()
        return ip_address

    except OSError:
        return "127.0.0.1"


LAN_IP = get_local_ip()

FRONTEND_BASE_URL = f"http://{LAN_IP}:{FRONTEND_PORT}"
LANDING_PAGE_URL = f"{FRONTEND_BASE_URL}/landingPage.html"


# =========================
# CHECK PROJECT FOLDERS
# =========================

def check_project_files():
    if not os.path.isdir(FRONTEND_DIR):
        print(f"[ERROR] '{FRONTEND_DIR}' folder not found.")
        print("Make sure start.py is in the main SMSYS project folder.")
        sys.exit(1)

    if not os.path.isdir(BACKEND_DIR):
        print(f"[ERROR] '{BACKEND_DIR}' folder not found.")
        sys.exit(1)

    backend_app = os.path.join(BACKEND_DIR, "app.py")

    if not os.path.isfile(backend_app):
        print("[ERROR] backend/app.py not found.")
        sys.exit(1)


# =========================
# CHECK NPM
# =========================

def check_npm():
    npm_command = "npm.cmd" if os.name == "nt" else "npm"

    if shutil.which(npm_command) is None:
        print(f"[ERROR] '{npm_command}' not found on PATH.")
        print("Install Node.js and npm first.")
        sys.exit(1)

    return npm_command


# =========================
# WAIT FOR SERVER
# =========================

def wait_for_server(host, port, name, process=None, timeout=60):
    print(f"Waiting for {name} at {host}:{port}...", flush=True)

    deadline = time.monotonic() + timeout

    while time.monotonic() < deadline:

        if process is not None and process.poll() is not None:
            print(
                f"[ERROR] {name} process stopped before becoming ready.",
                flush=True,
            )
            return False

        try:
            with socket.create_connection((host, port), timeout=1):
                print(
                    f"[OK] {name} is running at {host}:{port}.",
                    flush=True,
                )
                return True

        except OSError:
            time.sleep(0.3)

    print(
        f"[WARNING] {name} did not respond within {timeout} seconds.",
        flush=True,
    )

    return False


# =========================
# FIND A BROWSER
# =========================

def find_browser_executable():
    candidates = []

    if os.name == "nt":
        roots = [
            os.environ.get("PROGRAMFILES"),
            os.environ.get("PROGRAMFILES(X86)"),
            os.environ.get("LOCALAPPDATA"),
        ]

        for root in filter(None, roots):
            candidates.extend([
                (
                    os.path.join(
                        root,
                        "Google",
                        "Chrome",
                        "Application",
                        "chrome.exe",
                    ),
                    "chromium",
                ),
                (
                    os.path.join(
                        root,
                        "Microsoft",
                        "Edge",
                        "Application",
                        "msedge.exe",
                    ),
                    "chromium",
                ),
                (
                    os.path.join(
                        root,
                        "BraveSoftware",
                        "Brave-Browser",
                        "Application",
                        "brave.exe",
                    ),
                    "chromium",
                ),
                (
                    os.path.join(
                        root,
                        "Mozilla Firefox",
                        "firefox.exe",
                    ),
                    "firefox",
                ),
            ])

        for command, kind in [
            ("chrome.exe", "chromium"),
            ("msedge.exe", "chromium"),
            ("brave.exe", "chromium"),
            ("firefox.exe", "firefox"),
        ]:
            located = shutil.which(command)

            if located:
                candidates.append((located, kind))

    else:
        for command, kind in [
            ("google-chrome", "chromium"),
            ("chromium", "chromium"),
            ("chromium-browser", "chromium"),
            ("microsoft-edge", "chromium"),
            ("brave-browser", "chromium"),
            ("firefox", "firefox"),
        ]:
            located = shutil.which(command)

            if located:
                candidates.append((located, kind))

    seen = set()

    for path, kind in candidates:
        if path in seen:
            continue

        seen.add(path)

        if os.path.isfile(path) or shutil.which(path):
            return path, kind

    return None, None


# =========================
# OPEN LANDING PAGE
# =========================

def open_landing_page():
    print("", flush=True)
    print("Opening SMSYS Landing Page:", flush=True)
    print(f"  Landing Page: {LANDING_PAGE_URL}", flush=True)

    browser_path, browser_kind = find_browser_executable()

    if browser_path:

        if browser_kind == "firefox":
            command = [
                browser_path,
                "-new-window",
                LANDING_PAGE_URL,
            ]

        else:
            command = [
                browser_path,
                "--new-window",
                LANDING_PAGE_URL,
            ]

        try:
            subprocess.Popen(
                command,
                cwd=PROJECT_ROOT,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )

            print(
                "[OK] Landing Page opened in a new browser window.",
                flush=True,
            )

            return True

        except OSError as error:
            print(
                f"[WARNING] Could not launch the detected browser: {error}",
                flush=True,
            )

    print("[INFO] Trying the system default browser...", flush=True)

    try:
        opened = webbrowser.open(LANDING_PAGE_URL, new=1)

        if opened:
            print(
                "[OK] Landing Page opened in the default browser.",
                flush=True,
            )
            return True

    except webbrowser.Error as error:
        print(
            f"[WARNING] Could not open the Landing Page: {error}",
            flush=True,
        )

    print("[WARNING] Automatic browser opening failed.", flush=True)
    print(f"Open this URL manually: {LANDING_PAGE_URL}", flush=True)

    return False


# =========================
# STOP PROCESS
# =========================

def stop_process(process, name):
    if process is None or process.poll() is not None:
        return

    print(f"Stopping {name}...", flush=True)

    process.terminate()

    try:
        process.wait(timeout=5)

    except subprocess.TimeoutExpired:
        print(
            f"{name} did not stop in time. Forcing shutdown.",
            flush=True,
        )

        process.kill()
        process.wait(timeout=5)


# =========================
# MAIN
# =========================

def main():

    print("======================================", flush=True)
    print("      SMART HARDHAT SYSTEM", flush=True)
    print("======================================", flush=True)
    print("", flush=True)

    check_project_files()
    npm_command = check_npm()

    backend = None
    frontend = None

    try:

        # --------------------------------
        # START FLASK BACKEND
        # --------------------------------

        print("Starting Flask backend...", flush=True)

        backend_command = (
            "from app import app, initialize_database; "
            "initialize_database(); "
            "print('Starting SMSYS Backend...', flush=True); "
            "app.run("
            "host='0.0.0.0', "
            "port=5000, "
            "debug=False, "
            "use_reloader=False"
            ")"
        )

        backend = subprocess.Popen(
            [
                sys.executable,
                "-u",
                "-c",
                backend_command,
            ],
            cwd=BACKEND_DIR,
        )

        backend_ready = wait_for_server(
            LOCAL_HOST,
            BACKEND_PORT,
            "Flask Backend",
            process=backend,
            timeout=60,
        )

        # --------------------------------
        # START REACT FRONTEND
        # --------------------------------

        print("", flush=True)
        print("Starting React frontend...", flush=True)

        frontend = subprocess.Popen(
            [
                npm_command,
                "run",
                "dev",
                "--",
                "--host",
                FRONTEND_HOST,
                "--port",
                str(FRONTEND_PORT),
                "--strictPort",
            ],
            cwd=FRONTEND_DIR,
        )

        frontend_ready = wait_for_server(
            LOCAL_HOST,
            FRONTEND_PORT,
            "React Frontend",
            process=frontend,
            timeout=60,
        )

        # --------------------------------
        # STARTUP STATUS
        # --------------------------------

        print("", flush=True)
        print("======================================", flush=True)
        print("SMSYS STARTUP STATUS", flush=True)
        print("======================================", flush=True)

        print(
            f"Backend : {'READY' if backend_ready else 'NOT READY'}",
            flush=True,
        )

        print(
            f"Frontend: {'READY' if frontend_ready else 'NOT READY'}",
            flush=True,
        )

        print("", flush=True)
        print("LOCAL ACCESS:", flush=True)
        print(
            f"http://localhost:{FRONTEND_PORT}/landingPage.html",
            flush=True,
        )

        print("", flush=True)
        print("WI-FI ACCESS:", flush=True)
        print(LANDING_PAGE_URL, flush=True)

        print("", flush=True)
        print("BACKEND API:", flush=True)
        print(
            f"http://{LAN_IP}:{BACKEND_PORT}",
            flush=True,
        )

        print("======================================", flush=True)

        # --------------------------------
        # OPEN BROWSER
        # --------------------------------

        if frontend_ready:
            time.sleep(0.5)
            open_landing_page()

        else:
            print("", flush=True)
            print(
                "[WARNING] Frontend is not reachable.",
                flush=True,
            )

        print("", flush=True)
        print("Press Ctrl+C to stop SMSYS.", flush=True)

        # --------------------------------
        # KEEP BOTH SERVERS RUNNING
        # --------------------------------

        while True:

            if backend.poll() is not None:
                print("", flush=True)
                print(
                    "[ERROR] Flask backend stopped unexpectedly.",
                    flush=True,
                )
                break

            if frontend.poll() is not None:
                print("", flush=True)
                print(
                    "[ERROR] React frontend stopped unexpectedly.",
                    flush=True,
                )
                break

            time.sleep(1)

    except KeyboardInterrupt:
        print("", flush=True)
        print("Shutdown requested.", flush=True)

    finally:

        print("", flush=True)
        print("Shutting down SMSYS...", flush=True)

        stop_process(frontend, "React Frontend")
        stop_process(backend, "Flask Backend")

        print("", flush=True)
        print("SMSYS stopped.", flush=True)


if __name__ == "__main__":
    main()
