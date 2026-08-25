from config.firebase_config import db
from api.notifications.services.notification_service import NotificationService
from firebase_admin import auth
from datetime import datetime, timedelta
from uuid import uuid4


class TemporaryRequestService:

    @staticmethod
    def create_request(data):

        name = str(data.get("name", "")).strip()
        email = str(data.get("email", "")).strip()
        document = str(data.get("document", "")).strip()
        requested_by = str(data.get("requestedBy", "")).strip()
        requested_by_email = str(
            data.get("requestedByEmail", "")
        ).strip()

        try:
            duration_hours = float(
                data.get("durationHours", 0)
            )
        except (TypeError, ValueError):
            duration_hours = 0

        if not name:
            raise Exception(
                "El nombre es obligatorio."
            )

        if not email:
            raise Exception(
                "El correo es obligatorio."
            )

        if not document:
            raise Exception(
                "El documento es obligatorio."
            )

        if not requested_by:
            raise Exception(
                "No se pudo identificar al vigilante."
            )

        if duration_hours <= 0:
            raise Exception(
                "La duración debe ser mayor a cero."
            )

        if duration_hours > 24:
            raise Exception(
                "La duración máxima permitida es de 24 horas."
            )

        # =====================================================
        # OBTENER DATOS DEL VIGILANTE
        # =====================================================

        vigilante_name = requested_by_email

        vigilante_doc = (
            db.collection("users")
            .document(requested_by)
            .get()
        )

        if vigilante_doc.exists:

            vigilante = vigilante_doc.to_dict()

            vigilante_name = (
                vigilante.get("name")
                or vigilante.get("email")
                or requested_by_email
            )

        # =====================================================
        # VERIFICAR SOLICITUDES PENDIENTES
        # =====================================================

        existing = (
            db.collection("temporary_requests")
            .where(
                "requestedBy",
                "==",
                requested_by
            )
            .where(
                "status",
                "==",
                "pendiente"
            )
            .stream()
        )

        for doc in existing:

            request_data = doc.to_dict()

            existing_email = str(
                request_data.get("email", "")
            ).strip().lower()

            existing_document = str(
                request_data.get("document", "")
            ).strip()

            if (
                existing_email == email.lower()
                and existing_document == document
            ):
                raise Exception(
                    "Ya existe una solicitud pendiente "
                    "para este usuario."
                )

        # =====================================================
        # CREAR SOLICITUD
        # =====================================================

        request_id = uuid4().hex

        now = datetime.utcnow()

        expires_at = (
            now +
            timedelta(
                hours=duration_hours
            )
        )

        request = {

            "id":
                request_id,

            "name":
                name,

            "email":
                email,

            "document":
                document,

            "requestedBy":
                requested_by,

            "requestedByName":
                vigilante_name,

            "requestedByEmail":
                requested_by_email,

            "status":
                "pendiente",

            "durationHours":
                duration_hours,

            "created_at":
                now.isoformat(),

            "expires_at":
                expires_at.isoformat(),

            "reviewedBy":
                "",

            "reviewedByName":
                "",

            "reviewedAt":
                None,

            "rejectionReason":
                ""
        }

        (
            db.collection("temporary_requests")
            .document(request_id)
            .set(request)
        )

        # =====================================================
        # NOTIFICAR ADMINISTRADORES
        # =====================================================

        users = (
            db.collection("users")
            .stream()
        )

        notified = 0

        for user_doc in users:

            user = user_doc.to_dict()

            role = str(
                user.get("role", "")
            ).strip().lower()

            if role not in [
                "administrador",
                "super-admin"
            ]:
                continue

            uid = (
                user.get("uid")
                or user_doc.id
            )

            if not uid:
                continue

            NotificationService.create_notification(

                uid=uid,

                title=(
                    "Nueva solicitud de "
                    "usuario temporal"
                ),

                message=(
                    f"El vigilante "
                    f"{vigilante_name} "
                    f"solicitó autorización "
                    f"para crear un usuario "
                    f"temporal: {name}."
                ),

                notification_type=
                    "temporary_request",

                data={

                    "request_id":
                        request_id,

                    "requested_by":
                        requested_by,

                    "requested_by_name":
                        vigilante_name,

                    "requested_by_email":
                        requested_by_email,

                    "name":
                        name,

                    "email":
                        email,

                    "document":
                        document,

                    "duration_hours":
                        duration_hours,

                    "created_at":
                        now.isoformat(),

                    "expires_at":
                        expires_at.isoformat(),

                    "status":
                        "pendiente"
                }
            )

            notified += 1

        # =====================================================
        # RESPUESTA
        # =====================================================

        return {
            **request,
            "notified_admins":
                notified
        }

    @staticmethod
    def get_requests():

        requests = []

        docs = (
            db.collection("temporary_requests")
            .stream()
        )

        for doc in docs:

            request = doc.to_dict()

            request["id"] = doc.id

            requests.append(request)

        requests.sort(
            key=lambda item:
                item.get("created_at", ""),
            reverse=True
        )

        return requests

    @staticmethod
    def get_request(request_id):

        doc = (
            db.collection("temporary_requests")
            .document(request_id)
            .get()
        )

        if not doc.exists:
            raise Exception(
                "Solicitud no encontrada."
            )

        request = doc.to_dict()

        request["id"] = doc.id

        return request

    @staticmethod
    def approve_request(
        request_id,
        reviewer_uid
    ):

        request_ref = (
            db.collection("temporary_requests")
            .document(request_id)
        )

        request_doc = request_ref.get()

        if not request_doc.exists:
            raise Exception(
                "Solicitud no encontrada."
            )

        request = request_doc.to_dict()

        if request.get("status") != "pendiente":
            raise Exception(
                "La solicitud ya fue procesada."
            )

        reviewer_doc = (
            db.collection("users")
            .document(reviewer_uid)
            .get()
        )

        if not reviewer_doc.exists:
            raise Exception(
                "Administrador no encontrado."
            )

        reviewer = reviewer_doc.to_dict()

        reviewer_role = str(
            reviewer.get("role", "")
        ).strip().lower()

        if reviewer_role not in [
            "administrador",
            "super-admin"
        ]:
            raise Exception(
                "No tiene permisos para aprobar solicitudes."
            )

        email = str(
            request.get("email", "")
        ).strip()

        name = str(
            request.get("name", "")
        ).strip()

        if not email:
            raise Exception(
                "La solicitud no tiene correo electrónico."
            )

        if not name:
            raise Exception(
                "La solicitud no tiene nombre."
            )

        # =====================================================
        # CREAR / OBTENER USUARIO DE FIREBASE
        # =====================================================

        try:

            firebase_user = auth.get_user_by_email(
                email
            )

            uid = firebase_user.uid

            auth.update_user(
                firebase_user,
                disabled=False,
                display_name=name
            )

        except auth.UserNotFoundError:

            firebase_user = auth.create_user(
                email=email,
                display_name=name
            )

            uid = firebase_user.uid

        # =====================================================
        # CALCULAR EXPIRACIÓN REAL
        # =====================================================

        now = datetime.utcnow()

        try:
            duration_hours = float(
                request.get(
                    "durationHours",
                    1
                )
            )
        except (TypeError, ValueError):
            duration_hours = 1

        if duration_hours <= 0:
            duration_hours = 1

        if duration_hours > 24:
            duration_hours = 24

        expires_at = (
            now +
            timedelta(
                hours=duration_hours
            )
        )

        # =====================================================
        # CREAR / ACTUALIZAR USUARIO
        # =====================================================

        user_data = {

            "uid":
                uid,

            "name":
                name,

            "email":
                email,

            "document":
                request.get(
                    "document",
                    ""
                ),

            "role":
                "usuario",

            "active":
                True,

            "tempAccess":
                True,

            "created_at":
                now.isoformat(),

            "expires_at":
                expires_at.isoformat(),

            "temporary_request_id":
                request_id,

            "created_by":
                request.get(
                    "requestedBy",
                    ""
                )
        }

        (
            db.collection("users")
            .document(uid)
            .set(
                user_data,
                merge=True
            )
        )

        # =====================================================
        # DATOS DEL ADMINISTRADOR
        # =====================================================

        reviewer_name = (
            reviewer.get("name")
            or reviewer.get("email")
            or reviewer_uid
        )

        # =====================================================
        # ACTUALIZAR SOLICITUD
        # =====================================================

        request_ref.update({

            "status":
                "aprobada",

            "reviewedBy":
                reviewer_uid,

            "reviewedByName":
                reviewer_name,

            "reviewedAt":
                now.isoformat(),

            "userUid":
                uid,

            "expires_at":
                expires_at.isoformat()

        })

        NotificationService.delete_by_request_id(
            request_id
        )

        # =====================================================
        # NOTIFICAR AL VIGILANTE
        # =====================================================

        vigilante_uid = request.get(
            "requestedBy"
        )

        if vigilante_uid:

            NotificationService.create_notification(
                uid=vigilante_uid,
                title="Solicitud aprobada",
                message=(
                    f"La solicitud para "
                    f"{name} fue aprobada."
                ),
                notification_type="temporary_request_approved",
                data={

                    "request_id":
                        request_id,

                    "user_uid":
                        uid,

                    "name":
                        name,

                    "email":
                        email,

                    "document":
                        request.get(
                            "document",
                            ""
                        ),

                    "duration_hours":
                        duration_hours,

                    "status":
                        "aprobada",

                    "approved_by":
                        reviewer_uid,

                    "approved_by_name":
                        reviewer_name,

                    "expires_at":
                        expires_at.isoformat()

                }

            )

        # =====================================================
        # RESPUESTA
        # =====================================================

        return {

            **request,

            "id":
                request_id,

            "status":
                "aprobada",

            "userUid":
                uid,

            "reviewedBy":
                reviewer_uid,

            "reviewedByName":
                reviewer_name,

            "expires_at":
                expires_at.isoformat()

        }

    @staticmethod
    def reject_request(
        request_id,
        reviewer_uid,
        reason=""
    ):

        request_ref = (
            db.collection("temporary_requests")
            .document(request_id)
        )

        request_doc = request_ref.get()

        if not request_doc.exists:
            raise Exception(
                "Solicitud no encontrada."
            )

        request = request_doc.to_dict()

        if request.get("status") != "pendiente":
            raise Exception(
                "La solicitud ya fue procesada."
            )

        reviewer_doc = (
            db.collection("users")
            .document(reviewer_uid)
            .get()
        )

        if not reviewer_doc.exists:
            raise Exception(
                "Administrador no encontrado."
            )

        reviewer = reviewer_doc.to_dict()

        reviewer_role = str(
            reviewer.get("role", "")
        ).strip().lower()

        if reviewer_role not in [
            "administrador",
            "super-admin"
        ]:
            raise Exception(
                "No tiene permisos para rechazar solicitudes."
            )

        now = datetime.utcnow()

        rejection_reason = (
            str(reason).strip()
            or
            "Solicitud rechazada por el administrador."
        )

        reviewer_name = (
            reviewer.get("name")
            or reviewer.get("email")
            or reviewer_uid
        )

        # =====================================================
        # ACTUALIZAR SOLICITUD
        # =====================================================

        request_ref.update({

            "status":
                "rechazada",

            "reviewedBy":
                reviewer_uid,

            "reviewedByName":
                reviewer_name,

            "reviewedAt":
                now.isoformat(),

            "rejectionReason":
                rejection_reason

        })

        NotificationService.delete_by_request_id(
            request_id
        )
        # =====================================================
        # NOTIFICAR AL VIGILANTE
        # =====================================================

        vigilante_uid = request.get(
            "requestedBy"
        )

        if vigilante_uid:

           NotificationService.create_notification(
                uid=vigilante_uid,
                title="Solicitud rechazada",
                message=(
                    f"La solicitud para "
                    f"{request.get('name', '')} "
                    f"fue rechazada."
                ),
                notification_type="temporary_request_rejected",
                data={
                    "request_id":
                        request_id,

                    "name":
                        request.get(
                            "name",
                            ""
                        ),

                    "email":
                        request.get(
                            "email",
                            ""
                        ),

                    "document":
                        request.get(
                            "document",
                            ""
                        ),

                    "status":
                        "rechazada",

                    "reason":
                        rejection_reason,

                    "rejected_by":
                        reviewer_uid,

                    "rejected_by_name":
                        reviewer_name,

                    "reviewed_at":
                        now.isoformat()

                }

            )

        # =====================================================
        # RESPUESTA
        # =====================================================

        return {

            **request,

            "id":
                request_id,

            "status":
                "rechazada",

            "reviewedBy":
                reviewer_uid,

            "reviewedByName":
                reviewer_name,

            "rejectionReason":
                rejection_reason

        }