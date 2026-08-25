from config.firebase_config import db
from datetime import datetime
from uuid import uuid4


class NotificationService:

    @staticmethod
    def create_notification(
        uid,
        title,
        message,
        notification_type="general",
        data=None
    ):

        notification_id = uuid4().hex

        notification = {
            "id": notification_id,
            "uid": uid,
            "title": title,
            "message": message,
            "type": notification_type,
            "read": False,
            "created_at": datetime.utcnow().isoformat(),
            "data": data or {}
        }

        (
            db.collection("notifications")
            .document(notification_id)
            .set(notification)
        )

        return notification

    @staticmethod
    def get_notifications(uid):

        notifications = []

        docs = (
            db.collection("notifications")
            .where("uid", "==", uid)
            .stream()
        )

        for doc in docs:

            notification = doc.to_dict()

            notification["id"] = doc.id

            notifications.append(notification)

        notifications.sort(
            key=lambda item:
                item.get("created_at", ""),
            reverse=True
        )

        return notifications

    @staticmethod
    def get_unread_notifications(uid):

        notifications = []

        docs = (
            db.collection("notifications")
            .where("uid", "==", uid)
            .where("read", "==", False)
            .stream()
        )

        for doc in docs:

            notification = doc.to_dict()

            notification["id"] = doc.id

            notifications.append(notification)

        notifications.sort(
            key=lambda item:
                item.get("created_at", ""),
            reverse=True
        )

        return notifications

    @staticmethod
    def mark_as_read(uid, notification_id):

        notification_ref = (
            db.collection("notifications")
            .document(notification_id)
        )

        notification_doc = notification_ref.get()

        if not notification_doc.exists:
            raise Exception(
                "Notificación no encontrada."
            )

        notification = notification_doc.to_dict()

        if notification.get("uid") != uid:
            raise Exception(
                "No tiene permisos para modificar esta notificación."
            )

        notification_ref.update({
            "read": True
        })

        return True

    @staticmethod
    def mark_all_as_read(uid):

        docs = (
            db.collection("notifications")
            .where("uid", "==", uid)
            .where("read", "==", False)
            .stream()
        )

        batch = db.batch()

        count = 0

        for doc in docs:

            batch.update(
                doc.reference,
                {
                    "read": True
                }
            )

            count += 1

        if count > 0:
            batch.commit()

        return True

    @staticmethod
    def delete_notification(
        uid,
        notification_id
    ):

        notification_ref = (
            db.collection("notifications")
            .document(notification_id)
        )

        notification_doc = notification_ref.get()

        if not notification_doc.exists:
            raise Exception(
                "Notificación no encontrada."
            )

        notification = notification_doc.to_dict()

        if notification.get("uid") != uid:
            raise Exception(
                "No tiene permisos para eliminar esta notificación."
            )

        notification_ref.delete()

        return True

    @staticmethod
    def delete_by_request_id(request_id):

        docs = (
            db.collection("notifications")
            .where(
                "data.request_id",
                "==",
                request_id
            )
            .stream()
        )

        batch = db.batch()
        count = 0

        for doc in docs:
            batch.delete(doc.reference)
            count += 1

        if count > 0:
            batch.commit()

        return True