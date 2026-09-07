from django.urls import path

from .views import (
    temporary_requests,
    approve_temporary_request,
    reject_temporary_request,
    start_temporary_rfid_enrollment,
    get_temporary_rfid_job,
    get_pending_temporary_rfid_job,
    complete_temporary_rfid_enrollment
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

    path(
        "<str:request_id>/rfid/start/",
        start_temporary_rfid_enrollment,
        name="start_temporary_rfid_enrollment"
    ),

    path(
        "rfid/jobs/<str:job_id>/",
        get_temporary_rfid_job,
        name="get_temporary_rfid_job"
    ),

    path(
        "rfid/device/pending/",
        get_pending_temporary_rfid_job,
        name="get_pending_temporary_rfid_job"
    ),

    path(
        "rfid/jobs/<str:job_id>/complete/",
        complete_temporary_rfid_enrollment,
        name="complete_temporary_rfid_enrollment"
    ),

]
