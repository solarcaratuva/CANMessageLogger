import os
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../..", ""))

REPO_CONFIG = {
    "submodules": {
        "CAN-messages": {
            "path": "resources/CAN-messages",
            "default_branch": "main"
        }
    },
}