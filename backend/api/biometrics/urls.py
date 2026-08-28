from django.urls import path

from . import views


urlpatterns = [

    # Frontend
    path(
        "users/",
        views.biometric_users,
        name="biometric_users"
    ),

    path(
        "enroll/",
        views.create_enrollment,
        name="biometric_enroll"
    ),

    path(
        "delete/",
        views.create_deletion,
        name="biometric_delete"
    ),

    path(
        "jobs/<str:job_id>/",
        views.get_job,
        name="biometric_job"
    ),

    path(
        "device/status/",
        views.device_status,
        name="biometric_device_status"
    ),

    # ESP32
    path(
        "device/jobs/next/",
        views.device_next_job,
        name="biometric_device_next_job"
    ),

    path(
        "device/jobs/<str:job_id>/complete/",
        views.device_complete_job,
        name="biometric_device_complete_job"
    ),

    path(
        "device/jobs/<str:job_id>/fail/",
        views.device_fail_job,
        name="biometric_device_fail_job"
    ),

    path(
        "device/heartbeat/",
        views.device_heartbeat,
        name="biometric_device_heartbeat"
    ),

]
