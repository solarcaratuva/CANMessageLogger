from pathlib import Path
import threading
from flask import Flask, request, redirect, send_file, send_from_directory, render_template_string
import webbrowser
import re
from backend.submodule_automation import initialize_submodule, get_submodule_branches

SETUP_PORT = 5499

def launch_startup_options(run_server_callback, socketio_port=5500):
    """A minimal local setup server that collects options then launches the real app."""
    
    BASE_DIR = Path(__file__).resolve().parent 
    FRONTEND_DIR = (BASE_DIR / "frontend").resolve()
    HTML_DIR = (FRONTEND_DIR / "html").resolve()
    STATIC_DIR = (FRONTEND_DIR / "static").resolve()
    
    setup_app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="/static")

    @setup_app.route("/", methods=["GET"])
    def index():
        # Initialize submodule and get available branches
        
        initialize_submodule()
        branches = get_submodule_branches()
        
        # Read the HTML file and inject branches
        html_path = BASE_DIR / "frontend" / "html" / "startup_options.html"
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Generate radio buttons for branches
        branch_options = ""
        for i, branch in enumerate(branches):
            checked = 'checked' if branch == 'main' else ''
            branch_options += f'''
            <div class="radio-option">
                <input type="radio" name="set_dbc_branch" id="{branch}" value="{branch}" {checked}>
                <label for="{branch}">{branch}</label>
            </div>'''
        
        # Replace the hardcoded DBC branch section
        dbc_section = f'''
    <fieldset>
        <legend>DBC Branch</legend>
        <div class="radio-group">{branch_options}
        </div>
    </fieldset>'''
        
        # Find and replace the DBC branch fieldset
        pattern = r'<fieldset>\s*<legend>DBC Branch</legend>.*?</fieldset>'
        html_content = re.sub(pattern, dbc_section, html_content, flags=re.DOTALL)
        
        return html_content
    
    @setup_app.route("/static/<path:filename>")
    def static_files(filename):
        return send_from_directory(STATIC_DIR, filename)

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

        # Capture the shutdown function within the request context
        shutdown_func = request.environ.get("werkzeug.server.shutdown")

        # Launch the real server in a new thread
        t = threading.Thread(target=lambda: run_server_callback(opts), daemon=True)
        t.start()

        # Close the setup server and redirect to the real app
        if shutdown_func:
            threading.Timer(0.25, shutdown_func).start()
        return redirect(f"http://localhost:{socketio_port}", code=302)

    # Open browser to setup UI and run the startup options server 
    webbrowser.open(f"http://localhost:{SETUP_PORT}")
    setup_app.run(host="127.0.0.1", port=SETUP_PORT, debug=False)