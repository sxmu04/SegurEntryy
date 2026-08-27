from datetime import datetime

from google.cloud.firestore_v1 import Query

from config.firebase_config import db


class AuditService:

    COLLECTION = "audit_logs"

    # ==========================================================
    # OBTENER DATOS DE UN USUARIO
    # ==========================================================

    @staticmethod
    def get_user_data(uid):

        if not uid:
            return {}

        try:

            doc = (
                db.collection("users")
                .document(uid)
                .get()
            )

            if not doc.exists:
                return {}

            return doc.to_dict() or {}

        except Exception as e:

            print(
                "Error obteniendo usuario para auditoría:",
                e
            )

            return {}

    # ==========================================================
    # CREAR REGISTRO DE AUDITORÍA
    # ==========================================================

    @staticmethod
    def create_log(
        action,
        category,
        actor_uid="",
        target_uid="",
        description="",
        changes=None,
        metadata=None
    ):

        try:

            actor = AuditService.get_user_data(
                actor_uid
            )

            target = AuditService.get_user_data(
                target_uid
            )

            data = {

                "action":
                    action,

                "category":
                    category,

                "actor_uid":
                    actor_uid or "",

                "actor_name":
                    actor.get(
                        "name",
                        "Sistema"
                    ),

                "actor_email":
                    actor.get(
                        "email",
                        ""
                    ),

                "actor_role":
                    actor.get(
                        "role",
                        "system"
                    ),

                "target_uid":
                    target_uid or "",

                "target_name":
                    target.get(
                        "name",
                        ""
                    ),

                "target_email":
                    target.get(
                        "email",
                        ""
                    ),

                "description":
                    description,

                "changes":
                    changes or {},

                "metadata":
                    metadata or {},

                "created_at":
                    datetime.utcnow()
                    .isoformat()

            }

            ref = (
                db.collection(
                    AuditService.COLLECTION
                )
                .document()
            )

            ref.set(
                data
            )

            data["id"] = ref.id

            return data

        except Exception as e:

            print(
                "Error creando registro de auditoría:",
                e
            )

            raise

    # ==========================================================
    # LISTAR REGISTROS
    # ==========================================================

    @staticmethod
    def get_logs(limit=200):

        try:

            logs = []

            docs = (
                db.collection(
                    AuditService.COLLECTION
                )
                .order_by(
                    "created_at",
                    direction=Query.DESCENDING
                )
                .limit(limit)
                .stream()
            )

            for doc in docs:

                data = (
                    doc.to_dict()
                    or {}
                )

                data["id"] = (
                    doc.id
                )

                logs.append(
                    data
                )

            return logs

        except Exception as e:

            print(
                "Error obteniendo auditoría:",
                e
            )

            raise