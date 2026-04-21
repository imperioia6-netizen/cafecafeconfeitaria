#!/usr/bin/env python3
"""
Deploy evolution-webhook edge function to Supabase.
Reads all function files and deploys via Management API.
"""
import json
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
FUNCTIONS_DIR = os.path.join(BASE, "supabase", "functions")

# Files to include in the deployment
FILE_PATHS = [
    ("index.ts", "evolution-webhook/index.ts"),
    ("../_shared/agentLogic.ts", "_shared/agentLogic.ts"),
    ("../_shared/atendentePromptModules.ts", "_shared/atendentePromptModules.ts"),
    ("../_shared/atendentePromptBase.ts", "_shared/atendentePromptBase.ts"),
    ("../_shared/calculator.ts", "_shared/calculator.ts"),
    ("../_shared/decisionLayer.ts", "_shared/decisionLayer.ts"),
    ("../_shared/routeNotes.ts", "_shared/routeNotes.ts"),
    ("../_shared/intentRouter.ts", "_shared/intentRouter.ts"),
    ("../_shared/fetchRules.ts", "_shared/fetchRules.ts"),
    ("../_shared/getOwner.ts", "_shared/getOwner.ts"),
    ("../_shared/orderValidator.ts", "_shared/orderValidator.ts"),
    ("../_shared/security.ts", "_shared/security.ts"),
    ("../_shared/ticketflow.ts", "_shared/ticketflow.ts"),
    ("../_shared/pdfExtract.ts", "_shared/pdfExtract.ts"),
]

def read_files():
    files = []
    for deploy_name, local_path in FILE_PATHS:
        full_path = os.path.join(FUNCTIONS_DIR, local_path)
        if not os.path.exists(full_path):
            print(f"ERROR: File not found: {full_path}")
            sys.exit(1)
        with open(full_path, "r") as f:
            content = f.read()
        files.append({"name": deploy_name, "content": content})
        print(f"  Read: {deploy_name} ({len(content)} chars)")
    return files

def main():
    print("Reading function files...")
    files = read_files()
    total_chars = sum(len(f["content"]) for f in files)
    print(f"\nTotal: {len(files)} files, {total_chars} characters")

    # Save as JSON for use with supabase CLI or API
    payload = {
        "slug": "evolution-webhook",
        "name": "evolution-webhook",
        "entrypoint_path": "index.ts",
        "verify_jwt": False,
        "files": files
    }

    output_path = os.path.join(BASE, "deploy_payload.json")
    with open(output_path, "w") as f:
        json.dump(payload, f)
    print(f"\nPayload saved to: {output_path}")
    print(f"Payload size: {os.path.getsize(output_path)} bytes")
    print("\nTo deploy, run from this directory:")
    print("  npx supabase functions deploy evolution-webhook --project-ref osewboiklhfiunetoxzo")

if __name__ == "__main__":
    main()
