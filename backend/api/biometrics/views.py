import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .services.biometric_service import BiometricService


def _read_json(request):
    if not request.body:
        return {}

    try:
        return json.loads(
            request.body
        )
    except json.JSONDecodeError:
        raise Exception(
            "El cuerpo de la solicitud no contiene JSON válido."
        )


def _error_response(error, status=400):
    return JsonResponse(
        {
            "success":
                False,

            "message":
                str(error)
        },
        status=status
    )


# ==========================================================
# FRONTEND - LISTAR USUARIOS Y ESTADO BIOMÉTRICO
# ==========================================================

def biometric_users(request):

    if request.method != "GET":
        return _error_response(
            "Método no permitido.",
            status=405
        )

    try:

        users = (
            BiometricService
            .list_users()
        )

        return JsonResponse({
            "success":
                True,

            "users":
                users
        })

    except Exception as error:

        return _error_response(
            error
        )


# ==========================================================
# FRONTEND - INICIAR REGISTRO DE HUELLA
# ==========================================================

@csrf_exempt
def create_enrollment(request):

    if request.method != "POST":
        return _error_response(
            "Método no permitido.",
            status=405
        )

    try:

        data = (
            _read_json(
                request
            )
        )

        job = (
            BiometricService
            .create_enrollment_job(
                uid=data.get(
                    "uid"
                ),
                actor_uid=data.get(
                    "actor_uid",
                    ""
                ),
                device=data.get(
                    "device"
                )
            )
        )

        return JsonResponse(
            {
                "success":
                    True,

                "message":
                    "Proceso biométrico creado.",

                "job":
                    job
            },
            status=201
        )

    except Exception as error:

        return _error_response(
            error
        )




# ==========================================================
# FRONTEND - ELIMINAR / LIBERAR HUELLA DE UN USUARIO
# ==========================================================

@csrf_exempt
def create_deletion(request):

    if request.method != "POST":
        return _error_response(
            "Método no permitido.",
            status=405
        )

    try:

        data = (
            _read_json(
                request
            )
        )

        actor_uid = (
            str(
                data.get(
                    "actor_uid",
                    ""
                )
                or ""
            )
            .strip()
        )

        if not actor_uid:

            return _error_response(
                "No fue posible identificar al usuario que solicita la operación biométrica.",
                status=400
            )

        job = (
            BiometricService
            .create_deletion_job(
                uid=data.get(
                    "uid"
                ),
                actor_uid=actor_uid,
                device=data.get(
                    "device"
                )
            )
        )

        if not job:

            return JsonResponse({
                "success":
                    True,

                "message":
                    "El usuario no tiene una huella asociada.",

                "job":
                    None
            })

        return JsonResponse(
            {
                "success":
                    True,

                "message":
                    "Proceso de eliminación biométrica creado.",

                "job":
                    job
            },
            status=201
        )

    except PermissionError as error:

        return _error_response(
            error,
            status=403
        )

    except Exception as error:

        return _error_response(
            error
        )


# ==========================================================
# FRONTEND - CONSULTAR ESTADO DEL PROCESO
# ==========================================================

def get_job(request, job_id):

    if request.method != "GET":
        return _error_response(
            "Método no permitido.",
            status=405
        )

    try:

        job = (
            BiometricService
            .get_job(
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

        return _error_response(
            error,
            status=404
        )


# ==========================================================
# ESP32 - PEDIR SIGUIENTE TRABAJO
# ==========================================================

@csrf_exempt
def device_next_job(request):

    if request.method != "GET":
        return _error_response(
            "Método no permitido.",
            status=405
        )

    try:

        device = (
            request.GET.get(
                "device",
                BiometricService.DEFAULT_DEVICE
            )
        )

        job = (
            BiometricService
            .get_next_device_job(
                device=device
            )
        )

        if not job:
            return JsonResponse({
                "success":
                    True,

                "has_job":
                    False
            })

        # Respuesta plana para simplificar el parser del ESP32.
        return JsonResponse({
            "success":
                True,

            "has_job":
                True,

            "job_id":
                job.get(
                    "id"
                ),

            "action":
                job.get(
                    "action"
                ),

            "uid":
                job.get(
                    "uid"
                ),

            "user_name":
                job.get(
                    "user_name",
                    "Usuario"
                ),

            "fingerprint_id":
                job.get(
                    "fingerprint_id"
                )
        })

    except Exception as error:

        return _error_response(
            error
        )


# ==========================================================
# ESP32 - COMPLETAR TRABAJO
# ==========================================================

@csrf_exempt
def device_complete_job(
    request,
    job_id
):

    if request.method != "POST":
        return _error_response(
            "Método no permitido.",
            status=405
        )

    try:

        data = (
            _read_json(
                request
            )
        )

        job = (
            BiometricService
            .complete_device_job(
                job_id=job_id,
                fingerprint_id=data.get(
                    "fingerprint_id"
                ),
                device=data.get(
                    "device"
                )
            )
        )

        return JsonResponse({
            "success":
                True,

            "message":
                "Registro biométrico completado.",

            "job":
                job
        })

    except Exception as error:

        return _error_response(
            error
        )


# ==========================================================
# ESP32 - REPORTAR FALLO
# ==========================================================

@csrf_exempt
def device_fail_job(
    request,
    job_id
):

    if request.method != "POST":
        return _error_response(
            "Método no permitido.",
            status=405
        )

    try:

        data = (
            _read_json(
                request
            )
        )

        job = (
            BiometricService
            .fail_device_job(
                job_id=job_id,
                message=data.get(
                    "message"
                ),
                device=data.get(
                    "device"
                )
            )
        )

        return JsonResponse({
            "success":
                True,

            "message":
                "Fallo biométrico registrado.",

            "job":
                job
        })

    except Exception as error:

        return _error_response(
            error
        )


# ==========================================================
# ESP32 - HEARTBEAT
# ==========================================================

@csrf_exempt
def device_heartbeat(request):

    if request.method != "POST":
        return _error_response(
            "Método no permitido.",
            status=405
        )

    try:

        data = (
            _read_json(
                request
            )
        )

        device_data = (
            BiometricService
            .heartbeat(
                device=data.get(
                    "device"
                ),
                data=data
            )
        )

        return JsonResponse({
            "success":
                True,

            "device":
                device_data
        })

    except Exception as error:

        return _error_response(
            error
        )


# ==========================================================
# FRONTEND - ESTADO DEL ESP32
# ==========================================================

def device_status(request):

    if request.method != "GET":
        return _error_response(
            "Método no permitido.",
            status=405
        )

    try:

        device = (
            request.GET.get(
                "device",
                BiometricService.DEFAULT_DEVICE
            )
        )

        device_data = (
            BiometricService
            .get_device_status(
                device=device
            )
        )

        return JsonResponse({
            "success":
                True,

            "device":
                device_data
        })

    except Exception as error:

        return _error_response(
            error
        )
