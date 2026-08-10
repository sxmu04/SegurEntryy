from django.urls import path

from . import views


urlpatterns = [

    # Estadísticas generales
    path(
        "stats/",
        views.dashboard_stats,
        name="dashboard_stats"
    ),

    # Últimos accesos
    path(
        "recent-access/",
        views.recent_access,
        name="recent_access"
    ),

    # Últimos usuarios
    path(
        "recent-users/",
        views.recent_users,
        name="recent_users"
    ),

    # Accesos por rol
    path(
        "access-role/",
        views.access_by_role,
        name="access_by_role"
    ),

    # Accesos por puerta
    path(
        "access-door/",
        views.access_by_door,
        name="access_by_door"
    ),

]