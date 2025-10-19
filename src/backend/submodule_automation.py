import git
from datetime import datetime
import subprocess
import os
import requests


REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SUBMODULE_PATH = "resources/CAN-messages"


def initialize_submodule() -> None:
    """Initialize the submodule if it isn't already. Should be run at startup."""
    try:
        print("[GIT] Initializing submodule...")
        subprocess.run(
            ["git", "submodule", "update", "--init", "--recursive", "--", SUBMODULE_PATH],
            cwd=REPO_ROOT,
            check=True
        )
        print("✔️ Submodule initialized")
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Failed to initialize submodule at {SUBMODULE_PATH}: {e}")


def get_submodule_branches() -> list[str]:
    """Return a list of available branches. Should be run at startup."""
    try:
        repo_path = os.path.join(REPO_ROOT, SUBMODULE_PATH)
        repo = git.Repo(repo_path)
        
        branches = []
        
        # Always include local branches
        local_branches = [head.name for head in repo.heads]
        branches.extend(local_branches)
        
        # Try to get remote branches if connected
        if is_connected():
            try:
                origin = repo.remote(name='origin')
                origin.fetch()
                remote_branches = [ref.name.split('/')[-1] for ref in origin.refs 
                                 if ref.name.startswith('origin/') and not ref.name.endswith('/HEAD')]
                # Add remote branches that aren't already in local branches
                for branch in remote_branches:
                    if branch not in branches:
                        branches.append(branch)
            except Exception as e:
                print(f"[GIT] Could not fetch remote branches: {e}")
        
        # Remove duplicates and sort
        branches = sorted(list(set(branches)))
        print(f"[GIT] Available branches: {branches}")
        return branches
        
    except Exception as e:
        print(f"[GIT] Error getting branches: {e}")
        return ['main']  # Fallback to main


def set_submodule_branch(branch: str, online: bool) -> None:
    """Change the branch. If online then git pull as well. Should be run upon submission of the startup form."""
    try:
        repo_path = os.path.join(REPO_ROOT, SUBMODULE_PATH)
        repo = git.Repo(repo_path)
        
        print(f"[GIT] Switching to branch '{branch}' (online: {online})")
        
        if online and is_connected():
            # Online mode: fetch and pull
            origin = repo.remote(name='origin')
            origin.fetch()
            
            # Check if branch exists remotely
            remote_branches = [ref.name.split('/')[-1] for ref in origin.refs]
            if branch in remote_branches:
                repo.git.checkout(branch)
                origin.pull()
                print(f"Switched to '{branch}' and pulled latest changes")
            else:
                raise ValueError(f"Branch '{branch}' does not exist remotely")
        else:
            # Offline mode: only checkout local branch
            local_branches = [head.name for head in repo.heads]
            if branch in local_branches:
                repo.git.checkout(branch)
                print(f"✔️ Switched to local branch '{branch}'")
            else:
                # Try to checkout main as fallback
                if 'main' in local_branches:
                    repo.git.checkout('main')
                    print(f"[GIT] Branch '{branch}' not found locally. Defaulted to 'main'")
                else:
                    raise ValueError(f"Branch '{branch}' not found locally and no 'main' branch available")
                    
        # Get commit info
        last_commit = repo.head.commit.committed_date
        time = datetime.fromtimestamp(last_commit).strftime("%H:%M:%S %Y-%m-%d")
        print(f"[GIT] Last commit: {time}")
        
    except Exception as e:
        raise RuntimeError(f"Failed to set submodule branch: {e}")


def is_connected() -> bool:
    """Check if there is internet. Helper function."""
    try:
        repo_path = os.path.join(REPO_ROOT, SUBMODULE_PATH)
        repo = git.Repo(repo_path)
        url = next(repo.remote(name='origin').urls)
        
        # Handle SSH URLs (git@github.com:user/repo.git -> https://github.com/user/repo)
        if url.startswith("git@"):
            url = url.replace("git@", "https://").replace(":", "/", 1)
        
        # Remove .git suffix if present
        if url.endswith(".git"):
            url = url[:-4]
            
        r = requests.get(url, timeout=5)
        return r.ok
    except Exception:
        return False
