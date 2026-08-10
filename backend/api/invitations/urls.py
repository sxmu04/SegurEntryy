from django.urls import path
from .views import CreateInvitationView, ListInvitationsView, ValidateInvitationView, DeleteInvitationView

urlpatterns = [
    path("create/", CreateInvitationView.as_view()),
    path("validate/", ValidateInvitationView.as_view()),
    path("list/", ListInvitationsView.as_view()),
    path("delete/<str:invitation_id>/", ListInvitationsView.as_view()),
]