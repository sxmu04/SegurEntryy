import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SERVICE_ACCOUNT_KEY = (
    BASE_DIR
    / "backend"
    / "config"
    / "firebase"
    / "serviceAccountKey.json"
)

if not firebase_admin._apps:
    cred = credentials.Certificate(str(SERVICE_ACCOUNT_KEY))
    firebase_admin.initialize_app(cred)

db = firestore.client()