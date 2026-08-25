import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .services.temporary_requests_service import (
    TemporaryRequestService
)


@csrf_exempt
def temporary_requests(request):

    if request.method == "GET":

        try:

            requests = (
                TemporaryRequestService
                .get_requests()
            )

            return JsonResponse({

                "success": True,

                "requests":
                    requests

            })

        except Exception as e:

            return JsonResponse({

                "success": False,

                "message":
                    str(e)

            }, status=400)

    if request.method == "POST":

        try:

            data = json.loads(
                request.body
            )

            result = (
                TemporaryRequestService
                .create_request(data)
            )

            return JsonResponse({

                "success": True,

                "message":
                    "Solicitud enviada correctamente.",

                "request":
                    result

            }, status=201)

        except Exception as e:

            return JsonResponse({

                "success": False,

                "message":
                    str(e)

            }, status=400)

    return JsonResponse({

        "success": False,

        "message":
            "Método no permitido."

    }, status=405)


@csrf_exempt
def approve_temporary_request(
    request,
    request_id
):

    if request.method != "PATCH":

        return JsonResponse({

            "success": False,

            "message":
                "Método no permitido."

        }, status=405)

    try:

        data = json.loads(
            request.body or "{}"
        )

        reviewer_uid = (
            data.get("reviewer_uid")
            or data.get("uid")
        )

        if not reviewer_uid:

            return JsonResponse({

                "success": False,

                "message":
                    "Debe indicar el administrador que aprueba."

            }, status=400)

        result = (
            TemporaryRequestService
            .approve_request(
                request_id,
                reviewer_uid
            )
        )

        return JsonResponse({

            "success": True,

            "message":
                "Solicitud aprobada correctamente.",

            "request":
                result

        })

    except Exception as e:

        return JsonResponse({

            "success": False,

            "message":
                str(e)

        }, status=400)


@csrf_exempt
def reject_temporary_request(
    request,
    request_id
):

    if request.method != "PATCH":

        return JsonResponse({

            "success": False,

            "message":
                "Método no permitido."

        }, status=405)

    try:

        data = json.loads(
            request.body or "{}"
        )

        reviewer_uid = (
            data.get("reviewer_uid")
            or data.get("uid")
        )

        reason = (
            data.get(
                "reason",
                ""
            )
        )

        if not reviewer_uid:

            return JsonResponse({

                "success": False,

                "message":
                    "Debe indicar el administrador que rechaza."

            }, status=400)

        result = (
            TemporaryRequestService
            .reject_request(
                request_id,
                reviewer_uid,
                reason
            )
        )

        return JsonResponse({

            "success": True,

            "message":
                "Solicitud rechazada correctamente.",

            "request":
                result

        })

    except Exception as e:

        return JsonResponse({

            "success": False,

            "message":
                str(e)

        }, status=400)