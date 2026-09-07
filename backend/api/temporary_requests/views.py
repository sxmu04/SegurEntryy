import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .services.temporary_requests_service import (
    TemporaryRequestService
)


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
# LISTAR / CREAR SOLICITUDES
# ==========================================================

@csrf_exempt
def temporary_requests(
    request
):

    if request.method == "GET":

        try:

            requests = (
                TemporaryRequestService
                .get_requests()
            )

            return JsonResponse({

                "success":
                    True,

                "requests":
                    requests

            })

        except Exception as error:

            return JsonResponse({

                "success":
                    False,

                "message":
                    str(error)

            }, status=400)


    if request.method == "POST":

        try:

            data = (
                _read_json(
                    request
                )
            )

            result = (
                TemporaryRequestService
                .create_request(
                    data
                )
            )

            return JsonResponse({

                "success":
                    True,

                "message":
                    "Solicitud enviada correctamente.",

                "request":
                    result

            }, status=201)

        except Exception as error:

            return JsonResponse({

                "success":
                    False,

                "message":
                    str(error)

            }, status=400)


    return JsonResponse({

        "success":
            False,

        "message":
            "Método no permitido."

    }, status=405)


# ==========================================================
# APROBAR SOLICITUD
# ==========================================================

@csrf_exempt
def approve_temporary_request(
    request,
    request_id
):

    if request.method != "PATCH":

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

        reviewer_uid = (
            data.get(
                "reviewer_uid"
            )
            or data.get(
                "uid"
            )
        )

        if not reviewer_uid:

            return JsonResponse({

                "success":
                    False,

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

            "success":
                True,

            "message":
                "Solicitud aprobada correctamente.",

            "request":
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
# RECHAZAR SOLICITUD
# ==========================================================

@csrf_exempt
def reject_temporary_request(
    request,
    request_id
):

    if request.method != "PATCH":

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

        reviewer_uid = (
            data.get(
                "reviewer_uid"
            )
            or data.get(
                "uid"
            )
        )

        reason = (
            data.get(
                "reason",
                ""
            )
        )

        if not reviewer_uid:

            return JsonResponse({

                "success":
                    False,

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

            "success":
                True,

            "message":
                "Solicitud rechazada correctamente.",

            "request":
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
# RFID — INICIAR ASIGNACIÓN DESDE EL VIGILANTE
# ==========================================================

@csrf_exempt
def start_temporary_rfid_enrollment(
    request,
    request_id
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

        actor_uid = (
            data.get(
                "actor_uid"
            )
            or data.get(
                "uid"
            )
        )

        device = (
            data.get(
                "device"
            )
            or "SEGURENTRY-ESP32"
        )

        job = (
            TemporaryRequestService
            .start_rfid_enrollment(
                request_id,
                actor_uid,
                device
            )
        )

        return JsonResponse({

            "success":
                True,

            "message":
                "Proceso RFID iniciado. Acerque la tarjeta al lector.",

            "job":
                job

        }, status=201)

    except Exception as error:

        return JsonResponse({

            "success":
                False,

            "message":
                str(error)

        }, status=400)


# ==========================================================
# RFID — CONSULTAR JOB DESDE EL FRONTEND
# ==========================================================

@csrf_exempt
def get_temporary_rfid_job(
    request,
    job_id
):

    if request.method != "GET":

        return JsonResponse({

            "success":
                False,

            "message":
                "Método no permitido."

        }, status=405)

    try:

        job = (
            TemporaryRequestService
            .get_rfid_job(
                job_id
            )
        )

        return JsonResponse({

            "success":
                True,

            "job":
                job

        })

    except Exception as error:

        return JsonResponse({

            "success":
                False,

            "message":
                str(error)

        }, status=404)


# ==========================================================
# RFID — ESP32 CONSULTA SI HAY UNA TARJETA POR ASIGNAR
# ==========================================================

@csrf_exempt
def get_pending_temporary_rfid_job(
    request
):

    if request.method != "GET":

        return JsonResponse({

            "success":
                False,

            "message":
                "Método no permitido."

        }, status=405)

    try:

        device = (
            request.GET.get(
                "device"
            )
            or "SEGURENTRY-ESP32"
        )

        job = (
            TemporaryRequestService
            .get_pending_rfid_job(
                device
            )
        )

        return JsonResponse({

            "success":
                True,

            "pending":
                job is not None,

            "job":
                job

        })

    except Exception as error:

        return JsonResponse({

            "success":
                False,

            "message":
                str(error)

        }, status=400)


# ==========================================================
# RFID — ESP32 ENVÍA EL UID LEÍDO
# ==========================================================

@csrf_exempt
def complete_temporary_rfid_enrollment(
    request,
    job_id
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

        rfid_uid = (
            data.get(
                "rfid_uid"
            )
            or data.get(
                "uid"
            )
            or data.get(
                "card_uid"
            )
        )

        device = (
            data.get(
                "device"
            )
            or "SEGURENTRY-ESP32"
        )

        job = (
            TemporaryRequestService
            .complete_rfid_enrollment(
                job_id,
                rfid_uid,
                device
            )
        )

        return JsonResponse({

            "success":
                True,

            "message":
                "Tarjeta RFID asociada correctamente.",

            "job":
                job

        })

    except Exception as error:

        return JsonResponse({

            "success":
                False,

            "message":
                str(error)

        }, status=400)
