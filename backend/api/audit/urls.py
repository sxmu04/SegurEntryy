from django.urls import path

from .views import list_audit_logs


urlpatterns = [

    path(
        "",
        list_audit_logs,
        name="audit-logs"
    ),

]