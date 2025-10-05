from pathlib import Path
import threading
from flask import Flask, request, redirect, send_file, send_from_directory
import webbrowser

SETUP_PORT = 5499
SOCKETIO_PORT = 5500

def launch_startup_options(run_server_callback):
    """A minimal local setup server that collects options then launches the real app."""
    
    BASE_DIR = Path(__file__).resolve().parent 
    FRONTEND_DIR = (BASE_DIR / "frontend").resolve()
    HTML_DIR = (FRONTEND_DIR / "html").resolve()
    STATIC_DIR = (FRONTEND_DIR / "static").resolve()
    
    setup_app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="/static")

    @setup_app.route("/", methods=["GET"])
    def index():
        return send_file("frontend/html/startup_options.html")
    
    @setup_app.route("/static/<path:filename>")
    def static_files(filename):
        return send_from_directory("frontend/static", filename)

    def _shutdown(flask_request):
        func = flask_request.environ.get("werkzeug.server.shutdown")
        if func:
            func()

    @setup_app.route("/start", methods=["POST"])
    def start():
        # Gather form inputs into an argparse-like Namespace
        class Opts: pass

        # Create opts object to match the structure that argparse would provide for CLI usage
        opts = Opts()
        opts.logType = request.form.get("logType")
        inputFile = request.form.get("inputFile") or ""
        opts.inputFile = [inputFile] if inputFile.strip() else None
        outputDB = request.form.get("outputDB") or ""
        opts.outputDB = [outputDB] if outputDB.strip() else None
        opts.set_dbc_branch = request.form.get("set_dbc_branch") or "main"

        # Launch the real server in a new thread
        t = threading.Thread(target=lambda: run_server_callback(opts), daemon=True)
        t.start()

        # Close the setup server and redirect to the real app
        threading.Timer(0.25, lambda: _shutdown(request)).start()
        return redirect(f"http://localhost:{SOCKETIO_PORT}", code=302)

    # Open browser to setup UI and run the startup options server 
    webbrowser.open(f"http://localhost:{SETUP_PORT}")
    setup_app.run(host="127.0.0.1", port=SETUP_PORT, debug=False)