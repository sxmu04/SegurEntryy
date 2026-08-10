from config.firebase_config import db
from datetime import datetime


class AccessService:

    @staticmethod
    def register_access(data):

        uid = data.get("uid", "").strip()
        door = data.get("door", "").strip()
        device = data.get("device", "").strip()
        status = data.get("status", "").strip().lower()

        if not uid:
            raise Exception("El UID es obligatorio.")

        if not door:
            raise Exception("Debe indicar la puerta.")

        if not device:
            device = "Desconocido"

        if status == "":
            status = "granted"

        # Buscar usuario
        user_doc = db.collection("users").document(uid).get()

        if not user_doc.exists:
            raise Exception("Usuario no encontrado.")

        user = user_doc.to_dict()

        access_data = {

            "uid": uid,

            "name": user.get("name"),

            "email": user.get("email"),

            "role": user.get("role"),

            "door": door,

            "device": device,

            "status": status,

            "created_at": datetime.utcnow().isoformat()

        }

        access_ref = db.collection("access_logs").document()

        access_ref.set(access_data)

        access_data["id"] = access_ref.id

        return access_data

    @staticmethod
    def get_all_access():

        accesses = []

        docs = (
            db.collection("access_logs")
            .order_by("created_at", direction="DESCENDING")
            .stream()
        )

        for doc in docs:

            access = doc.to_dict()

            access["id"] = doc.id

            accesses.append(access)

        return accesses

    @staticmethod
    def get_access(access_id):

        doc = db.collection("access_logs").document(access_id).get()

        if not doc.exists:
            raise Exception("Registro no encontrado.")

        access = doc.to_dict()

        access["id"] = doc.id

        return access

    @staticmethod
    def delete_access(access_id):

        doc = db.collection("access_logs").document(access_id)

        if not doc.get().exists:
            raise Exception("Registro no encontrado.")

        doc.delete()

        return True

    @staticmethod
    def get_today_access():

        today = datetime.utcnow().date().isoformat()

        accesses = []

        docs = db.collection("access_logs").stream()

        for doc in docs:

            access = doc.to_dict()

            created = access.get("created_at", "")

            if created.startswith(today):

                access["id"] = doc.id

                accesses.append(access)

        return accesses