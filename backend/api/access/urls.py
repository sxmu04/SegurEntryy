from django.urls import path

from . import views


urlpatterns = [

    # =========================================================
    # REGISTRAR ACCESO NORMAL
    # =========================================================

    path(
        "register/",
        views.register_access,
        name="register_access"
    ),


    # =========================================================
    # ESP32 / IOT
    # IMPORTANTE: debe estar ANTES de <str:access_id>/
    # =========================================================

    path(
        "iot/",
        views.register_iot_access,
        name="register_iot_access"
    ),


    # =========================================================
    # ACCESOS DEL DIA
    # =========================================================

    path(
        "today/",
        views.today_access,
        name="today_access"
    ),


    # =========================================================
    # ELIMINAR ACCESO
    # =========================================================

    path(
        "delete/<str:access_id>/",
        views.delete_access,
        name="delete_access"
    ),


    # =========================================================
    # LISTAR TODOS LOS ACCESOS
    # =========================================================

    path(
        "",
        views.list_access,
        name="list_access"
    ),


    # =========================================================
    # OBTENER ACCESO INDIVIDUAL
    #
    # ESTA RUTA DEBE IR AL FINAL
    # porque captura cualquier texto:
    #
    # /api/access/ABC123/
    # =========================================================

    path(
        "<str:access_id>/",
        views.get_access,
        name="get_access"
    ),

]