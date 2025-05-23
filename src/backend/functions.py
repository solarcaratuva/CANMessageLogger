import git
from datetime import datetime
import subprocess
import os
import requests


REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def ensure_submodule_initialized(submodule_path: str):
    """Ensure the given submodule is initialized and updated."""
    try:
        subprocess.run(
            ["git", "submodule", "update", "--init", "--recursive", "--", submodule_path],
            cwd=REPO_ROOT,
            check=True
        )
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Failed to initialize submodule at {submodule_path}: {e}")


def gitPull(branch: str, submodule_path: str = None) -> tuple[bool, str]:
    try:
        # Get absolute path to repo or submodule
        repo_path = os.path.join(REPO_ROOT, submodule_path) if submodule_path else REPO_ROOT
        repo_path = os.path.abspath(repo_path)

        print(f"[GIT] Checking out {branch} in {submodule_path or 'main repo'}...")
        print(f"[GIT] Repo path: {repo_path}")

        # If this is a submodule, ensure it's initialized
        if submodule_path:
            ensure_submodule_initialized(submodule_path)

        repo = git.Repo(repo_path)
        print("✔️ Repo loaded")

        if is_connected(repo):
            origin = repo.remote(name='origin')
            origin.fetch()

            remote_branches = [ref.name.split('/')[-1] for ref in origin.refs]
            if branch in remote_branches:
                repo.git.checkout(branch)
                origin.pull()
                last_commit = repo.head.commit.committed_date
                time = datetime.fromtimestamp(last_commit).strftime("%H:%M:%S %Y-%m-%d")
                return True, f"Checked out '{repo.active_branch.name}' in {submodule_path or 'main repo'}. Last commit at {time}"
            else:
                return False, f"[GIT ERROR] Branch \"{branch}\" does not exist remotely in {submodule_path or 'main repo'}!"

        else:
            local_branches = [head.name for head in repo.heads]
            if branch in local_branches:
                repo.git.checkout(branch)
                last_commit = repo.head.commit.committed_date
                time = datetime.fromtimestamp(last_commit).strftime("%H:%M:%S %Y-%m-%d")
                return True, f"Checked out '{branch}' locally (offline). Last commit at {time}"
            else:
                repo.git.checkout("main")
                return False, f"[GIT ERROR] No internet. Branch \"{branch}\" not found locally. Defaulted to 'main'."

    except Exception as e:
        return False, f"[GIT ERROR] {str(e)}"


def is_connected(repo) -> bool:
    try:
        url = next(repo.remote(name='origin').urls)
        url = url.replace("git@", "https://").replace(":", "/").split(".git")[0]
        return requests.get(url).ok
    except:
        return False
