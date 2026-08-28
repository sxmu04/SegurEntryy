from django.urls import path

from .views import (
    system_event,
    notifications,
    unread_notifications,
    mark_notification_as_read,
    mark_all_notifications_as_read,
    delete_notification
)


urlpatterns = [

    # IMPORTANTE:
    # Debe ir ANTES de "<str:uid>/" para que Django no
    # interprete "system-event" como si fuera un UID.
    path(
        "system-event/",
        system_event,
        name="notification_system_event"
    ),

    path(
        "<str:uid>/",
        notifications,
        name="notifications"
    ),

    path(
        "<str:uid>/unread/",
        unread_notifications,
        name="unread_notifications"
    ),

    path(
        "<str:uid>/<str:notification_id>/read/",
        mark_notification_as_read,
        name="mark_notification_as_read"
    ),

    path(
        "<str:uid>/read-all/",
        mark_all_notifications_as_read,
        name="mark_all_notifications_as_read"
    ),

    path(
        "<str:uid>/<str:notification_id>/",
        delete_notification,
        name="delete_notification"
    ),

]
