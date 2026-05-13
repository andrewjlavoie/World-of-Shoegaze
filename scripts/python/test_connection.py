#!/usr/bin/env python3
"""Quick Atlas connection sanity check.

Usage:
    cd scripts/python
    source .venv/bin/activate
    python test_connection.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib import db  # noqa: E402


def main() -> int:
    client = db.get_client()
    try:
        info = client.server_info()
        print("✓ Connected. Server version:", info.get("version"))
        dbs = client.list_database_names()
        print("✓ Visible databases:", dbs)
        coll = db.artists()
        print(f"✓ artists collection accessible. Count: {coll.estimated_document_count()}")
    except Exception as e:
        print(f"✗ Connection failed: {type(e).__name__}: {e}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
