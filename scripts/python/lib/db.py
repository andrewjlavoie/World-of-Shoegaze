"""MongoDB connection helper. Shared by all enrichment scripts.

Loads .env from the same directory as this lib (i.e. scripts/python/.env).
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.collection import Collection

_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_ENV_PATH)

_uri = os.environ.get("MONGODB_URI")
_db_name = os.environ.get("MONGODB_DB", "wos")
if not _uri:
    raise RuntimeError(
        f"MONGODB_URI not set. Copy {_ENV_PATH.parent}/.env.example to .env first."
    )

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(_uri)
    return _client


def artists() -> Collection:
    return get_client()[_db_name]["artists"]
