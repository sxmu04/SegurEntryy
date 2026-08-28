from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

import json

from .services.access_service import AccessService


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
# REGISTRAR ACCESO MANUAL
# ==========================================================

@csrf_exempt
def register_access(
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

        access = (
            AccessService
            .register_access(
                data
            )
        )

        return JsonResponse({
            "success":
                True,

            "message":
                "Acceso registrado correctamente.",

            "access":
                access
        }, status=201)

    except Exception as error:

        return JsonResponse({
            "success":
                False,

            "message":
                str(error)
        }, status=400)


# ==========================================================
# ACCESO DESDE ESP32 / HUELLA
# ==========================================================

@csrf_exempt
def register_iot_access(
    request
):

    if request.method != "POST":

        return JsonResponse({
            "success":
                False,

            "authorized":
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

        result = (
            AccessService
            .register_fingerprint_access(
                data
            )
        )

        return JsonResponse({

            "success":
                True,

            "authorized":
                result.get(
                    "authorized",
                    False
                ),

            "movement":
                result.get(
                    "movement"
                ),

            "inside":
                result.get(
                    "inside"
                ),

            "message":
                result.get(
                    "message",
                    ""
                ),

            "user":
                result.get(
                    "user"
                ),

            "access":
                result.get(
                    "access"
                )
        })

    except Exception as error:

        return JsonResponse({

            "success":
                False,

            "authorized":
                False,

            "movement":
                None,

            "message":
                str(error)
        }, status=400)




# ==========================================================
# ALIAS DE COMPATIBILIDAD
# ==========================================================
#
# Algunos commits/rutas antiguas usan "iot_access" y el
# proyecto local actual usa "register_iot_access".
# Dejamos ambos nombres válidos para evitar romper urls.py.
# ==========================================================

def iot_access(
    request
):

    return register_iot_access(
        request
    )


# ==========================================================
# LISTAR ACCESOS
# ==========================================================

@csrf_exempt
def list_access(
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

        accesses = (
            AccessService
            .get_all_access()
        )

        # Se mantienen ambas claves para compatibilidad
        # con las vistas existentes de SegurEntry.
        return JsonResponse({
            "success":
                True,

            "accesses":
                accesses,

            "access":
                accesses
        })

    except Exception as error:

        return JsonResponse({
            "success":
                False,

            "message":
                str(error)
        }, status=400)


# ==========================================================
# OBTENER ACCESO
# ==========================================================

@csrf_exempt
def get_access(
    request,
    access_id
):

    if request.method != "GET":

        return JsonResponse({
            "success":
                False,

            "message":
                "Método no permitido."
        }, status=405)

    try:

        access = (
            AccessService
            .get_access(
                access_id
            )
        )

        return JsonResponse({
            "success":
                True,

            "access":
                access
        })

    except Exception as error:

        return JsonResponse({
            "success":
                False,

            "message":
                str(error)
        }, status=404)


# ==========================================================
# ELIMINAR ACCESO
# ==========================================================

@csrf_exempt
def delete_access(
    request,
    access_id
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
            AccessService
            .delete_access(
                access_id
            )
        )

        return JsonResponse({
            "success":
                True,

            "message":
                "Registro eliminado correctamente."
        })

    except Exception as error:

        return JsonResponse({
            "success":
                False,

            "message":
                str(error)
        }, status=400)


# ==========================================================
# ACCESOS DE HOY
# ==========================================================

@csrf_exempt
def today_access(
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

        accesses = (
            AccessService
            .get_today_access()
        )

        return JsonResponse({
            "success":
                True,

            "accesses":
                accesses,

            "access":
                accesses
        })

    except Exception as error:

        return JsonResponse({
            "success":
                False,

            "message":
                str(error)
        }, status=400)
