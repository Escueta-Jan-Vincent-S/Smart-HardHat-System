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

FRONTEND_DIR = "frontend"
BACKEND_DIR = "backend"

FRONTEND_HOST = "127.0.0.1"
FRONTEND_PORT = 5173

BACKEND_HOST = "127.0.0.1"
BACKEND_PORT = 5000

SITE_CREATION_URL = f"http://localhost:{FRONTEND_PORT}/create-site"
DASHBOARD_URL = f"http://localhost:{FRONTEND_PORT}/dashboard-login"
WORKER_URL = f"http://localhost:{FRONTEND_PORT}/worker-login"


# =========================
# CHECK PROJECT FOLDERS
# =========================

def check_project_files():
    if not os.path.isdir(FRONTEND_DIR):
        print(f"[ERROR] '{FRONTEND_DIR}' folder not found.")
        print(
            "Run this script from the project root "
            "(the folder containing frontend/ and backend/)."
        )
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

def wait_for_server(host, port, name, timeout=30):
    print(f"Waiting for {name}...")

    start_time = time.time()

    while time.time() - start_time < timeout:
        try:
            with socket.create_connection(
                (host, port),
                timeout=1
            ):
                print(f"[OK] {name} is running.")
                return True

        except OSError:
            time.sleep(0.3)

    print(f"[WARNING] {name} did not respond within {timeout} seconds.")

    return False


# =========================
# STOP PROCESS
# =========================

def stop_process(process, name):
    if process is None:
        return

    if process.poll() is not None:
        return

    print(f"Stopping {name}...")

    process.terminate()

    try:
        process.wait(timeout=5)

    except subprocess.TimeoutExpired:
        print(f"{name} did not stop in time. Forcing shutdown.")
        process.kill()


# =========================
# OPEN WEBSITE TABS
# =========================

def open_website_tabs():
    websites = [
        ("Site Creation", SITE_CREATION_URL),
        ("Dashboard", DASHBOARD_URL),
        ("Worker", WORKER_URL),
    ]

    print()
    print("Opening SMSYS websites:")

    for name, url in websites:
        print(f"  {name}: {url}")
        webbrowser.open_new_tab(url)
        time.sleep(0.3)


# =========================
# MAIN
# =========================

def main():
    print("======================================")
    print("      SMART HARDHAT SYSTEM")
    print("======================================")
    print()

    check_project_files()
    npm_command = check_npm()

    # =========================
    # START BACKEND
    # =========================

    print("Starting Flask backend...")

    backend = subprocess.Popen(
        [sys.executable, "app.py"],
        cwd=BACKEND_DIR
    )

    backend_ready = wait_for_server(
        BACKEND_HOST,
        BACKEND_PORT,
        "Flask Backend"
    )

    # =========================
    # START FRONTEND
    # =========================

    print()
    print("Starting React frontend...")

    frontend = subprocess.Popen(
        [npm_command, "run", "dev"],
        cwd=FRONTEND_DIR
    )

    frontend_ready = wait_for_server(
        FRONTEND_HOST,
        FRONTEND_PORT,
        "React Frontend"
    )

    # =========================
    # OPEN THREE WEBSITE TABS
    # =========================

    if frontend_ready:
        print()
        print("======================================")
        print("SMSYS is running.")
        print("======================================")

        if backend_ready:
            print(f"Backend : http://{BACKEND_HOST}:{BACKEND_PORT}")
        else:
            print("Backend : WARNING - Not responding")

        print(f"Frontend: http://localhost:{FRONTEND_PORT}")
        open_website_tabs()

    else:
        print()
        print("[WARNING] Frontend could not be reached.")
        print("Try opening the websites manually:")
        print(f"  Site Creation: {SITE_CREATION_URL}")
        print(f"  Dashboard:     {DASHBOARD_URL}")
        print(f"  Worker:        {WORKER_URL}")

    print()
    print("Press Ctrl+C to stop SMSYS.")

    # =========================
    # KEEP SYSTEM RUNNING
    # =========================

    try:
        while True:
            if backend.poll() is not None:
                print()
                print("[ERROR] Flask backend stopped unexpectedly.")
                break

            if frontend.poll() is not None:
                print()
                print("[ERROR] React frontend stopped unexpectedly.")
                break

            time.sleep(1)

    except KeyboardInterrupt:
        print()
        print("Shutdown requested.")

    finally:
        print()
        print("Shutting down SMSYS...")
        stop_process(frontend, "React Frontend")
        stop_process(backend, "Flask Backend")
        print()
        print("SMSYS stopped.")


# =========================
# RUN
# =========================

if __name__ == "__main__":
    main()
