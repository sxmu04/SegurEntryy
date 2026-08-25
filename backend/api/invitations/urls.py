from django.urls import path

from .views import (
    CreateInvitationView,
    ValidateInvitationView,
    ListInvitationsView,
    GetInvitationView,
    UpdateInvitationView,
    ResendInvitationView,
    CancelInvitationView,
    DeleteInvitationView
)


urlpatterns = [

    # Crear
    path(
        "create/",
        CreateInvitationView.as_view()
    ),

    # Validar
    path(
        "validate/",
        ValidateInvitationView.as_view()
    ),

    # Listar todas
    path(
        "list/",
        ListInvitationsView.as_view()
    ),

    # Obtener una
    path(
        "get/<str:invitation_id>/",
        GetInvitationView.as_view()
    ),

    # Modificar
    path(
        "update/<str:invitation_id>/",
        UpdateInvitationView.as_view()
    ),

    # Reenviar
    path(
        "resend/<str:invitation_id>/",
        ResendInvitationView.as_view()
    ),

    # Cancelar
    path(
        "cancel/<str:invitation_id>/",
        CancelInvitationView.as_view()
    ),

    # Eliminar
    path(
        "delete/<str:invitation_id>/",
        DeleteInvitationView.as_view()
    ),

]