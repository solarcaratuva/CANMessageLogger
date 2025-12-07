from pathlib import Path
import threading
import os
import time
from flask import Flask, request, redirect, send_file, send_from_directory, render_template_string, jsonify
import webbrowser
import re
from backend.submodule_automation import initialize_submodule, get_submodule_branches
from backend.startup_validation import validate_startup_requirements

SETUP_PORT = 5499

def launch_startup_options(run_server_callback, socketio_port=5500):
    """A minimal local setup server that collects options then launches the real app."""
    
    BASE_DIR = Path(__file__).resolve().parent 
    FRONTEND_DIR = (BASE_DIR / "frontend").resolve()
    HTML_DIR = (FRONTEND_DIR / "html").resolve()
    STATIC_DIR = (FRONTEND_DIR / "static").resolve()
    
    setup_app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="/static")

    @setup_app.route("/validate-hardware", methods=["POST"])
    def validate_hardware():
        """AJAX endpoint for real-time hardware validation"""
        log_type = request.json.get("logType")
        
        if log_type == "livelog":
            from backend.startup_validation import get_st_link_port
            port = get_st_link_port()
            return jsonify({
                "valid": port is not None,
                "message": f"ST-Link found on {port}" if port else "ST-Link device not found"
            })
        elif log_type == "radio":
            from backend.startup_validation import get_radio_port
            port = get_radio_port()
            return jsonify({
                "valid": port is not None,
                "message": f"Radio found on {port}" if port else "Radio device not found"
            })
        
        return jsonify({"valid": True, "message": "No hardware validation needed"})

    @setup_app.route("/validate-file", methods=["POST"])
    def validate_file():
        """AJAX endpoint for validating selected file name (pre-upload)."""
        file_name = request.json.get("fileName", "")
        log_type = request.json.get("logType")
        file_name = file_name.strip().lower()

        if not file_name:
            return jsonify({"valid": True, "message": ""})

        if log_type in ["pastlog", "mock_livelog"]:
            if not (file_name.endswith('.log') or file_name.endswith('.txt')):
                return jsonify({"valid": False, "message": f"File must be .log or .txt for {log_type} mode"})
        elif log_type == "db":
            if not file_name.endswith('.db'):
                return jsonify({"valid": False, "message": "Database file must end with .db"})

        # For other modes, any extension is acceptable or file not required
        return jsonify({"valid": True, "message": ""})

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

        # Handle uploaded file (file chooser). For required modes we expect a file upload.

        # temp_upload folder is created because browsers can't store direct paths to file
        # so we just keep 1 file named "user_uploaded_file" which gets overwritten each run
        uploaded_file = request.files.get("inputFile")
        saved_path = None
        if uploaded_file and uploaded_file.filename:
            # Ensure uploads directory exists
            uploads_dir = Path("temp_upload")
            uploads_dir.mkdir(exist_ok=True)

            # Clear out any existing files so we truly only ever have one
            for f in uploads_dir.iterdir():
                if f.is_file():
                    f.unlink()

            # Always use the same name, optionally preserving extension
            ext = Path(uploaded_file.filename).suffix  
            safe_name = f"user_uploaded_file{ext}" if ext else "user_uploaded_file"

            saved_path = str(uploads_dir / safe_name)
            uploaded_file.save(saved_path)

        # For downstream code expecting list with path
        opts.inputFile = [saved_path] if saved_path else None

        outputDB = request.form.get("outputDB") or ""
        opts.outputDB = [outputDB] if outputDB.strip() else None
        opts.set_dbc_branch = request.form.get("set_dbc_branch") or "main"

        # Server-side validation as safety net
        input_file_path = saved_path if saved_path else None
        validation_errors = validate_startup_requirements(opts.logType, input_file_path)
        # Additional check: required modes must have uploaded file
        required_modes = ["pastlog","mock_livelog","db"]
        if opts.logType in required_modes and not input_file_path:
            validation_errors.append(f"Input file is required for {opts.logType} mode")
        
        if validation_errors:
            print("Error in startup", validation_errors)
            
            # Return simple JSON error
            return jsonify({
                "success": False,
                "errors": validation_errors
            }), 400
        

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