#!/usr/bin/env python3
"""Run a UTF-8 PowerShell file in the supplied Windows VM's current user session."""
import argparse
import base64
from pathlib import Path
import subprocess
import sys
import uuid

parser = argparse.ArgumentParser()
parser.add_argument("script", help="Local UTF-8 .ps1 file; '-' reads stdin")
args = parser.parse_args()
source = sys.stdin.read() if args.script == "-" else Path(args.script).read_text()
encoded = base64.b64encode(source.encode("utf-16-le")).decode()
command = [
    "prlctl", "exec", "{94e8b9a2-582b-41bc-8be2-c3c2c0ef872c}",
    "--current-user", "powershell.exe", "-NoProfile", "-NonInteractive",
    "-ExecutionPolicy", "Bypass",
]
staged = None
try:
    # Parallels can reject commands below Windows' usual command-line limit.
    # Stage moderately sized scripts as well as very long ones.
    if len(encoded) > 3000:
        name = ".tmp-windows-command-" + uuid.uuid4().hex + ".ps1"
        staged = Path("/Users/bLue/GitProjects/algoux/standard-ranklist-renderer-component") / name
        staged.write_text(source)
        guest_path = "\\\\Mac\\Home\\GitProjects\\algoux\\standard-ranklist-renderer-component\\" + name
        command += ["-File", guest_path]
    else:
        command += ["-EncodedCommand", encoded]
    result = subprocess.run(command)
finally:
    if staged:
        staged.unlink(missing_ok=True)
raise SystemExit(result.returncode)
