import git
from datetime import datetime
import docker 
import subprocess
import os
import config
import requests


def gitPull(branch: str) -> tuple[bool, str]:
    try:
        repo = git.Repo(config.REPO_ROOT)

        if is_connected(repo):
            origin = repo.remote(name='origin')
            origin.fetch()

            remote_branches = [ref.name.split('/')[-1] for ref in origin.refs]
            if branch in remote_branches:
                repo.git.checkout(branch)
                origin.pull()
                lastCommit = repo.head.commit.committed_date
                time = datetime.fromtimestamp(lastCommit).strftime("%H:%M:%S %Y-%m-%d")
                return True, f"Checked out '{repo.active_branch.name}'. Last commit at {time}"
            else:
                return False, f"Branch \"{branch}\" does not exist remotely!"

        else:
            local_branches = [head.name for head in repo.heads]
            if branch in local_branches:
                repo.git.checkout(branch)
            else:
                repo.git.checkout("main")
                return False, f"No internet. Branch \"{branch}\" not found locally. Defaulted to 'main'."

    except Exception as e:
        return False, str(e)


def compile() -> bool:
    compileCmd = config.REPO_CONFIG["compileCmd"]
    containerName = config.REPO_CONFIG["containerName"]
    client = docker.from_env()
    container = client.containers.get(containerName)
    container.start()

    # compileCmd = "cd ./Rivanna2/ && ./compile.sh"
    exitCode, output = container.exec_run(f"sh -c '{compileCmd}'")
    logPath = os.path.join(config.LOG_FOLDER, "compile.log")
    with open(logPath, "w") as log:
        if output:
            log.write(output.decode())
        else:
            log.write("NO OUTPUT")
    return exitCode == 0


def upload(board: str) -> bool:
    uploadCmd = config.REPO_CONFIG["boards"][board]["uploadCmd"]
    command = f"cd {config.REPO_ROOT} && {uploadCmd}"
    logPath = os.path.join(config.LOG_FOLDER, f"upload_{board}.log")
    with open(logPath, "w") as log:
        process = subprocess.Popen(command, stdout=log, stderr=log, encoding="utf-8", shell=True)
        process.wait()
    return process.returncode == 0

def is_connected(repo) -> bool:
    try:
        url = next(repo.remote(name='origin').urls)
        url = url.replace("git@", "https://").replace(":", "/").split(".git")[0]
        return requests.get(url).ok
    except:
        return False