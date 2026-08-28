from config.firebase_config import db

from datetime import datetime
from uuid import uuid4


class NotificationService:

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
    def _normalize_role(
        role
    ):

        return (
            str(
                role
                or ""
            )
            .strip()
            .lower()
            .replace(
                "_",
                "-"
            )
            .replace(
                " ",
                "-"
            )
        )


    # ==========================================================
    # CREAR NOTIFICACIÓN
    # ==========================================================

    @staticmethod
    def create_notification(
        uid,
        title,
        message,
        notification_type="general",
        data=None,
        priority="normal",
        category="system",
        source="system",
        actor_uid="",
        event_key=""
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
                "El UID de la notificación es obligatorio."
            )

        notification_id = (
            uuid4().hex
        )

        notification = {

            "id":
                notification_id,

            "uid":
                uid,

            "title":
                str(
                    title
                    or "Notificación"
                ),

            "message":
                str(
                    message
                    or ""
                ),

            "type":
                str(
                    notification_type
                    or "general"
                ),

            "category":
                str(
                    category
                    or "system"
                ),

            "priority":
                str(
                    priority
                    or "normal"
                ),

            "source":
                str(
                    source
                    or "system"
                ),

            "actor_uid":
                str(
                    actor_uid
                    or ""
                ),

            "event_key":
                str(
                    event_key
                    or ""
                ),

            "read":
                False,

            "created_at":
                (
                    NotificationService
                    ._now_iso()
                ),

            "data":
                (
                    data
                    or {}
                )
        }

        (
            db.collection(
                "notifications"
            )
            .document(
                notification_id
            )
            .set(
                notification
            )
        )

        return notification


    # ==========================================================
    # CREAR PARA ROLES
    # ==========================================================

    @staticmethod
    def create_for_roles(
        roles,
        title,
        message,
        notification_type="general",
        data=None,
        priority="normal",
        category="system",
        source="system",
        actor_uid="",
        event_key=""
    ):

        normalized_roles = {
            NotificationService
            ._normalize_role(
                role
            )
            for role in (
                roles
                or []
            )
        }

        created = []
        notified_uids = set()

        docs = (
            db.collection(
                "users"
            )
            .stream()
        )

        for doc in docs:

            user = (
                doc.to_dict()
                or {}
            )

            role = (
                NotificationService
                ._normalize_role(
                    user.get(
                        "role"
                    )
                )
            )

            if (
                role not in
                normalized_roles
            ):
                continue

            uid = (
                user.get(
                    "uid"
                )
                or doc.id
            )

            uid = (
                str(uid)
                .strip()
            )

            if (
                not uid
                or uid in notified_uids
            ):
                continue

            notification = (
                NotificationService
                .create_notification(
                    uid=uid,
                    title=title,
                    message=message,
                    notification_type=notification_type,
                    data=data,
                    priority=priority,
                    category=category,
                    source=source,
                    actor_uid=actor_uid,
                    event_key=event_key
                )
            )

            created.append(
                notification
            )

            notified_uids.add(
                uid
            )

        # Si no existe ningún SuperAdmin todavía y el actor
        # es válido, al menos dejamos la notificación al actor.
        fallback_uid = (
            str(
                actor_uid
                or ""
            )
            .strip()
        )

        if (
            not created
            and fallback_uid
        ):

            actor_doc = (
                db.collection(
                    "users"
                )
                .document(
                    fallback_uid
                )
                .get()
            )

            if actor_doc.exists:

                created.append(
                    NotificationService
                    .create_notification(
                        uid=fallback_uid,
                        title=title,
                        message=message,
                        notification_type=notification_type,
                        data=data,
                        priority=priority,
                        category=category,
                        source=source,
                        actor_uid=actor_uid,
                        event_key=event_key
                    )
                )

        return created


    @staticmethod
    def create_for_superadmins(
        title,
        message,
        notification_type="general",
        data=None,
        priority="normal",
        category="system",
        source="system",
        actor_uid="",
        event_key=""
    ):

        return (
            NotificationService
            .create_for_roles(
                roles=[
                    "super-admin",
                    "superadmin",
                    "super_admin"
                ],
                title=title,
                message=message,
                notification_type=notification_type,
                data=data,
                priority=priority,
                category=category,
                source=source,
                actor_uid=actor_uid,
                event_key=event_key
            )
        )


    # ==========================================================
    # REPORTE PDF GENERADO
    # ==========================================================

    @staticmethod
    def create_report_generated_notification(
        actor_uid,
        report_data=None
    ):

        actor_uid = (
            str(
                actor_uid
                or ""
            )
            .strip()
        )

        if not actor_uid:

            raise Exception(
                "Debe indicar quién generó el reporte."
            )

        actor_ref = (
            db.collection(
                "users"
            )
            .document(
                actor_uid
            )
        )

        actor_doc = (
            actor_ref.get()
        )

        if not actor_doc.exists:

            raise Exception(
                "El usuario que generó el reporte no existe."
            )

        actor = (
            actor_doc.to_dict()
            or {}
        )

        actor_name = (
            actor.get(
                "name"
            )
            or actor.get(
                "email"
            )
            or "Super Administrador"
        )

        report_data = (
            report_data
            or {}
        )

        try:

            records = int(
                report_data.get(
                    "records",
                    0
                )
                or 0
            )

        except (
            TypeError,
            ValueError
        ):

            records = 0

        try:

            allowed = int(
                report_data.get(
                    "allowed",
                    0
                )
                or 0
            )

        except (
            TypeError,
            ValueError
        ):

            allowed = 0

        try:

            denied = int(
                report_data.get(
                    "denied",
                    0
                )
                or 0
            )

        except (
            TypeError,
            ValueError
        ):

            denied = 0

        filters = (
            report_data.get(
                "filters"
            )
            or {}
        )

        now = (
            NotificationService
            ._now_iso()
        )

        data = {

            "actor_uid":
                actor_uid,

            "actor_name":
                actor_name,

            "format":
                "PDF",

            "report_type":
                report_data.get(
                    "report_type",
                    "Reporte general de accesos"
                ),

            "records":
                records,

            "allowed":
                allowed,

            "denied":
                denied,

            "filters":
                filters,

            "generated_at":
                now
        }

        return (
            NotificationService
            .create_for_superadmins(
                title=
                    "Reporte PDF generado",

                message=(
                    f"{actor_name} generó un reporte PDF "
                    f"con {records} registro"
                    f"{'' if records == 1 else 's'}."
                ),

                notification_type=
                    "report_generated",

                data=
                    data,

                priority=
                    "normal",

                category=
                    "reports",

                source=
                    "superadmin",

                actor_uid=
                    actor_uid,

                event_key=
                    (
                        "report:"
                        f"{actor_uid}:"
                        f"{now}"
                    )
            )
        )


    # ==========================================================
    # CONSULTAR NOTIFICACIONES
    # ==========================================================

    @staticmethod
    def get_notifications(
        uid
    ):

        notifications = []

        docs = (
            db.collection(
                "notifications"
            )
            .where(
                "uid",
                "==",
                uid
            )
            .stream()
        )

        for doc in docs:

            notification = (
                doc.to_dict()
                or {}
            )

            notification[
                "id"
            ] = (
                doc.id
            )

            notifications.append(
                notification
            )

        notifications.sort(
            key=lambda item:
                item.get(
                    "created_at",
                    ""
                ),
            reverse=True
        )

        return notifications


    @staticmethod
    def get_unread_notifications(
        uid
    ):

        notifications = []

        docs = (
            db.collection(
                "notifications"
            )
            .where(
                "uid",
                "==",
                uid
            )
            .where(
                "read",
                "==",
                False
            )
            .stream()
        )

        for doc in docs:

            notification = (
                doc.to_dict()
                or {}
            )

            notification[
                "id"
            ] = (
                doc.id
            )

            notifications.append(
                notification
            )

        notifications.sort(
            key=lambda item:
                item.get(
                    "created_at",
                    ""
                ),
            reverse=True
        )

        return notifications


    # ==========================================================
    # MARCAR LEÍDA
    # ==========================================================

    @staticmethod
    def mark_as_read(
        uid,
        notification_id
    ):

        notification_ref = (
            db.collection(
                "notifications"
            )
            .document(
                notification_id
            )
        )

        notification_doc = (
            notification_ref.get()
        )

        if not notification_doc.exists:

            raise Exception(
                "Notificación no encontrada."
            )

        notification = (
            notification_doc.to_dict()
            or {}
        )

        if (
            notification.get(
                "uid"
            )
            != uid
        ):

            raise Exception(
                "No tiene permisos para modificar esta notificación."
            )

        notification_ref.update({
            "read":
                True,

            "read_at":
                (
                    NotificationService
                    ._now_iso()
                )
        })

        return True


    @staticmethod
    def mark_all_as_read(
        uid
    ):

        docs = (
            db.collection(
                "notifications"
            )
            .where(
                "uid",
                "==",
                uid
            )
            .where(
                "read",
                "==",
                False
            )
            .stream()
        )

        batch = (
            db.batch()
        )

        count = 0
        now = (
            NotificationService
            ._now_iso()
        )

        for doc in docs:

            batch.update(
                doc.reference,
                {
                    "read":
                        True,

                    "read_at":
                        now
                }
            )

            count += 1

        if count > 0:

            batch.commit()

        return True


    # ==========================================================
    # ELIMINAR
    # ==========================================================

    @staticmethod
    def delete_notification(
        uid,
        notification_id
    ):

        notification_ref = (
            db.collection(
                "notifications"
            )
            .document(
                notification_id
            )
        )

        notification_doc = (
            notification_ref.get()
        )

        if not notification_doc.exists:

            raise Exception(
                "Notificación no encontrada."
            )

        notification = (
            notification_doc.to_dict()
            or {}
        )

        if (
            notification.get(
                "uid"
            )
            != uid
        ):

            raise Exception(
                "No tiene permisos para eliminar esta notificación."
            )

        notification_ref.delete()

        return True


    @staticmethod
    def delete_by_request_id(
        request_id
    ):

        docs = (
            db.collection(
                "notifications"
            )
            .where(
                "data.request_id",
                "==",
                request_id
            )
            .stream()
        )

        batch = (
            db.batch()
        )

        count = 0

        for doc in docs:

            batch.delete(
                doc.reference
            )

            count += 1

        if count > 0:

            batch.commit()

        return True
