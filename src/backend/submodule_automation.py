import git
from datetime import datetime
import subprocess
import os
import requests


REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

def ensure_submodule_initialized(submodule_path: str):
    """Ensure the given submodule is initialized and updated."""
    try:
        print("RUNNING SUBPROECESS")
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
            print("is connected true condition")
            origin = repo.remote(name='origin')
            origin.fetch()

            remote_branches = [ref.name.split('/')[-1] for ref in origin.refs]
            print("remote branches: ", remote_branches)
            if branch in remote_branches:
                repo.git.checkout(branch)
                origin.pull()
                last_commit = repo.head.commit.committed_date
                time = datetime.fromtimestamp(last_commit).strftime("%H:%M:%S %Y-%m-%d")
                return True, f"Checked out '{repo.active_branch.name}' in {submodule_path or 'main repo'}. Last commit at {time}"
            else:
                return False, f"[GIT ERROR] Branch \"{branch}\" does not exist remotely in {submodule_path or 'main repo'}!"

        else:
            print("is connected false condition")
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
        
        # Handle SSH URLs (git@github.com:user/repo.git -> https://github.com/user/repo)
        if url.startswith("git@"):
            url = url.replace("git@", "https://").replace(":", "/", 1)
        
        # Remove .git suffix if present
        if url.endswith(".git"):
            url = url[:-4]
            
        print("is connected:", url)
        r = requests.get(url, timeout=5)
        print("The requests get was", r.ok)
        return r.ok
    except Exception as e:
        print(f"Connection check failed: {e}")
        return False
