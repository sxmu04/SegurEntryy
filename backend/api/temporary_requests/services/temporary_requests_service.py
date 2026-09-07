from config.firebase_config import db

from api.notifications.services.notification_service import (
    NotificationService
)

from firebase_admin import auth

from datetime import (
    datetime,
    timedelta,
    timezone
)

from uuid import uuid4

import re


class TemporaryRequestService:

    # ==========================================================
    # UTILIDADES
    # ==========================================================

    @staticmethod
    def _now():

        return datetime.now(
            timezone.utc
        )


    @staticmethod
    def _now_iso():

        return (
            TemporaryRequestService
            ._now()
            .isoformat()
        )


    @staticmethod
    def _parse_datetime(
        value
    ):

        if not value:
            return None

        if isinstance(
            value,
            datetime
        ):

            parsed = value

        else:

            raw = (
                str(value)
                .strip()
            )

            if not raw:
                return None

            if raw.endswith("Z"):

                raw = (
                    raw[:-1]
                    +
                    "+00:00"
                )

            try:

                parsed = (
                    datetime
                    .fromisoformat(
                        raw
                    )
                )

            except ValueError:

                return None

        if (
            parsed.tzinfo
            is None
        ):

            parsed = (
                parsed.replace(
                    tzinfo=timezone.utc
                )
            )

        return parsed


    @staticmethod
    def _normalize_rfid_uid(
        value
    ):

        uid = (
            str(
                value
                or ""
            )
            .strip()
            .upper()
        )

        uid = (
            uid
            .replace(
                ":",
                ""
            )
            .replace(
                "-",
                ""
            )
            .replace(
                " ",
                ""
            )
        )

        if not uid:

            raise Exception(
                "El UID RFID es obligatorio."
            )

        if not re.fullmatch(
            r"[0-9A-F]{8,32}",
            uid
        ):

            raise Exception(
                "El UID RFID no tiene un formato válido."
            )

        if (
            len(uid) % 2
            != 0
        ):

            raise Exception(
                "El UID RFID debe contener pares hexadecimales."
            )

        return uid


    @staticmethod
    def _validate_vigilante(
        uid
    ):

        uid = (
            str(
                uid
                or ""
            )
            .strip()
        )

        if not uid:

            raise Exception(
                "No se pudo identificar al vigilante."
            )

        doc = (
            db.collection(
                "users"
            )
            .document(
                uid
            )
            .get()
        )

        if not doc.exists:

            raise Exception(
                "Vigilante no encontrado."
            )

        user = (
            doc.to_dict()
            or {}
        )

        role = (
            str(
                user.get(
                    "role",
                    ""
                )
            )
            .strip()
            .lower()
        )

        if role != "vigilante":

            raise Exception(
                "Solo un Vigilante puede iniciar la asignación RFID."
            )

        if (
            user.get(
                "active",
                True
            )
            is False
        ):

            raise Exception(
                "La cuenta del Vigilante está inactiva."
            )

        return user


    @staticmethod
    def _validate_approved_request(
        request_id
    ):

        request_ref = (
            db.collection(
                "temporary_requests"
            )
            .document(
                request_id
            )
        )

        request_doc = (
            request_ref.get()
        )

        if not request_doc.exists:

            raise Exception(
                "Solicitud temporal no encontrada."
            )

        request = (
            request_doc.to_dict()
            or {}
        )

        if (
            request.get(
                "status"
            )
            != "aprobada"
        ):

            raise Exception(
                "La solicitud debe estar aprobada antes de asignar RFID."
            )

        expires_at = (
            TemporaryRequestService
            ._parse_datetime(
                request.get(
                    "expires_at"
                )
            )
        )

        if (
            not expires_at
        ):

            raise Exception(
                "La solicitud aprobada no tiene una fecha de vencimiento válida."
            )

        if (
            expires_at
            <=
            TemporaryRequestService
            ._now()
        ):

            raise Exception(
                "El acceso temporal ya venció."
            )

        user_uid = (
            str(
                request.get(
                    "userUid"
                )
                or request.get(
                    "user_uid"
                )
                or ""
            )
            .strip()
        )

        if not user_uid:

            raise Exception(
                "La solicitud aprobada no tiene un usuario temporal asociado."
            )

        user_ref = (
            db.collection(
                "users"
            )
            .document(
                user_uid
            )
        )

        user_doc = (
            user_ref.get()
        )

        if not user_doc.exists:

            raise Exception(
                "El usuario temporal asociado ya no existe."
            )

        user = (
            user_doc.to_dict()
            or {}
        )

        if (
            user.get(
                "tempAccess"
            )
            is not True
        ):

            raise Exception(
                "El usuario asociado no es un usuario temporal."
            )

        return (
            request_ref,
            request,
            user_ref,
            user
        )


    # ==========================================================
    # CREAR SOLICITUD
    # ==========================================================

    @staticmethod
    def create_request(
        data
    ):

        name = (
            str(
                data.get(
                    "name",
                    ""
                )
            )
            .strip()
        )

        email = (
            str(
                data.get(
                    "email",
                    ""
                )
            )
            .strip()
            .lower()
        )

        document_type = (
            str(
                data.get(
                    "documentType"
                )
                or data.get(
                    "document_type"
                )
                or ""
            )
            .strip()
            .upper()
        )

        document = (
            str(
                data.get(
                    "document",
                    ""
                )
            )
            .strip()
        )

        phone = (
            str(
                data.get(
                    "phone",
                    ""
                )
            )
            .strip()
            .replace(
                " ",
                ""
            )
        )

        reason = (
            str(
                data.get(
                    "reason",
                    ""
                )
            )
            .strip()
        )

        requested_by = (
            str(
                data.get(
                    "requestedBy",
                    ""
                )
            )
            .strip()
        )

        requested_by_email = (
            str(
                data.get(
                    "requestedByEmail",
                    ""
                )
            )
            .strip()
            .lower()
        )

        try:

            duration_hours = float(
                data.get(
                    "durationHours",
                    0
                )
            )

        except (
            TypeError,
            ValueError
        ):

            duration_hours = 0

        if not name:

            raise Exception(
                "El nombre es obligatorio."
            )

        if (
            len(name) < 3
            or not re.fullmatch(
                r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'.-]+",
                name
            )
        ):

            raise Exception(
                "El nombre contiene caracteres no permitidos."
            )

        if (
            not email
            or not re.fullmatch(
                r"[^@\s]+@[^@\s]+\.[^@\s]+",
                email
            )
        ):

            raise Exception(
                "El correo electrónico no es válido."
            )

        if (
            document_type
            not in [
                "CC",
                "TI"
            ]
        ):

            raise Exception(
                "El tipo de documento debe ser CC o TI."
            )

        if not re.fullmatch(
            r"\d{6,15}",
            document
        ):

            raise Exception(
                "El documento debe contener entre 6 y 15 dígitos."
            )

        if (
            phone
            and not re.fullmatch(
                r"\+?\d{7,15}",
                phone
            )
        ):

            raise Exception(
                "El teléfono no tiene un formato válido."
            )

        if (
            not reason
            or len(reason) < 5
        ):

            raise Exception(
                "Debe indicar claramente el motivo del acceso temporal."
            )

        if len(reason) > 500:

            raise Exception(
                "El motivo no puede superar los 500 caracteres."
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

        # ======================================================
        # VALIDAR VIGILANTE
        # ======================================================

        vigilante = (
            TemporaryRequestService
            ._validate_vigilante(
                requested_by
            )
        )

        vigilante_name = (
            vigilante.get(
                "name"
            )
            or vigilante.get(
                "email"
            )
            or requested_by_email
            or requested_by
        )

        # ======================================================
        # VERIFICAR SOLICITUDES PENDIENTES
        # ======================================================

        existing = (
            db.collection(
                "temporary_requests"
            )
            .where(
                "status",
                "==",
                "pendiente"
            )
            .stream()
        )

        for doc in existing:

            request_data = (
                doc.to_dict()
                or {}
            )

            existing_email = (
                str(
                    request_data.get(
                        "email",
                        ""
                    )
                )
                .strip()
                .lower()
            )

            existing_document = (
                str(
                    request_data.get(
                        "document",
                        ""
                    )
                )
                .strip()
            )

            if (
                existing_email
                == email
                or existing_document
                == document
            ):

                raise Exception(
                    "Ya existe una solicitud pendiente para este visitante."
                )

        # ======================================================
        # CREAR SOLICITUD
        # ======================================================

        request_id = (
            uuid4()
            .hex
        )

        now = (
            TemporaryRequestService
            ._now()
        )

        # Esta fecha es informativa mientras está pendiente.
        # Al aprobarse se recalcula la vigencia real desde ese momento.
        expires_at = (
            now
            +
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

            "documentType":
                document_type,

            "document_type":
                document_type,

            "document":
                document,

            "phone":
                phone,

            "reason":
                reason,

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
                "",

            "userUid":
                "",

            "rfid_uid":
                "",

            "rfid_assigned_at":
                None,

            "rfid_device":
                ""
        }

        (
            db.collection(
                "temporary_requests"
            )
            .document(
                request_id
            )
            .set(
                request
            )
        )

        # ======================================================
        # NOTIFICAR ADMINISTRADORES
        # ======================================================

        users = (
            db.collection(
                "users"
            )
            .stream()
        )

        notified = 0

        for user_doc in users:

            user = (
                user_doc.to_dict()
                or {}
            )

            role = (
                str(
                    user.get(
                        "role",
                        ""
                    )
                )
                .strip()
                .lower()
            )

            if role not in [
                "administrador",
                "super-admin",
                "superadmin",
                "super_admin"
            ]:

                continue

            uid = (
                user.get(
                    "uid"
                )
                or user_doc.id
            )

            if not uid:

                continue

            NotificationService.create_notification(

                uid=uid,

                title=(
                    "Nueva solicitud de usuario temporal"
                ),

                message=(
                    f"El vigilante {vigilante_name} "
                    f"solicitó autorización para crear "
                    f"un usuario temporal: {name}."
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

                    "document_type":
                        document_type,

                    "document":
                        document,

                    "phone":
                        phone,

                    "reason":
                        reason,

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

        return {
            **request,
            "notified_admins":
                notified
        }


    # ==========================================================
    # CONSULTAR SOLICITUDES
    # ==========================================================

    @staticmethod
    def get_requests():

        requests = []

        docs = (
            db.collection(
                "temporary_requests"
            )
            .stream()
        )

        for doc in docs:

            request = (
                doc.to_dict()
                or {}
            )

            request[
                "id"
            ] = (
                doc.id
            )

            requests.append(
                request
            )

        requests.sort(
            key=lambda item:
                item.get(
                    "created_at",
                    ""
                ),
            reverse=True
        )

        return requests


    @staticmethod
    def get_request(
        request_id
    ):

        doc = (
            db.collection(
                "temporary_requests"
            )
            .document(
                request_id
            )
            .get()
        )

        if not doc.exists:

            raise Exception(
                "Solicitud no encontrada."
            )

        request = (
            doc.to_dict()
            or {}
        )

        request[
            "id"
        ] = (
            doc.id
        )

        return request


    # ==========================================================
    # APROBAR SOLICITUD
    # ==========================================================

    @staticmethod
    def approve_request(
        request_id,
        reviewer_uid
    ):

        request_ref = (
            db.collection(
                "temporary_requests"
            )
            .document(
                request_id
            )
        )

        request_doc = (
            request_ref.get()
        )

        if not request_doc.exists:

            raise Exception(
                "Solicitud no encontrada."
            )

        request = (
            request_doc.to_dict()
            or {}
        )

        if (
            request.get(
                "status"
            )
            != "pendiente"
        ):

            raise Exception(
                "La solicitud ya fue procesada."
            )

        reviewer_doc = (
            db.collection(
                "users"
            )
            .document(
                reviewer_uid
            )
            .get()
        )

        if not reviewer_doc.exists:

            raise Exception(
                "Administrador no encontrado."
            )

        reviewer = (
            reviewer_doc.to_dict()
            or {}
        )

        reviewer_role = (
            str(
                reviewer.get(
                    "role",
                    ""
                )
            )
            .strip()
            .lower()
        )

        if reviewer_role not in [
            "administrador",
            "super-admin",
            "superadmin",
            "super_admin"
        ]:

            raise Exception(
                "No tiene permisos para aprobar solicitudes."
            )

        email = (
            str(
                request.get(
                    "email",
                    ""
                )
            )
            .strip()
            .lower()
        )

        name = (
            str(
                request.get(
                    "name",
                    ""
                )
            )
            .strip()
        )

        if not email:

            raise Exception(
                "La solicitud no tiene correo electrónico."
            )

        if not name:

            raise Exception(
                "La solicitud no tiene nombre."
            )

        # ======================================================
        # CREAR / OBTENER USUARIO DE FIREBASE
        # ======================================================

        try:

            firebase_user = (
                auth.get_user_by_email(
                    email
                )
            )

            uid = (
                firebase_user.uid
            )

            existing_firestore = (
                db.collection(
                    "users"
                )
                .document(
                    uid
                )
                .get()
            )

            if existing_firestore.exists:

                existing_data = (
                    existing_firestore.to_dict()
                    or {}
                )

                if (
                    existing_data.get(
                        "tempAccess"
                    )
                    is not True
                ):

                    raise Exception(
                        "El correo ya pertenece a un usuario permanente del sistema."
                    )

            auth.update_user(
                uid,
                disabled=False,
                display_name=name
            )

        except auth.UserNotFoundError:

            firebase_user = (
                auth.create_user(
                    email=email,
                    display_name=name
                )
            )

            uid = (
                firebase_user.uid
            )

        # ======================================================
        # CALCULAR VIGENCIA REAL DESDE LA APROBACIÓN
        # ======================================================

        now = (
            TemporaryRequestService
            ._now()
        )

        try:

            duration_hours = float(
                request.get(
                    "durationHours",
                    1
                )
            )

        except (
            TypeError,
            ValueError
        ):

            duration_hours = 1

        duration_hours = max(
            1,
            min(
                duration_hours,
                24
            )
        )

        expires_at = (
            now
            +
            timedelta(
                hours=duration_hours
            )
        )

        # ======================================================
        # CREAR / ACTUALIZAR USUARIO TEMPORAL
        # ======================================================

        user_data = {

            "uid":
                uid,

            "name":
                name,

            "email":
                email,

            "document_type":
                request.get(
                    "document_type"
                )
                or request.get(
                    "documentType"
                )
                or "",

            "document":
                request.get(
                    "document",
                    ""
                ),

            "phone":
                request.get(
                    "phone",
                    ""
                ),

            "role":
                "usuario",

            "active":
                True,

            "inside":
                False,

            "tempAccess":
                True,

            "temporary_reason":
                request.get(
                    "reason",
                    ""
                ),

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
                ),

            # Por seguridad, cada nueva aprobación exige
            # volver a asociar físicamente una tarjeta.
            "rfid_uid":
                "",

            "rfid_assigned_at":
                None,

            "rfid_device":
                ""
        }

        (
            db.collection(
                "users"
            )
            .document(
                uid
            )
            .set(
                user_data,
                merge=True
            )
        )

        reviewer_name = (
            reviewer.get(
                "name"
            )
            or reviewer.get(
                "email"
            )
            or reviewer_uid
        )

        # ======================================================
        # ACTUALIZAR SOLICITUD
        # ======================================================

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
                expires_at.isoformat(),

            "rfid_uid":
                "",

            "rfid_assigned_at":
                None,

            "rfid_device":
                ""
        })

        NotificationService.delete_by_request_id(
            request_id
        )

        # ======================================================
        # NOTIFICAR AL VIGILANTE
        # ======================================================

        vigilante_uid = (
            request.get(
                "requestedBy"
            )
        )

        if vigilante_uid:

            NotificationService.create_notification(

                uid=vigilante_uid,

                title=
                    "Solicitud aprobada",

                message=(
                    f"La solicitud para {name} fue aprobada. "
                    f"Ya puedes asignar su tarjeta RFID."
                ),

                notification_type=
                    "temporary_request_approved",

                data={

                    "request_id":
                        request_id,

                    "user_uid":
                        uid,

                    "name":
                        name,

                    "email":
                        email,

                    "document_type":
                        request.get(
                            "document_type"
                        )
                        or request.get(
                            "documentType"
                        )
                        or "",

                    "document":
                        request.get(
                            "document",
                            ""
                        ),

                    "phone":
                        request.get(
                            "phone",
                            ""
                        ),

                    "reason":
                        request.get(
                            "reason",
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
                        expires_at.isoformat(),

                    "rfid_uid":
                        ""
                }

            )

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
                expires_at.isoformat(),

            "rfid_uid":
                ""
        }


    # ==========================================================
    # RECHAZAR SOLICITUD
    # ==========================================================

    @staticmethod
    def reject_request(
        request_id,
        reviewer_uid,
        reason=""
    ):

        request_ref = (
            db.collection(
                "temporary_requests"
            )
            .document(
                request_id
            )
        )

        request_doc = (
            request_ref.get()
        )

        if not request_doc.exists:

            raise Exception(
                "Solicitud no encontrada."
            )

        request = (
            request_doc.to_dict()
            or {}
        )

        if (
            request.get(
                "status"
            )
            != "pendiente"
        ):

            raise Exception(
                "La solicitud ya fue procesada."
            )

        reviewer_doc = (
            db.collection(
                "users"
            )
            .document(
                reviewer_uid
            )
            .get()
        )

        if not reviewer_doc.exists:

            raise Exception(
                "Administrador no encontrado."
            )

        reviewer = (
            reviewer_doc.to_dict()
            or {}
        )

        reviewer_role = (
            str(
                reviewer.get(
                    "role",
                    ""
                )
            )
            .strip()
            .lower()
        )

        if reviewer_role not in [
            "administrador",
            "super-admin",
            "superadmin",
            "super_admin"
        ]:

            raise Exception(
                "No tiene permisos para rechazar solicitudes."
            )

        now = (
            TemporaryRequestService
            ._now()
        )

        rejection_reason = (
            str(
                reason
            )
            .strip()
            or
            "Solicitud rechazada por el administrador."
        )

        reviewer_name = (
            reviewer.get(
                "name"
            )
            or reviewer.get(
                "email"
            )
            or reviewer_uid
        )

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

        vigilante_uid = (
            request.get(
                "requestedBy"
            )
        )

        if vigilante_uid:

            NotificationService.create_notification(

                uid=vigilante_uid,

                title=
                    "Solicitud rechazada",

                message=(
                    f"La solicitud para "
                    f"{request.get('name', '')} "
                    f"fue rechazada."
                ),

                notification_type=
                    "temporary_request_rejected",

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


    # ==========================================================
    # RFID — INICIAR ASIGNACIÓN
    # ==========================================================

    @staticmethod
    def start_rfid_enrollment(
        request_id,
        actor_uid,
        device="SEGURENTRY-ESP32"
    ):

        actor = (
            TemporaryRequestService
            ._validate_vigilante(
                actor_uid
            )
        )

        (
            request_ref,
            request,
            user_ref,
            user
        ) = (
            TemporaryRequestService
            ._validate_approved_request(
                request_id
            )
        )

        device = (
            str(
                device
                or "SEGURENTRY-ESP32"
            )
            .strip()
        )

        # Cancelar procesos anteriores pendientes de esta solicitud.
        jobs = (
            db.collection(
                "rfid_jobs"
            )
            .stream()
        )

        for job_doc in jobs:

            job = (
                job_doc.to_dict()
                or {}
            )

            if (
                job.get(
                    "request_id"
                )
                == request_id
                and job.get(
                    "status"
                )
                == "pending"
            ):

                job_doc.reference.update({

                    "status":
                        "cancelled",

                    "message":
                        "Proceso reemplazado por una nueva solicitud de lectura.",

                    "updated_at":
                        TemporaryRequestService
                        ._now_iso()
                })

        job_id = (
            uuid4()
            .hex
        )

        now = (
            TemporaryRequestService
            ._now()
        )

        expires_at = (
            now
            +
            timedelta(
                minutes=3
            )
        )

        job = {

            "id":
                job_id,

            "action":
                "enroll",

            "status":
                "pending",

            "message":
                "Esperando una tarjeta RFID en el lector.",

            "error":
                "",

            "request_id":
                request_id,

            "user_uid":
                user_ref.id,

            "user_name":
                user.get(
                    "name",
                    request.get(
                        "name",
                        "Usuario temporal"
                    )
                ),

            "actor_uid":
                actor_uid,

            "actor_name":
                actor.get(
                    "name"
                )
                or actor.get(
                    "email"
                )
                or actor_uid,

            "device":
                device,

            "created_at":
                now.isoformat(),

            "updated_at":
                now.isoformat(),

            "expires_at":
                expires_at.isoformat(),

            "rfid_uid":
                ""
        }

        (
            db.collection(
                "rfid_jobs"
            )
            .document(
                job_id
            )
            .set(
                job
            )
        )

        return job


    # ==========================================================
    # RFID — CONSULTAR JOB
    # ==========================================================

    @staticmethod
    def get_rfid_job(
        job_id
    ):

        ref = (
            db.collection(
                "rfid_jobs"
            )
            .document(
                job_id
            )
        )

        doc = (
            ref.get()
        )

        if not doc.exists:

            raise Exception(
                "Proceso RFID no encontrado."
            )

        job = (
            doc.to_dict()
            or {}
        )

        if (
            job.get(
                "status"
            )
            == "pending"
        ):

            expires_at = (
                TemporaryRequestService
                ._parse_datetime(
                    job.get(
                        "expires_at"
                    )
                )
            )

            if (
                expires_at
                and expires_at
                <=
                TemporaryRequestService
                ._now()
            ):

                ref.update({

                    "status":
                        "expired",

                    "message":
                        "El tiempo para leer la tarjeta RFID se agotó.",

                    "updated_at":
                        TemporaryRequestService
                        ._now_iso()
                })

                job[
                    "status"
                ] = (
                    "expired"
                )

                job[
                    "message"
                ] = (
                    "El tiempo para leer la tarjeta RFID se agotó."
                )

        job[
            "id"
        ] = (
            doc.id
        )

        return job


    # ==========================================================
    # RFID — ESP32 CONSULTA TRABAJO PENDIENTE
    # ==========================================================

    @staticmethod
    def get_pending_rfid_job(
        device="SEGURENTRY-ESP32"
    ):

        device = (
            str(
                device
                or "SEGURENTRY-ESP32"
            )
            .strip()
        )

        pending = []

        docs = (
            db.collection(
                "rfid_jobs"
            )
            .stream()
        )

        now = (
            TemporaryRequestService
            ._now()
        )

        for doc in docs:

            job = (
                doc.to_dict()
                or {}
            )

            if (
                job.get(
                    "status"
                )
                != "pending"
            ):

                continue

            if (
                str(
                    job.get(
                        "device",
                        ""
                    )
                )
                .strip()
                != device
            ):

                continue

            expires_at = (
                TemporaryRequestService
                ._parse_datetime(
                    job.get(
                        "expires_at"
                    )
                )
            )

            if (
                expires_at
                and expires_at
                <= now
            ):

                doc.reference.update({

                    "status":
                        "expired",

                    "message":
                        "El tiempo para leer la tarjeta RFID se agotó.",

                    "updated_at":
                        now.isoformat()
                })

                continue

            job[
                "id"
            ] = (
                doc.id
            )

            pending.append(
                job
            )

        pending.sort(
            key=lambda item:
                item.get(
                    "created_at",
                    ""
                )
        )

        return (
            pending[0]
            if pending
            else None
        )


    # ==========================================================
    # RFID — ESP32 COMPLETA ASIGNACIÓN
    # ==========================================================

    @staticmethod
    def complete_rfid_enrollment(
        job_id,
        rfid_uid,
        device=""
    ):

        job_ref = (
            db.collection(
                "rfid_jobs"
            )
            .document(
                job_id
            )
        )

        job_doc = (
            job_ref.get()
        )

        if not job_doc.exists:

            raise Exception(
                "Proceso RFID no encontrado."
            )

        job = (
            job_doc.to_dict()
            or {}
        )

        if (
            job.get(
                "status"
            )
            != "pending"
        ):

            raise Exception(
                "El proceso RFID ya no está pendiente."
            )

        expires_at = (
            TemporaryRequestService
            ._parse_datetime(
                job.get(
                    "expires_at"
                )
            )
        )

        if (
            expires_at
            and expires_at
            <=
            TemporaryRequestService
            ._now()
        ):

            job_ref.update({

                "status":
                    "expired",

                "message":
                    "El tiempo para leer la tarjeta RFID se agotó.",

                "updated_at":
                    TemporaryRequestService
                    ._now_iso()
            })

            raise Exception(
                "El proceso RFID expiró."
            )

        normalized_uid = (
            TemporaryRequestService
            ._normalize_rfid_uid(
                rfid_uid
            )
        )

        request_id = (
            str(
                job.get(
                    "request_id",
                    ""
                )
            )
            .strip()
        )

        (
            request_ref,
            request,
            user_ref,
            user
        ) = (
            TemporaryRequestService
            ._validate_approved_request(
                request_id
            )
        )

        # Verificar que la tarjeta no pertenezca a otra cuenta.
        duplicates = (
            db.collection(
                "users"
            )
            .where(
                "rfid_uid",
                "==",
                normalized_uid
            )
            .limit(
                2
            )
            .stream()
        )

        for duplicate_doc in duplicates:

            if (
                duplicate_doc.id
                != user_ref.id
            ):

                raise Exception(
                    "Esta tarjeta RFID ya está asociada a otro usuario."
                )

        now = (
            TemporaryRequestService
            ._now()
        )

        actual_device = (
            str(
                device
                or job.get(
                    "device"
                )
                or "SEGURENTRY-ESP32"
            )
            .strip()
        )

        user_ref.update({

            "rfid_uid":
                normalized_uid,

            "rfid_assigned_at":
                now.isoformat(),

            "rfid_device":
                actual_device,

            "inside":
                False
        })

        request_ref.update({

            "rfid_uid":
                normalized_uid,

            "rfid_assigned_at":
                now.isoformat(),

            "rfid_device":
                actual_device
        })

        job_ref.update({

            "status":
                "completed",

            "message":
                "Tarjeta RFID asociada correctamente.",

            "rfid_uid":
                normalized_uid,

            "device":
                actual_device,

            "completed_at":
                now.isoformat(),

            "updated_at":
                now.isoformat()
        })

        vigilante_uid = (
            request.get(
                "requestedBy"
            )
            or job.get(
                "actor_uid"
            )
        )

        if vigilante_uid:

            try:

                NotificationService.create_notification(

                    uid=vigilante_uid,

                    title=
                        "Tarjeta RFID asignada",

                    message=(
                        f"La tarjeta RFID de "
                        f"{request.get('name', 'usuario temporal')} "
                        f"fue asociada correctamente."
                    ),

                    notification_type=
                        "temporary_rfid_assigned",

                    data={

                        "request_id":
                            request_id,

                        "user_uid":
                            user_ref.id,

                        "rfid_uid":
                            normalized_uid,

                        "device":
                            actual_device,

                        "status":
                            "completed"
                    }

                )

            except Exception as notification_error:

                print(
                    "ERROR NOTIFICANDO RFID:",
                    notification_error
                )

        return {

            "id":
                job_id,

            "status":
                "completed",

            "request_id":
                request_id,

            "user_uid":
                user_ref.id,

            "rfid_uid":
                normalized_uid,

            "device":
                actual_device,

            "message":
                "Tarjeta RFID asociada correctamente."
        }
