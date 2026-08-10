from config.firebase_config import db

def test_connection():

    collections = db.collections()

    return [collection.id for collection in collections]