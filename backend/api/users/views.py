from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import os

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from config.firebase_config import db
import json

from .services.user_service import UserService
from api.notifications.services.notification_service import NotificationService


# ==========================================
# CREAR USUARIO DESDE EL DASHBOARD
# ==========================================

@csrf_exempt
def create_user(request):

    if request.method != "POST":

        return JsonResponse({
            "success": False,
            "message": "Método no permitido"
        }, status=405)

    try:

        data = json.loads(
            request.body
        )

        result = (
            UserService
            .create_superadmin_user(
                data
            )
        )

        # create_superadmin_user() NO devuelve el usuario
        # directamente. Devuelve un objeto con "invitation".
        invitation = (
            result.get(
                "invitation",
                {}
            )
            or {}
        )

        uid = (
            invitation.get(
                "uid"
            )
            or ""
        )

        if not uid:

            raise Exception(
                "La invitación fue creada, pero el backend no devolvió el UID."
            )

        # IMPORTANTE:
        # No creamos aquí otra notificación "user_created".
        # create_superadmin_user() ya genera la notificación
        # correspondiente a la invitación.
        #
        # Antes se hacía:
        #
        # NotificationService.create_notification(
        #     uid=user.get("uid"),
        #     ...
        # )
        #
        # pero user.get("uid") era None porque el UID estaba
        # dentro de user["invitation"]["uid"].
        # Eso provocaba HTTP 400 aunque la invitación ya se
        # hubiera creado correctamente.

        return JsonResponse({

            "success":
                True,

            "message":
                result.get(
                    "message",
                    "Invitación creada y enviada correctamente."
                ),

            # El frontend del SuperAdmin espera response.user
            "user":
                invitation,

            # También devolvemos invitation para mantener
            # explícito el flujo actual.
            "invitation":
                invitation

        })

    except Exception as e:

        return JsonResponse({

            "success":
                False,

            "message":
                str(e)

        }, status=400)
# ==========================================
# LISTAR USUARIOS
# ==========================================

@csrf_exempt
def list_users(request):

    if request.method != "GET":
        return JsonResponse({
            "success": False,
            "message": "Método no permitido"
        }, status=405)

    try:

        users = UserService.get_all_users()

        return JsonResponse({
            "success": True,
            "users": users
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=400)


# ==========================================
# OBTENER USUARIO
# ==========================================

@csrf_exempt
def get_user(request, uid):

    if request.method != "GET":
        return JsonResponse({
            "success": False,
            "message": "Método no permitido"
        }, status=405)

    try:

        user = UserService.get_user(uid)

        return JsonResponse({
            "success": True,
            "user": user
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=404)


# ==========================================
# ACTUALIZAR USUARIO
# ==========================================

@csrf_exempt
def update_user(request, uid):

    if request.method != "PUT":
        return JsonResponse({
            "success": False,
            "message": "Método no permitido"
        }, status=405)

    try:

        data = json.loads(request.body)

        user = UserService.update_user(uid, data)

        return JsonResponse({
            "success": True,
            "message": "Usuario actualizado correctamente",
            "user": user
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=400)


# ==========================================
# ELIMINAR USUARIO
# ==========================================

@csrf_exempt
def delete_user(request, uid):

    if request.method != "DELETE":
        return JsonResponse({
            "success": False,
            "message": "Método no permitido"
        }, status=405)

    try:

        UserService.delete_user(uid)

        return JsonResponse({
            "success": True,
            "message": "Usuario eliminado correctamente"
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=400)


class UploadProfilePhotoView(APIView):

    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [AllowAny]

    def post(self, request):

        uid = request.data.get("uid")
        photo = request.FILES.get("photo")

        if not uid or not photo:

            return Response({
                "success": False,
                "message": "Debe enviar uid y foto."
            }, status=400)

        folder = os.path.join(settings.MEDIA_ROOT, "profile_photos")

        os.makedirs(folder, exist_ok=True)

        extension = photo.name.split(".")[-1]

        filename = f"{uid}.{extension}"

        fs = FileSystemStorage(location=folder)

        if fs.exists(filename):
            fs.delete(filename)

        fs.save(filename, photo)

        photo_url = f"/media/profile_photos/{filename}"

        db.collection("users").document(uid).update({

            "photo": photo_url

        })

        return Response({

            "success": True,

            "photo": photo_url

        })

    # ==========================================
# COMPLETAR REGISTRO
# ==========================================

@csrf_exempt
def complete_registration(request):

    if request.method != "POST":

        return JsonResponse({
            "success": False,
            "message": "Método no permitido"
        }, status=405)

    try:

        data = json.loads(request.body)

        user = UserService.complete_registration(data)

        return JsonResponse({
            "success": True,
            "message": "Cuenta activada correctamente.",
            "user": user
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=400)