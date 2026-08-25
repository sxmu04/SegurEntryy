import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .services.notification_service import NotificationService


@csrf_exempt
def notifications(request, uid):

    if request.method != "GET":

        return JsonResponse({
            "success": False,
            "message": "Método no permitido."
        }, status=405)

    try:

        result = NotificationService.get_notifications(
            uid
        )

        return JsonResponse({
            "success": True,
            "notifications": result
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=400)


@csrf_exempt
def unread_notifications(request, uid):

    if request.method != "GET":

        return JsonResponse({
            "success": False,
            "message": "Método no permitido."
        }, status=405)

    try:

        result = (
            NotificationService
            .get_unread_notifications(uid)
        )

        return JsonResponse({
            "success": True,
            "notifications": result
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=400)


@csrf_exempt
def mark_notification_as_read(
    request,
    uid,
    notification_id
):

    if request.method != "PATCH":

        return JsonResponse({
            "success": False,
            "message": "Método no permitido."
        }, status=405)

    try:

        NotificationService.mark_as_read(
            uid,
            notification_id
        )

        return JsonResponse({
            "success": True,
            "message": "Notificación marcada como leída."
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=400)


@csrf_exempt
def mark_all_notifications_as_read(
    request,
    uid
):

    if request.method != "PATCH":

        return JsonResponse({
            "success": False,
            "message": "Método no permitido."
        }, status=405)

    try:

        NotificationService.mark_all_as_read(
            uid
        )

        return JsonResponse({
            "success": True,
            "message": "Notificaciones marcadas como leídas."
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=400)


@csrf_exempt
def delete_notification(
    request,
    uid,
    notification_id
):

    if request.method != "DELETE":

        return JsonResponse({
            "success": False,
            "message": "Método no permitido."
        }, status=405)

    try:

        NotificationService.delete_notification(
            uid,
            notification_id
        )

        return JsonResponse({
            "success": True,
            "message": "Notificación eliminada."
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=400)