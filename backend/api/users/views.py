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

        data = json.loads(request.body)

        user = UserService.create_superadmin_user(data)

        return JsonResponse({
            "success": True,
            "message": "Usuario creado correctamente",
            "user": user
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
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