import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .services.notification_service import NotificationService


# ==========================================================
# JSON
# ==========================================================

def _read_json(
    request
):

    if not request.body:

        return {}

    try:

        return json.loads(
            request.body
        )

    except json.JSONDecodeError:

        raise Exception(
            "JSON inválido."
        )


# ==========================================================
# EVENTOS DEL SISTEMA
# ==========================================================

@csrf_exempt
def system_event(
    request
):

    if request.method != "POST":

        return JsonResponse({
            "success":
                False,

            "message":
                "Método no permitido."
        }, status=405)

    try:

        data = (
            _read_json(
                request
            )
        )

        event_type = (
            str(
                data.get(
                    "event_type",
                    ""
                )
            )
            .strip()
            .lower()
        )

        actor_uid = (
            str(
                data.get(
                    "actor_uid",
                    ""
                )
            )
            .strip()
        )

        event_data = (
            data.get(
                "data"
            )
            or {}
        )

        if (
            event_type
            == "report_generated"
        ):

            created = (
                NotificationService
                .create_report_generated_notification(
                    actor_uid=
                        actor_uid,

                    report_data=
                        event_data
                )
            )

        else:

            return JsonResponse({
                "success":
                    False,

                "message":
                    "Tipo de evento no permitido."
            }, status=400)

        return JsonResponse({
            "success":
                True,

            "message":
                "Evento registrado correctamente.",

            "notifications_created":
                len(
                    created
                )
        }, status=201)

    except Exception as error:

        return JsonResponse({
            "success":
                False,

            "message":
                str(error)
        }, status=400)


# ==========================================================
# LISTAR
# ==========================================================

@csrf_exempt
def notifications(
    request,
    uid
):

    if request.method != "GET":

        return JsonResponse({
            "success":
                False,

            "message":
                "Método no permitido."
        }, status=405)

    try:

        result = (
            NotificationService
            .get_notifications(
                uid
            )
        )

        return JsonResponse({
            "success":
                True,

            "notifications":
                result
        })

    except Exception as error:

        return JsonResponse({
            "success":
                False,

            "message":
                str(error)
        }, status=400)


# ==========================================================
# NO LEÍDAS
# ==========================================================

@csrf_exempt
def unread_notifications(
    request,
    uid
):

    if request.method != "GET":

        return JsonResponse({
            "success":
                False,

            "message":
                "Método no permitido."
        }, status=405)

    try:

        result = (
            NotificationService
            .get_unread_notifications(
                uid
            )
        )

        return JsonResponse({
            "success":
                True,

            "notifications":
                result
        })

    except Exception as error:

        return JsonResponse({
            "success":
                False,

            "message":
                str(error)
        }, status=400)


# ==========================================================
# MARCAR UNA COMO LEÍDA
# ==========================================================

@csrf_exempt
def mark_notification_as_read(
    request,
    uid,
    notification_id
):

    if request.method != "PATCH":

        return JsonResponse({
            "success":
                False,

            "message":
                "Método no permitido."
        }, status=405)

    try:

        (
            NotificationService
            .mark_as_read(
                uid,
                notification_id
            )
        )

        return JsonResponse({
            "success":
                True,

            "message":
                "Notificación marcada como leída."
        })

    except Exception as error:

        return JsonResponse({
            "success":
                False,

            "message":
                str(error)
        }, status=400)


# ==========================================================
# MARCAR TODAS
# ==========================================================

@csrf_exempt
def mark_all_notifications_as_read(
    request,
    uid
):

    if request.method != "PATCH":

        return JsonResponse({
            "success":
                False,

            "message":
                "Método no permitido."
        }, status=405)

    try:

        (
            NotificationService
            .mark_all_as_read(
                uid
            )
        )

        return JsonResponse({
            "success":
                True,

            "message":
                "Notificaciones marcadas como leídas."
        })

    except Exception as error:

        return JsonResponse({
            "success":
                False,

            "message":
                str(error)
        }, status=400)


# ==========================================================
# ELIMINAR
# ==========================================================

@csrf_exempt
def delete_notification(
    request,
    uid,
    notification_id
):

    if request.method != "DELETE":

        return JsonResponse({
            "success":
                False,

            "message":
                "Método no permitido."
        }, status=405)

    try:

        (
            NotificationService
            .delete_notification(
                uid,
                notification_id
            )
        )

        return JsonResponse({
            "success":
                True,

            "message":
                "Notificación eliminada."
        })

    except Exception as error:

        return JsonResponse({
            "success":
                False,

            "message":
                str(error)
        }, status=400)
