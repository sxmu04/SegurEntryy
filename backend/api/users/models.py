from config.firebase_config import db
from datetime import datetime


class UserService:

    @staticmethod
    def create_user(data):
        doc_ref = db.collection("usuarios").document()

        user_data = {
            "id": doc_ref.id,
            "nombre": data.get("nombre"),
            "apellido": data.get("apellido"),
            "correo": data.get("correo"),
            "rol": data.get("rol"),
            "estado": "pendiente",
            "fecha_creacion": datetime.now(),
        }

        doc_ref.set(user_data)
        return user_data

    @staticmethod
    def get_all_users():
        users = db.collection("usuarios").stream()
        return [user.to_dict() for user in users]