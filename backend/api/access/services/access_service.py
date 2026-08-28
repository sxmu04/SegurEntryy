from config.firebase_config import db

from datetime import datetime

from api.notifications.services.notification_service import (
    NotificationService
)


class AccessService:

    # ==========================================================
    # UTILIDADES
    # ==========================================================

    @staticmethod
    def _now_iso():

        return (
            datetime.utcnow()
            .isoformat()
        )


    @staticmethod
    def _normalize_status(
        status
    ):

        status = (
            str(
                status
                or ""
            )
            .strip()
            .lower()
        )

        if status in [
            "denied",
            "denegado",
            "rejected",
            "rechazado",
            "failed",
            "fallido"
        ]:
            return "denied"

        return "granted"


    @staticmethod
    def _is_granted(
        access
    ):

        if (
            access.get("allowed")
            is True
        ):
            return True

        if (
            access.get("allowed")
            is False
        ):
            return False

        status = (
            str(
                access.get(
                    "status",
                    ""
                )
            )
            .strip()
            .lower()
        )

        return status in [
            "granted",
            "permitido",
            "allowed",
            "approved",
            "aprobado",
            "success",
            "exitoso"
        ]


    @staticmethod
    def _normalize_movement(
        value
    ):

        value = (
            str(
                value
                or ""
            )
            .strip()
            .lower()
        )

        if (
            value == "salida"
            or value == "exit"
            or "sal" in value
        ):
            return "salida"

        return "entrada"


    # ==========================================================
    # OBTENER ESTADO ACTUAL DEL USUARIO
    # ==========================================================
    #
    # Se guarda "inside" en users/{uid}.
    #
    # False -> está fuera -> siguiente lectura = ENTRADA
    # True  -> está dentro -> siguiente lectura = SALIDA
    #
    # Si un usuario antiguo aún no tiene "inside", intentamos
    # inferirlo desde su último acceso concedido.
    # ==========================================================

    @staticmethod
    def _get_inside_state(
        uid,
        user
    ):

        if (
            "inside"
            in user
        ):

            return bool(
                user.get(
                    "inside",
                    False
                )
            )

        latest_access = None
        latest_date = ""

        docs = (
            db.collection(
                "access_logs"
            )
            .where(
                "uid",
                "==",
                uid
            )
            .stream()
        )

        for doc in docs:

            access = (
                doc.to_dict()
                or {}
            )

            if not (
                AccessService
                ._is_granted(
                    access
                )
            ):
                continue

            created_at = (
                str(
                    access.get(
                        "created_at",
                        ""
                    )
                )
            )

            if (
                latest_access is None
                or created_at > latest_date
            ):

                latest_access = access
                latest_date = created_at

        if latest_access:

            movement = (
                AccessService
                ._normalize_movement(
                    latest_access.get(
                        "type"
                    )
                    or latest_access.get(
                        "movement"
                    )
                    or latest_access.get(
                        "entry"
                    )
                    or latest_access.get(
                        "access_type"
                    )
                )
            )

            return (
                movement
                == "entrada"
            )

        return False


    # ==========================================================
    # REGISTRO NORMAL / MANUAL
    # ==========================================================

    @staticmethod
    def register_access(
        data
    ):

        uid = (
            str(
                data.get(
                    "uid",
                    ""
                )
            )
            .strip()
        )

        door = (
            str(
                data.get(
                    "door",
                    ""
                )
            )
            .strip()
        )

        device = (
            str(
                data.get(
                    "device",
                    ""
                )
            )
            .strip()
        )

        status = (
            AccessService
            ._normalize_status(
                data.get(
                    "status"
                )
            )
        )

        if not uid:

            raise Exception(
                "El UID es obligatorio."
            )

        if not door:

            raise Exception(
                "Debe indicar la puerta."
            )

        if not device:

            device = (
                "Desconocido"
            )

        user_ref = (
            db.collection(
                "users"
            )
            .document(uid)
        )

        user_doc = (
            user_ref.get()
        )

        if not user_doc.exists:

            raise Exception(
                "Usuario no encontrado."
            )

        user = (
            user_doc.to_dict()
            or {}
        )

        movement = (
            AccessService
            ._normalize_movement(
                data.get(
                    "type"
                )
                or data.get(
                    "movement"
                )
                or data.get(
                    "entry"
                )
            )
        )

        allowed = (
            status
            == "granted"
        )

        access_data = {

            "uid":
                uid,

            "name":
                user.get(
                    "name"
                ),

            "email":
                user.get(
                    "email"
                ),

            "document":
                user.get(
                    "document"
                ),

            "role":
                user.get(
                    "role"
                ),

            "door":
                door,

            "device":
                device,

            "method":
                data.get(
                    "method",
                    "manual"
                ),

            "type":
                movement,

            "movement":
                movement,

            "status":
                status,

            "allowed":
                allowed,

            "created_at":
                (
                    AccessService
                    ._now_iso()
                )
        }

        access_ref = (
            db.collection(
                "access_logs"
            )
            .document()
        )

        access_ref.set(
            access_data
        )

        access_data[
            "id"
        ] = (
            access_ref.id
        )

        return access_data


    # ==========================================================
    # REGISTRO IOT POR HUELLA
    # ==========================================================
    #
    # REGLA:
    #
    # Primera lectura:
    #   inside = False
    #   -> ENTRADA
    #   -> inside = True
    #
    # Segunda lectura:
    #   inside = True
    #   -> SALIDA
    #   -> inside = False
    #
    # Tercera lectura:
    #   -> ENTRADA
    #
    # Y así sucesivamente.
    #
    # Las lecturas denegadas NO cambian el estado.
    # ==========================================================

    @staticmethod
    def register_fingerprint_access(
        data
    ):

        raw_fingerprint_id = (
            data.get(
                "fingerprint_id"
            )
        )

        try:

            fingerprint_id = int(
                raw_fingerprint_id
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

        door = (
            str(
                data.get(
                    "door"
                )
                or "Entrada principal"
            )
            .strip()
        )

        device = (
            str(
                data.get(
                    "device"
                )
                or "SEGURENTRY-ESP32"
            )
            .strip()
        )

        # ======================================================
        # BUSCAR USUARIO POR fingerprint_id
        # ======================================================

        users = list(
            db.collection(
                "users"
            )
            .where(
                "fingerprint_id",
                "==",
                fingerprint_id
            )
            .limit(2)
            .stream()
        )

        # ======================================================
        # HUELLA SIN USUARIO
        # ======================================================

        if not users:

            now = (
                AccessService
                ._now_iso()
            )

            access_data = {

                "uid":
                    "",

                "name":
                    "Huella no asociada",

                "email":
                    "",

                "document":
                    "",

                "role":
                    "",

                "fingerprint_id":
                    fingerprint_id,

                "door":
                    door,

                "device":
                    device,

                "method":
                    "huella",

                "type":
                    "entrada",

                "movement":
                    "entrada",

                "status":
                    "denied",

                "allowed":
                    False,

                "reason":
                    "fingerprint_not_associated",

                "created_at":
                    now
            }

            access_ref = (
                db.collection(
                    "access_logs"
                )
                .document()
            )

            access_ref.set(
                access_data
            )

            access_data[
                "id"
            ] = (
                access_ref.id
            )

            return {
                "authorized":
                    False,

                "movement":
                    None,

                "message":
                    "Huella no asociada a ningún usuario.",

                "access":
                    access_data
            }

        if len(users) > 1:

            raise Exception(
                "El ID de huella está asociado a más de un usuario."
            )

        user_doc = (
            users[0]
        )

        uid = (
            user_doc.id
        )

        user = (
            user_doc.to_dict()
            or {}
        )

        user_ref = (
            db.collection(
                "users"
            )
            .document(uid)
        )

        # ======================================================
        # USUARIO INACTIVO
        # ======================================================

        if (
            user.get(
                "active",
                True
            )
            is False
        ):

            now = (
                AccessService
                ._now_iso()
            )

            access_data = {

                "uid":
                    uid,

                "name":
                    user.get(
                        "name",
                        "Usuario"
                    ),

                "email":
                    user.get(
                        "email",
                        ""
                    ),

                "document":
                    user.get(
                        "document",
                        ""
                    ),

                "role":
                    user.get(
                        "role",
                        ""
                    ),

                "fingerprint_id":
                    fingerprint_id,

                "door":
                    door,

                "device":
                    device,

                "method":
                    "huella",

                "type":
                    "entrada",

                "movement":
                    "entrada",

                "status":
                    "denied",

                "allowed":
                    False,

                "reason":
                    "inactive_user",

                "created_at":
                    now
            }

            access_ref = (
                db.collection(
                    "access_logs"
                )
                .document()
            )

            access_ref.set(
                access_data
            )

            access_data[
                "id"
            ] = (
                access_ref.id
            )

            return {
                "authorized":
                    False,

                "movement":
                    None,

                "message":
                    "Usuario inactivo.",

                "access":
                    access_data
            }

        # ======================================================
        # CALCULAR ENTRADA / SALIDA
        # ======================================================

        inside = (
            AccessService
            ._get_inside_state(
                uid,
                user
            )
        )

        if inside:

            movement = (
                "salida"
            )

            new_inside = (
                False
            )

        else:

            movement = (
                "entrada"
            )

            new_inside = (
                True
            )

        now = (
            AccessService
            ._now_iso()
        )

        # ======================================================
        # GUARDAR ESTADO DE PRESENCIA EN EL USUARIO
        # ======================================================

        user_ref.update({

            "inside":
                new_inside,

            "last_access_type":
                movement,

            "last_access_at":
                now,

            "last_access_device":
                device,

            "last_access_door":
                door
        })

        # ======================================================
        # CREAR REGISTRO
        # ======================================================

        access_data = {

            "uid":
                uid,

            "name":
                user.get(
                    "name",
                    "Usuario"
                ),

            "email":
                user.get(
                    "email",
                    ""
                ),

            "document":
                user.get(
                    "document",
                    ""
                ),

            "role":
                user.get(
                    "role",
                    ""
                ),

            "fingerprint_id":
                fingerprint_id,

            "door":
                door,

            "device":
                device,

            "method":
                "huella",

            "type":
                movement,

            "movement":
                movement,

            "status":
                "granted",

            "allowed":
                True,

            "created_at":
                now
        }

        access_ref = (
            db.collection(
                "access_logs"
            )
            .document()
        )

        access_ref.set(
            access_data
        )

        access_data[
            "id"
        ] = (
            access_ref.id
        )


        # ======================================================
        # NOTIFICACIÓN PERSONAL DE ENTRADA / SALIDA
        # ======================================================

        try:

            movement_label = (
                "Ingreso"
                if movement == "entrada"
                else "Salida"
            )

            NotificationService.create_notification(

                uid=
                    uid,

                title=
                    f"{movement_label} registrado",

                message=(
                    f"Tu {movement_label.lower()} "
                    f"fue registrado correctamente "
                    f"en {door}."
                ),

                notification_type=(
                    "access_entry"
                    if movement == "entrada"
                    else "access_exit"
                ),

                priority=
                    "normal",

                category=
                    "access",

                source=
                    "ESP32-AS608",

                actor_uid=
                    uid,

                event_key=
                    f"access:{access_ref.id}",

                data={

                    "access_id":
                        access_ref.id,

                    "uid":
                        uid,

                    "movement":
                        movement,

                    "type":
                        movement,

                    "door":
                        door,

                    "device":
                        device,

                    "method":
                        "huella",

                    "allowed":
                        True,

                    "created_at":
                        now
                }

            )

        except Exception as notification_error:

            # Una falla de notificaciones NUNCA debe impedir
            # registrar el acceso físico.
            print(
                "ERROR CREANDO NOTIFICACIÓN DE ACCESO:",
                notification_error
            )


        return {

            "authorized":
                True,

            "movement":
                movement,

            "inside":
                new_inside,

            "message":
                (
                    "Entrada registrada correctamente."
                    if movement
                    == "entrada"
                    else
                    "Salida registrada correctamente."
                ),

            "user": {
                "uid":
                    uid,

                "name":
                    user.get(
                        "name",
                        "Usuario"
                    ),

                "role":
                    user.get(
                        "role",
                        ""
                    )
            },

            "access":
                access_data
        }


    # ==========================================================
    # LISTAR ACCESOS
    # ==========================================================

    @staticmethod
    def get_all_access():

        accesses = []

        docs = (
            db.collection(
                "access_logs"
            )
            .order_by(
                "created_at",
                direction="DESCENDING"
            )
            .stream()
        )

        for doc in docs:

            access = (
                doc.to_dict()
                or {}
            )

            access[
                "id"
            ] = (
                doc.id
            )

            accesses.append(
                access
            )

        return accesses


    # ==========================================================
    # OBTENER ACCESO
    # ==========================================================

    @staticmethod
    def get_access(
        access_id
    ):

        doc = (
            db.collection(
                "access_logs"
            )
            .document(
                access_id
            )
            .get()
        )

        if not doc.exists:

            raise Exception(
                "Registro no encontrado."
            )

        access = (
            doc.to_dict()
            or {}
        )

        access[
            "id"
        ] = (
            doc.id
        )

        return access


    # ==========================================================
    # ELIMINAR ACCESO
    # ==========================================================

    @staticmethod
    def delete_access(
        access_id
    ):

        doc = (
            db.collection(
                "access_logs"
            )
            .document(
                access_id
            )
        )

        if not (
            doc.get()
            .exists
        ):

            raise Exception(
                "Registro no encontrado."
            )

        doc.delete()

        return True


    # ==========================================================
    # ACCESOS DE HOY
    # ==========================================================

    @staticmethod
    def get_today_access():

        today = (
            datetime.utcnow()
            .date()
            .isoformat()
        )

        accesses = []

        docs = (
            db.collection(
                "access_logs"
            )
            .stream()
        )

        for doc in docs:

            access = (
                doc.to_dict()
                or {}
            )

            created = (
                str(
                    access.get(
                        "created_at",
                        ""
                    )
                )
            )

            if (
                created.startswith(
                    today
                )
            ):

                access[
                    "id"
                ] = (
                    doc.id
                )

                accesses.append(
                    access
                )

        accesses.sort(
            key=lambda item:
                item.get(
                    "created_at",
                    ""
                ),
            reverse=True
        )

        return accesses
