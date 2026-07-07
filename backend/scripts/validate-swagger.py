#!/usr/bin/env python3
"""
Validate that all routes in router.go have corresponding documentation in swagger.json,
and that no orphaned docs exist for removed routes.

Usage:
    python3 scripts/validate-swagger.py
    python3 scripts/validate-swagger.py --verbose   # Show matching routes too

Exit code:
    0 if all routes are documented and no orphaned docs exist
    1 if there are mismatches
"""

import json
import os
import re
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROUTER_PATH = os.path.join(PROJECT_ROOT, "internal", "api", "router.go")
SWAGGER_PATH = os.path.join(PROJECT_ROOT, "internal", "api", "docs", "swagger.json")

VERBOSE = "--verbose" in sys.argv


def parse_router_routes(filepath):
    """
    Parse router.go to extract all registered HTTP routes.
    Returns a set of (method, path) tuples.
    """
    with open(filepath) as f:
        content = f.read()

    routes = set()

    # Pattern 1: mux.HandleFunc("METHOD /api/v1/path", handler)
    # Pattern 2: mux.Handle("METHOD /api/v1/path", middleware(http.HandlerFunc(handler)))
    # Pattern 3: sseMux.Handle("METHOD /api/v1/path", ...)  — sub-mux routes
    patterns = [
        r'mux\.HandleFunc\("(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s+(/[^"]+)"',
        r'mux\.Handle\("(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s+(/[^"]+)"',
        r'sseMux\.Handle\("(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s+(/[^"]+)"',
    ]

    for pat in patterns:
        for match in re.finditer(pat, content):
            method = match.group(1)
            path_raw = match.group(2)

            # Normalise path: remove /api/v1 prefix for comparison if present
            # swagger.json uses /api/v1/... paths
            path = path_raw.rstrip("/")
            routes.add((method, path))

    return routes


def parse_swagger_paths(filepath):
    """
    Parse swagger.json to extract all documented routes.
    Returns a set of (method, path) tuples.
    """
    with open(filepath) as f:
        spec = json.load(f)

    routes = set()
    swagger_method_map = {
        "get": "GET", "post": "POST", "put": "PUT",
        "delete": "DELETE", "patch": "PATCH", "options": "OPTIONS", "head": "HEAD",
    }

    for path, methods in spec.get("paths", {}).items():
        for swagger_method, details in methods.items():
            if swagger_method.lower() in swagger_method_map:
                method = swagger_method_map[swagger_method.lower()]
                routes.add((method, path))

    return routes, spec


def main():
    errors = []

    # Parse router routes
    if not os.path.exists(ROUTER_PATH):
        print(f"❌ router.go not found at: {ROUTER_PATH}")
        sys.exit(1)
    router_routes = parse_router_routes(ROUTER_PATH)
    print(f"📡 Routes found in router.go: {len(router_routes)}")

    # Parse swagger routes
    if not os.path.exists(SWAGGER_PATH):
        print(f"❌ swagger.json not found at: {SWAGGER_PATH}")
        sys.exit(1)
    swagger_routes, swagger_spec = parse_swagger_paths(SWAGGER_PATH)
    print(f"📖 Routes documented in swagger.json: {len(swagger_routes)}")

    # Internal/static routes that don't need swagger documentation:
    # - Swagger UI endpoints (self-referential)
    # - Static file serving
    internal_static_prefixes = (
        "/api/v1/docs/ui",      # Swagger UI HTML + static assets
        "/api/v1/uploads/",     # Uploaded file serving
    )

    def is_internal_static(method, path):
        return path.startswith(internal_static_prefixes)

    # Find routes in router.go but NOT in swagger.json (missing documentation)
    missing_docs = set()
    for r in router_routes:
        if r not in swagger_routes and not is_internal_static(*r):
            missing_docs.add(r)

    # Find routes in swagger.json but NOT in router.go (orphaned docs)
    orphaned_docs = set()
    for r in swagger_routes:
        if r not in router_routes and not is_internal_static(*r):
            orphaned_docs.add(r)

    # Check that all swagger paths are valid JSON
    try:
        json.dumps(swagger_spec)
    except (TypeError, ValueError) as e:
        errors.append(f"❌ swagger.json is not valid JSON: {e}")

    # Validate schema references
    schemas = swagger_spec.get("components", {}).get("schemas", {})

    def check_refs(obj, path_str, depth=0):
        """Recursively check all $ref pointers resolve."""
        if depth > 15:
            return
        if isinstance(obj, dict):
            if "$ref" in obj:
                ref = obj["$ref"]
                if ref.startswith("#/components/schemas/"):
                    schema_name = ref.split("/")[-1]
                    if schema_name not in schemas:
                        errors.append(
                            f"❌ Broken schema reference '{ref}' in swagger.json"
                        )
            for v in obj.values():
                check_refs(v, path_str, depth + 1)
        elif isinstance(obj, list):
            for item in obj:
                check_refs(item, path_str, depth + 1)

    for path, methods in swagger_spec.get("paths", {}).items():
        for method, details in methods.items():
            if isinstance(details, dict):
                check_refs(details, f"{method.upper()} {path}")

    # --- Report results ---

    has_issues = False

    if missing_docs:
        has_issues = True
        print(f"\n❌ {len(missing_docs)} route(s) in router.go have NO swagger documentation:")
        for method, path in sorted(missing_docs):
            print(f"   {method:6s} {path}")

    if orphaned_docs:
        has_issues = True
        print(f"\n⚠️  {len(orphaned_docs)} route(s) in swagger.json no longer exist in router.go (orphaned):")
        for method, path in sorted(orphaned_docs):
            print(f"   {method:6s} {path}")

    if errors:
        has_issues = True
        print(f"\n❌ {len(errors)} structural issue(s):")
        for e in errors:
            print(f"   {e}")

    if not has_issues:
        print(f"\n✅ All {len(router_routes)} routes in router.go are documented in swagger.json.")
        print(f"✅ No orphaned docs. All {len(swagger_routes)} swagger routes have corresponding handlers.")
        print(f"✅ All schema references resolve correctly.")
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(main())
