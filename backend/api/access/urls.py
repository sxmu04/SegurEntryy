from django.urls import path

from . import views


urlpatterns = [

    # Registrar acceso
    path(
        "register/",
        views.register_access,
        name="register_access"
    ),

    # Listar todos los accesos
    path(
        "",
        views.list_access,
        name="list_access"
    ),

    # Accesos del día
    path(
        "today/",
        views.today_access,
        name="today_access"
    ),

    # Obtener un acceso
    path(
        "<str:access_id>/",
        views.get_access,
        name="get_access"
    ),

    # Eliminar un acceso
    path(
        "delete/<str:access_id>/",
        views.delete_access,
        name="delete_access"
    ),

]