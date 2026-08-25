from django.urls import path

from .views import (
    temporary_requests,
    approve_temporary_request,
    reject_temporary_request
)


urlpatterns = [

    path(
        "",
        temporary_requests,
        name="temporary_requests"
    ),

    path(
        "<str:request_id>/approve/",
        approve_temporary_request,
        name="approve_temporary_request"
    ),

    path(
        "<str:request_id>/reject/",
        reject_temporary_request,
        name="reject_temporary_request"
    ),

]