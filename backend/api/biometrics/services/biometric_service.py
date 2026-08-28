from datetime import datetime, timedelta
from uuid import uuid4

from config.firebase_config import db


class BiometricService:

    ACTIVE_JOB_STATUSES = {
        "pending",
        "processing"
    }

    DEFAULT_DEVICE = "SEGURENTRY-ESP32"

    # ==========================================================
    # UTILIDADES
    # ==========================================================

    @staticmethod
    def _now():
        return datetime.utcnow()

    @staticmethod
    def _now_iso():
        return BiometricService._now().isoformat()

    @staticmethod
    def _get_user(uid):
        uid = str(uid or "").strip()

        if not uid:
            raise Exception(
                "El UID del usuario es obligatorio."
            )

        user_ref = (
            db.collection("users")
            .document(uid)
        )

        user_doc = user_ref.get()

        if not user_doc.exists:
            raise Exception(
                "Usuario no encontrado."
            )

        user = (
            user_doc.to_dict()
            or {}
        )

        user["uid"] = (
            user.get("uid")
            or uid
        )

        return user


    @staticmethod
    def _normalize_role(role):

        return (
            str(
                role
                or ""
            )
            .strip()
            .lower()
            .replace("_", "-")
            .replace(" ", "-")
        )


    @staticmethod
    def _is_protected_role(role):

        return (
            BiometricService
            ._normalize_role(
                role
            )
            in {
                "administrador",
                "admin",
                "administrator",
                "super-admin",
                "superadmin",
                "super-administrador"
            }
        )


    @staticmethod
    def _validate_deletion_permission(
        target_user,
        actor_uid
    ):

        actor_uid = (
            str(
                actor_uid
                or ""
            )
            .strip()
        )

        # Uso interno del backend (por ejemplo limpieza al eliminar usuario).
        if not actor_uid:
            return

        actor = (
            BiometricService
            ._get_user(
                actor_uid
            )
        )

        actor_role = (
            BiometricService
            ._normalize_role(
                actor.get(
                    "role"
                )
            )
        )

        target_role = (
            target_user.get(
                "role"
            )
        )

        if actor_role in {
            "super-admin",
            "superadmin",
            "super-administrador"
        }:
            return

        if (
            actor_role in {
                "administrador",
                "admin",
                "administrator"
            }
            and
            BiometricService
            ._is_protected_role(
                target_role
            )
        ):

            raise PermissionError(
                "El Administrador no puede modificar ni eliminar "
                "huellas de Administradores o Super Administradores."
            )


    @staticmethod
    def _job_with_id(doc):
        data = (
            doc.to_dict()
            or {}
        )

        data["id"] = doc.id

        return data

    @staticmethod
    def _get_active_jobs():
        jobs = []

        for doc in (
            db.collection("biometric_jobs")
            .stream()
        ):
            data = (
                doc.to_dict()
                or {}
            )

            if (
                data.get("status")
                in BiometricService.ACTIVE_JOB_STATUSES
            ):
                data["id"] = doc.id
                jobs.append(data)

        return jobs

    # ==========================================================
    # USUARIOS PARA EL MÓDULO DE BIOMETRÍA
    # ==========================================================

    @staticmethod
    def list_users():

        active_jobs = (
            BiometricService
            ._get_active_jobs()
        )

        active_by_uid = {
            job.get("uid"): job
            for job in active_jobs
            if job.get("uid")
        }

        users = []

        for doc in (
            db.collection("users")
            .stream()
        ):

            user = (
                doc.to_dict()
                or {}
            )

            uid = (
                user.get("uid")
                or doc.id
            )

            fingerprint_id = (
                user.get("fingerprint_id")
            )

            job = (
                active_by_uid.get(uid)
            )

            users.append({
                "uid":
                    uid,

                "name":
                    user.get("name", ""),

                "email":
                    user.get("email", ""),

                "document":
                    user.get("document", ""),

                "document_type":
                    user.get(
                        "document_type",
                        ""
                    ),

                "role":
                    user.get("role", ""),

                "active":
                    user.get(
                        "active",
                        True
                    ),

                "fingerprint_id":
                    fingerprint_id,

                "biometric_registered":
                    fingerprint_id
                    is not None,

                "biometric_job":
                    (
                        {
                            "id":
                                job.get("id"),

                            "status":
                                job.get("status"),

                            "action":
                                job.get("action"),

                            "message":
                                job.get(
                                    "message",
                                    ""
                                )
                        }
                        if job
                        else None
                    )
            })

        users.sort(
            key=lambda item:
                str(
                    item.get(
                        "name",
                        ""
                    )
                ).lower()
        )

        return users

    # ==========================================================
    # CREAR TRABAJO DE REGISTRO DE HUELLA
    # ==========================================================

    @staticmethod
    def create_enrollment_job(
        uid,
        actor_uid="",
        device=None
    ):

        user = (
            BiometricService
            ._get_user(uid)
        )

        if (
            user.get("fingerprint_id")
            is not None
        ):
            raise Exception(
                "Este usuario ya tiene una huella registrada."
            )

        active_jobs = (
            BiometricService
            ._get_active_jobs()
        )

        for job in active_jobs:

            if (
                job.get("uid")
                == user["uid"]
            ):
                raise Exception(
                    "Este usuario ya tiene un proceso biométrico en curso."
                )

        # Un solo AS608: evita mandar dos registros al mismo tiempo.
        if active_jobs:
            raise Exception(
                "Ya existe otro proceso biométrico en curso. "
                "Finalízalo antes de iniciar uno nuevo."
            )

        job_id = (
            uuid4().hex
        )

        now = (
            BiometricService
            ._now_iso()
        )

        job_data = {

            "id":
                job_id,

            "uid":
                user["uid"],

            "user_name":
                user.get(
                    "name",
                    "Usuario"
                ),

            "action":
                "enroll",

            "status":
                "pending",

            "device":
                (
                    str(
                        device
                        or BiometricService.DEFAULT_DEVICE
                    )
                    .strip()
                ),

            "actor_uid":
                str(
                    actor_uid
                    or ""
                ).strip(),

            "fingerprint_id":
                None,

            "message":
                "Esperando al dispositivo biométrico.",

            "error":
                "",

            "created_at":
                now,

            "updated_at":
                now,

            "processing_at":
                None,

            "completed_at":
                None
        }

        (
            db.collection(
                "biometric_jobs"
            )
            .document(job_id)
            .set(job_data)
        )

        return job_data

    # ==========================================================
    # CREAR TRABAJO DE ELIMINACIÓN DE HUELLA
    # ==========================================================

    @staticmethod
    def create_deletion_job(
        uid,
        actor_uid="",
        device=None
    ):

        user = (
            BiometricService
            ._get_user(uid)
        )

        (
            BiometricService
            ._validate_deletion_permission(
                target_user=user,
                actor_uid=actor_uid
            )
        )

        raw_fingerprint_id = (
            user.get(
                "fingerprint_id"
            )
        )

        if (
            raw_fingerprint_id is None
            or
            str(raw_fingerprint_id).strip() == ""
        ):

            return None

        try:

            fingerprint_id = int(
                raw_fingerprint_id
            )

        except (
            TypeError,
            ValueError
        ):

            raise Exception(
                "El usuario tiene un ID de huella inválido."
            )

        if fingerprint_id <= 0:

            raise Exception(
                "El ID de huella debe ser mayor que 0."
            )

        active_jobs = (
            BiometricService
            ._get_active_jobs()
        )

        for job in active_jobs:

            if (
                job.get("uid")
                == user["uid"]
            ):

                raise Exception(
                    "Este usuario ya tiene un proceso biométrico en curso."
                )

        # Hay un único AS608. Mientras se libera una posición
        # no iniciamos otro proceso biométrico.
        if active_jobs:

            raise Exception(
                "Ya existe otro proceso biométrico en curso. "
                "Finalízalo antes de eliminar este usuario."
            )

        job_id = (
            uuid4().hex
        )

        now = (
            BiometricService
            ._now_iso()
        )

        job_data = {

            "id":
                job_id,

            "uid":
                user["uid"],

            "user_name":
                user.get(
                    "name",
                    "Usuario"
                ),

            "action":
                "delete",

            "status":
                "pending",

            "device":
                (
                    str(
                        device
                        or BiometricService.DEFAULT_DEVICE
                    )
                    .strip()
                ),

            "actor_uid":
                str(
                    actor_uid
                    or ""
                ).strip(),

            "fingerprint_id":
                fingerprint_id,

            "message":
                (
                    "Esperando al dispositivo para liberar "
                    f"la huella ID {fingerprint_id}."
                ),

            "error":
                "",

            "created_at":
                now,

            "updated_at":
                now,

            "processing_at":
                None,

            "completed_at":
                None
        }

        (
            db.collection(
                "biometric_jobs"
            )
            .document(job_id)
            .set(job_data)
        )

        return job_data

    # ==========================================================
    # OBTENER TRABAJO
    # ==========================================================

    @staticmethod
    def get_job(job_id):

        job_id = (
            str(
                job_id
                or ""
            ).strip()
        )

        if not job_id:
            raise Exception(
                "El ID del proceso es obligatorio."
            )

        doc = (
            db.collection(
                "biometric_jobs"
            )
            .document(job_id)
            .get()
        )

        if not doc.exists:
            raise Exception(
                "Proceso biométrico no encontrado."
            )

        return (
            BiometricService
            ._job_with_id(doc)
        )

    # ==========================================================
    # SIGUIENTE TRABAJO PARA EL ESP32
    # ==========================================================

    @staticmethod
    def get_next_device_job(
        device=None
    ):

        device = (
            str(
                device
                or BiometricService.DEFAULT_DEVICE
            )
            .strip()
        )

        pending = []

        for doc in (
            db.collection(
                "biometric_jobs"
            )
            .stream()
        ):

            data = (
                doc.to_dict()
                or {}
            )

            if (
                data.get("status")
                != "pending"
            ):
                continue

            target_device = (
                str(
                    data.get(
                        "device",
                        ""
                    )
                    or ""
                ).strip()
            )

            if (
                target_device
                and
                target_device != device
            ):
                continue

            data["id"] = doc.id
            pending.append(data)

        if not pending:
            return None

        pending.sort(
            key=lambda item:
                item.get(
                    "created_at",
                    ""
                )
        )

        job = pending[0]

        now = (
            BiometricService
            ._now_iso()
        )

        (
            db.collection(
                "biometric_jobs"
            )
            .document(
                job["id"]
            )
            .update({
                "status":
                    "processing",

                "device":
                    device,

                "message":
                    (
                        "El dispositivo está procesando "
                        "la operación biométrica."
                    ),

                "processing_at":
                    now,

                "updated_at":
                    now
            })
        )

        job["status"] = (
            "processing"
        )

        job["device"] = (
            device
        )

        job["message"] = (
            "El dispositivo está procesando "
            "la operación biométrica."
        )

        job["processing_at"] = (
            now
        )

        job["updated_at"] = (
            now
        )

        return job

    # ==========================================================
    # COMPLETAR TRABAJO DESDE ESP32
    # ==========================================================

    @staticmethod
    def complete_device_job(
        job_id,
        fingerprint_id,
        device=None
    ):

        job = (
            BiometricService
            .get_job(job_id)
        )

        if (
            job.get("status")
            == "completed"
        ):
            return job

        action = (
            str(
                job.get(
                    "action",
                    ""
                )
            )
            .strip()
            .lower()
        )

        # Para delete el ID ya viene guardado en el job.
        if (
            fingerprint_id is None
            and
            action == "delete"
        ):
            fingerprint_id = (
                job.get(
                    "fingerprint_id"
                )
            )

        try:

            fingerprint_id = int(
                fingerprint_id
            )

        except (
            TypeError,
            ValueError
        ):

            raise Exception(
                "El ID de huella debe ser numérico."
            )

        if fingerprint_id <= 0:

            raise Exception(
                "El ID de huella debe ser mayor que 0."
            )

        uid = (
            job.get("uid")
        )

        # ======================================================
        # REGISTRAR
        # ======================================================

        if action == "enroll":

            # Import local para evitar dependencia circular:
            # UserService puede crear trabajos de limpieza.
            from api.users.services.user_service import (
                UserService
            )

            UserService.update_user(
                uid,
                {
                    "fingerprint_id":
                        fingerprint_id,

                    "actor_uid":
                        (
                            job.get(
                                "actor_uid"
                            )
                            or device
                            or "SEGURENTRY-ESP32"
                        )
                }
            )

            message = (
                "Huella registrada correctamente."
            )

            # ==================================================
            # NOTIFICACIÓN A SUPERADMIN
            # ==================================================

            from api.notifications.services.notification_service import (
                NotificationService
            )

            user_ref = (
                db.collection(
                    "users"
                )
                .document(
                    uid
                )
            )

            user_doc = (
                user_ref.get()
            )

            user_data = (
                user_doc.to_dict()
                if user_doc.exists
                else {}
            ) or {}

            user_name = (
                user_data.get(
                    "name"
                )
                or job.get(
                    "user_name"
                )
                or "Usuario"
            )

            NotificationService.create_for_superadmins(
                title=
                    "Huella registrada",

                message=(
                    f"Se agregó la huella ID {fingerprint_id} "
                    f"a {user_name}."
                ),

                notification_type=
                    "fingerprint_enrolled",

                priority=
                    "normal",

                category=
                    "biometrics",

                source=
                    "ESP32-AS608",

                actor_uid=
                    (
                        job.get(
                            "actor_uid"
                        )
                        or ""
                    ),

                event_key=
                    (
                        f"biometric:{job_id}:enroll"
                    ),

                data={
                    "job_id":
                        job_id,

                    "uid":
                        uid,

                    "user_name":
                        user_name,

                    "fingerprint_id":
                        fingerprint_id,

                    "device":
                        (
                            device
                            or job.get(
                                "device"
                            )
                            or BiometricService.DEFAULT_DEVICE
                        ),

                    "action":
                        "enroll"
                }
            )

        # ======================================================
        # ELIMINAR / LIBERAR ID
        # ======================================================

        elif action == "delete":

            # Si el usuario aún existe (por ejemplo, cuando más
            # adelante se use "Eliminar huella" sin borrar la
            # cuenta), quitamos también la asociación central.
            if uid:

                user_ref = (
                    db.collection("users")
                    .document(uid)
                )

                user_doc = (
                    user_ref.get()
                )

                if user_doc.exists:

                    user_data = (
                        user_doc.to_dict()
                        or {}
                    )

                    current_id = (
                        user_data.get(
                            "fingerprint_id"
                        )
                    )

                    try:

                        current_id = (
                            int(current_id)
                            if current_id is not None
                            else None
                        )

                    except (
                        TypeError,
                        ValueError
                    ):

                        current_id = None

                    if (
                        current_id
                        == fingerprint_id
                    ):

                        user_ref.update({
                            "fingerprint_id":
                                None
                        })

            message = (
                f"Huella ID {fingerprint_id} liberada correctamente."
            )

            # ==================================================
            # NOTIFICACIÓN A SUPERADMIN
            # ==================================================

            from api.notifications.services.notification_service import (
                NotificationService
            )

            user_name = (
                job.get(
                    "user_name"
                )
                or "Usuario"
            )

            NotificationService.create_for_superadmins(
                title=
                    "Huella eliminada",

                message=(
                    f"Se eliminó la huella ID {fingerprint_id} "
                    f"de {user_name}. El ID quedó disponible."
                ),

                notification_type=
                    "fingerprint_deleted",

                priority=
                    "normal",

                category=
                    "biometrics",

                source=
                    "ESP32-AS608",

                actor_uid=
                    (
                        job.get(
                            "actor_uid"
                        )
                        or ""
                    ),

                event_key=
                    (
                        f"biometric:{job_id}:delete"
                    ),

                data={
                    "job_id":
                        job_id,

                    "uid":
                        uid,

                    "user_name":
                        user_name,

                    "fingerprint_id":
                        fingerprint_id,

                    "device":
                        (
                            device
                            or job.get(
                                "device"
                            )
                            or BiometricService.DEFAULT_DEVICE
                        ),

                    "action":
                        "delete"
                }
            )

        else:

            raise Exception(
                "Acción biométrica no soportada."
            )

        now = (
            BiometricService
            ._now_iso()
        )

        update_data = {

            "status":
                "completed",

            "fingerprint_id":
                fingerprint_id,

            "device":
                (
                    str(
                        device
                        or job.get(
                            "device"
                        )
                        or BiometricService.DEFAULT_DEVICE
                    )
                    .strip()
                ),

            "message":
                message,

            "error":
                "",

            "completed_at":
                now,

            "updated_at":
                now
        }

        (
            db.collection(
                "biometric_jobs"
            )
            .document(job_id)
            .update(update_data)
        )

        job.update(
            update_data
        )

        return job

    # ==========================================================
    # REPORTAR ERROR DESDE ESP32
    # ==========================================================

    @staticmethod
    def fail_device_job(
        job_id,
        message,
        device=None
    ):

        job = (
            BiometricService
            .get_job(job_id)
        )

        if (
            job.get("status")
            == "completed"
        ):
            return job

        now = (
            BiometricService
            ._now_iso()
        )

        error_message = (
            str(
                message
                or "No se pudo registrar la huella."
            ).strip()
        )

        update_data = {

            "status":
                "failed",

            "device":
                (
                    str(
                        device
                        or job.get(
                            "device"
                        )
                        or BiometricService.DEFAULT_DEVICE
                    )
                    .strip()
                ),

            "message":
                "El registro biométrico falló.",

            "error":
                error_message,

            "updated_at":
                now
        }

        (
            db.collection(
                "biometric_jobs"
            )
            .document(job_id)
            .update(update_data)
        )

        # ==================================================
        # NOTIFICACIÓN DE ERROR BIOMÉTRICO
        # ==================================================

        from api.notifications.services.notification_service import (
            NotificationService
        )

        action = (
            str(
                job.get(
                    "action",
                    "enroll"
                )
            )
            .strip()
            .lower()
        )

        NotificationService.create_for_superadmins(
            title=
                "Error biométrico",

            message=(
                f"No se pudo completar la operación biométrica "
                f"de {job.get('user_name', 'Usuario')}: "
                f"{error_message}"
            ),

            notification_type=
                "fingerprint_failed",

            priority=
                "high",

            category=
                "biometrics",

            source=
                "ESP32-AS608",

            actor_uid=
                (
                    job.get(
                        "actor_uid"
                    )
                    or ""
                ),

            event_key=
                (
                    f"biometric:{job_id}:failed"
                ),

            data={
                "job_id":
                    job_id,

                "uid":
                    job.get(
                        "uid"
                    ),

                "user_name":
                    job.get(
                        "user_name",
                        "Usuario"
                    ),

                "fingerprint_id":
                    job.get(
                        "fingerprint_id"
                    ),

                "action":
                    action,

                "device":
                    (
                        device
                        or job.get(
                            "device"
                        )
                        or BiometricService.DEFAULT_DEVICE
                    ),

                "error":
                    error_message
            }
        )

        job.update(
            update_data
        )

        return job

    # ==========================================================
    # HEARTBEAT DEL ESP32
    # ==========================================================

    @staticmethod
    def heartbeat(
        device=None,
        data=None
    ):

        device = (
            str(
                device
                or BiometricService.DEFAULT_DEVICE
            ).strip()
        )

        data = (
            data
            or {}
        )

        now = (
            BiometricService
            ._now_iso()
        )

        device_data = {

            "device":
                device,

            "last_seen":
                now,

            "ip":
                str(
                    data.get(
                        "ip",
                        ""
                    )
                    or ""
                ),

            "wifi_connected":
                bool(
                    data.get(
                        "wifi_connected",
                        True
                    )
                ),

            "sensor_available":
                bool(
                    data.get(
                        "sensor_available",
                        True
                    )
                ),

            "template_count":
                data.get(
                    "template_count"
                ),

            "updated_at":
                now
        }

        (
            db.collection(
                "biometric_devices"
            )
            .document(device)
            .set(
                device_data,
                merge=True
            )
        )

        return device_data

    # ==========================================================
    # ESTADO DEL DISPOSITIVO
    # ==========================================================

    @staticmethod
    def get_device_status(
        device=None
    ):

        device = (
            str(
                device
                or BiometricService.DEFAULT_DEVICE
            ).strip()
        )

        doc = (
            db.collection(
                "biometric_devices"
            )
            .document(device)
            .get()
        )

        if not doc.exists:
            return {
                "device":
                    device,

                "online":
                    False,

                "last_seen":
                    None
            }

        data = (
            doc.to_dict()
            or {}
        )

        last_seen = (
            data.get(
                "last_seen"
            )
        )

        online = False

        if last_seen:

            try:

                parsed = (
                    datetime.fromisoformat(
                        last_seen
                    )
                )

                online = (
                    BiometricService._now()
                    - parsed
                    <= timedelta(
                        seconds=30
                    )
                )

            except (
                TypeError,
                ValueError
            ):
                online = False

        data["device"] = (
            device
        )

        data["online"] = (
            online
        )

        return data
