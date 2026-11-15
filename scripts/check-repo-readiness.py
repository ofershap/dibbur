#!/usr/bin/env python3
"""Check Dibbur's contributor entry points. No writes or workflow dispatches."""
import argparse
import json
import os
from pathlib import Path
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
REPO = "ofershap/dibbur"
errors = []

def require(ok, message):
    print(("PASS " if ok else "FAIL ") + message)
    if not ok:
        errors.append(message)

def text(path):
    file = ROOT / path
    require(file.is_file(), path + " exists")
    return file.read_text() if file.is_file() else ""

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--live", action="store_true", help="also check current GitHub settings")
args = parser.parse_args()
for path in ("README.md", "CONTRIBUTING.md", "BUILD.md", "SECURITY.md", "llms.txt",
             ".github/ISSUE_TEMPLATE/config.yml", ".github/ISSUE_TEMPLATE/bug_report.md",
             ".github/ISSUE_TEMPLATE/feature_request.md", ".github/PULL_REQUEST_TEMPLATE.md"):
    content = text(path)
    require(path == "BUILD.md" or ("cjpais/Handy/issues" not in content and "cjpais/Handy/discussions" not in content),
            path + " does not redirect Dibbur support to upstream")
    require("cjpais/Handy.git" not in content, path + " does not clone upstream instead")
    require("FEATURE FREEZE" not in content.upper(), path + " has no inherited feature freeze")
contrib = (ROOT / "CONTRIBUTING.md").read_text()
require("# Contributing to Dibbur" in contrib, "guide names Dibbur")
require("https://github.com/ofershap/dibbur/compare" in contrib, "PR destination is explicit")
config = (ROOT / ".github/ISSUE_TEMPLATE/config.yml").read_text()
require("blank_issues_enabled: true" in config, "blank issue route is available")
readme = (ROOT / "README.md").read_text()
for token in ("CONTRIBUTING.md", "SECURITY.md", "https://ofershap.github.io/", "readme-builder/"):
    require(token in readme, "README links " + token)
require("badge.svg" not in readme, "README has no stale workflow badge")
require("Every push runs the test suite" not in readme, "README does not promise unconditional CI")
if args.live:
    def api(path):
        headers = {"Accept": "application/vnd.github+json", "User-Agent": "dibbur-readiness"}
        if os.environ.get("GH_TOKEN"):
            headers["Authorization"] = "Bearer " + os.environ["GH_TOKEN"]
        request = urllib.request.Request("https://api.github.com/" + path, headers=headers)
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    try:
        repo = api("repos/" + REPO)
        require(repo["has_issues"] is True, "GitHub Issues enabled")
        require(repo["archived"] is False, "repository accepts contributions")
        reporting = api("repos/" + REPO + "/private-vulnerability-reporting")
        require(reporting["enabled"] is True, "private security reporting enabled")
        workflows = api("repos/" + REPO + "/actions/workflows")["workflows"]
        upstream = next((w for w in workflows if w["path"].endswith("/main-build.yml")), None)
        require(upstream is not None and upstream["state"] == "disabled_manually",
                "owner-disabled upstream Main Branch Build remains disabled")
        release = api("repos/" + REPO + "/releases/latest")
        require(not release["draft"] and any(a["name"].endswith(".dmg") for a in release["assets"]),
                "latest published release has a Mac installer")
        print("Release:", release["html_url"])
    except Exception as exc:
        require(False, "live checks unresolved: " + type(exc).__name__)
print(f"{len(errors)} failed check(s). This checks contributor readiness, not app correctness.")
sys.exit(bool(errors))
