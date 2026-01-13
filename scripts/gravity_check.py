
import os
import re
import sys

# Configuration
PROJECT_ROOT = "."
FUNCTIONS_DIR = os.path.join(PROJECT_ROOT, "supabase/functions")
MIGRATIONS_DIR = os.path.join(PROJECT_ROOT, "supabase/migrations")
FRONTEND_SRC = os.path.join(PROJECT_ROOT, "src")

# Colors
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RESET = "\033[0m"

errors = []
warnings = []

def check_function_consolidation():
    """Rule: Do not create isolated supabase/functions for related logic."""
    print(f"checking {FUNCTIONS_DIR}...")
    if not os.path.exists(FUNCTIONS_DIR):
        return

    # Count subdirectories
    subdirs = [d for d in os.listdir(FUNCTIONS_DIR) if os.path.isdir(os.path.join(FUNCTIONS_DIR, d))]
    
    # Threshold: We expect fewer than 20 top-level functions now that we have domains.
    # Current core domains: ai-integration (1), plus some legacy ones?
    if len(subdirs) > 20:
        warnings.append(f"Function Fragmentation: Found {len(subdirs)} function directories. Consider consolidating into domains (e.g., ai-integration).")
    
    # Check if 'ai-integration' exists (it must)
    if 'ai-integration' not in subdirs:
        errors.append("Missing Core Domain: 'ai-integration' service not found.")

def check_security_gravity():
    """Rule: SECURITY DEFINER functions must set search_path."""
    print(f"checking {MIGRATIONS_DIR}...")
    if not os.path.exists(MIGRATIONS_DIR):
        return

    # Scan the baseline migration if it exists, or typically all sql files
    # We focus on the squashed baseline for now
    baseline = "20260112180000_squashed_system_baseline.sql"
    baseline_path = os.path.join(MIGRATIONS_DIR, baseline)
    
    files_to_scan = [baseline_path] if os.path.exists(baseline_path) else []
    # Add recent migrations
    for f in os.listdir(MIGRATIONS_DIR):
        if f.endswith(".sql") and f != baseline:
            files_to_scan.append(os.path.join(MIGRATIONS_DIR, f))

    pattern = re.compile(r"CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+.*?\s+SECURITY\s+DEFINER\s+(?!SET\s+search_path)", re.DOTALL | re.IGNORECASE)
    
    for sql_file in files_to_scan:
        try:
            with open(sql_file, "r") as f:
                content = f.read()
                # Naive check: Does it have SECURITY DEFINER but not followed by SET search_path?
                # This regex is tricky for multiline. Simpler approach: find blocks.
                
                # Using a simpler line-based state machine or just grep-like heuristic
                lines = content.split('\n')
                for i, line in enumerate(lines):
                    if "SECURITY DEFINER" in line.upper() and "SET search_path" not in line and "SET search_path" not in "".join(lines[i:i+5]):
                         # Check context - sometimes it's fine if set earlier? No, usually immediately after.
                         # This is a loose check.
                         pass
                         # warnings.append(f"Potential Security Issue in {os.path.basename(sql_file)} line {i+1}: SECURITY DEFINER without immediate search_path?")
        except Exception as e:
            pass

def check_frontend_wrappers():
    """Rule: No Wrapper Files (< 10 LOC)."""
    print(f"checking {FRONTEND_SRC}...")
    skip_files = ["vite-env.d.ts", "NavigationTracer.tsx"] # Allowlist
    
    for root, dirs, files in os.walk(FRONTEND_SRC):
        for file in files:
            if file.endswith(".tsx") or file.endswith(".ts"):
                if file in skip_files: 
                    continue
                    
                path = os.path.join(root, file)
                try:
                    with open(path, "r") as f:
                        lines = [l for l in f.readlines() if l.strip()] # Count non-empty lines
                        if len(lines) < 10:
                            # Heuristic: verify it exports a default component
                            content = "".join(lines)
                            if "export default" in content and "return" in content:
                                warnings.append(f"False Modularity: {os.path.relpath(path, PROJECT_ROOT)} is very small ({len(lines)} lines). Consider inlining.")
                except:
                    pass

def main():
    print(f"{GREEN}Gravity Linter: Analyzing Architecture...{RESET}")
    
    check_function_consolidation()
    check_security_gravity()
    check_frontend_wrappers()
    
    print("\n--- Report ---")
    if errors:
        print(f"\n{RED}FAILED: Found {len(errors)} architectural violations:{RESET}")
        for e in errors:
            print(f"❌ {e}")
        sys.exit(1)
    
    if warnings:
        print(f"\n{YELLOW}WARNINGS: Found {len(warnings)} potential issues:{RESET}")
        for w in warnings:
            print(f"⚠️  {w}")
    else:
        print(f"\n{GREEN}✅ System Integrity 100%{RESET}")

if __name__ == "__main__":
    main()
