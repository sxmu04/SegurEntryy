from django.shortcuts import render

# Create your views here.
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .services.dashboard_service import DashboardService


@csrf_exempt
def dashboard_stats(request):

    if request.method != "GET":

        return JsonResponse({
            "success": False,
            "message": "Método no permitido."
        }, status=405)

    try:

        stats = DashboardService.get_stats()

        return JsonResponse({
            "success": True,
            "stats": stats
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=400)


@csrf_exempt
def recent_access(request):

    if request.method != "GET":

        return JsonResponse({
            "success": False,
            "message": "Método no permitido."
        }, status=405)

    try:

        access = DashboardService.recent_access()

        return JsonResponse({
            "success": True,
            "access": access
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=400)


@csrf_exempt
def recent_users(request):

    if request.method != "GET":

        return JsonResponse({
            "success": False,
            "message": "Método no permitido."
        }, status=405)

    try:

        users = DashboardService.recent_users()

        return JsonResponse({
            "success": True,
            "users": users
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=400)


@csrf_exempt
def access_by_role(request):

    if request.method != "GET":

        return JsonResponse({
            "success": False,
            "message": "Método no permitido."
        }, status=405)

    try:

        data = DashboardService.access_by_role()

        return JsonResponse({
            "success": True,
            "data": data
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=400)


@csrf_exempt
def access_by_door(request):

    if request.method != "GET":

        return JsonResponse({
            "success": False,
            "message": "Método no permitido."
        }, status=405)

    try:

        data = DashboardService.access_by_door()

        return JsonResponse({
            "success": True,
            "data": data
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=400)