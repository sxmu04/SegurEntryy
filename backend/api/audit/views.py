from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .services.audit_service import AuditService


@csrf_exempt
def list_audit_logs(request):

    if request.method != "GET":

        return JsonResponse({
            "success": False,
            "message": "Método no permitido"
        }, status=405)

    try:

        logs = (
            AuditService.get_logs()
        )

        return JsonResponse({
            "success": True,
            "logs": logs
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "message": str(e)
        }, status=400)