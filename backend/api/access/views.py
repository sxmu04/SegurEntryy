from django.shortcuts import render

# Create your views here.
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

import json

from .services.access_service import AccessService


@csrf_exempt
def register_access(request):

    if request.method != "POST":

        return JsonResponse({
            "success": False,
            "message": "Método no permitido."
        }, status=405)

    try:

        data = json.loads(request.body)

        access = AccessService.register_access(data)

        return JsonResponse({
            "success": True,
            "message": "Acceso registrado correctamente.",
            "access": access
        }, status=201)

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=400)


@csrf_exempt
def list_access(request):

    if request.method != "GET":

        return JsonResponse({
            "success": False,
            "message": "Método no permitido."
        }, status=405)

    try:

        accesses = AccessService.get_all_access()

        return JsonResponse({
            "success": True,
            "access": accesses
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=400)


@csrf_exempt
def get_access(request, access_id):

    if request.method != "GET":

        return JsonResponse({
            "success": False,
            "message": "Método no permitido."
        }, status=405)

    try:

        access = AccessService.get_access(access_id)

        return JsonResponse({
            "success": True,
            "access": access
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=404)


@csrf_exempt
def delete_access(request, access_id):

    if request.method != "DELETE":

        return JsonResponse({
            "success": False,
            "message": "Método no permitido."
        }, status=405)

    try:

        AccessService.delete_access(access_id)

        return JsonResponse({
            "success": True,
            "message": "Registro eliminado correctamente."
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=400)


@csrf_exempt
def today_access(request):

    if request.method != "GET":

        return JsonResponse({
            "success": False,
            "message": "Método no permitido."
        }, status=405)

    try:

        accesses = AccessService.get_today_access()

        return JsonResponse({
            "success": True,
            "access": accesses
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=400)