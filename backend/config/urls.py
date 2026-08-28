from django.contrib import admin
from django.urls import path
from django.urls import include
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    
    path('admin/', admin.site.urls),

    #Modulos
    path('api/users/', include('api.users.urls')),
    path('api/roles/', include('api.roles.urls')),
    path('api/access/', include('api.access.urls')),
    path('api/auth/', include('api.authentication.urls')),
    path('api/invitations/', include('api.invitations.urls')),
    path("api/notifications/", include("api.notifications.urls")),
    path("api/temporary-requests/", include("api.temporary_requests.urls")),
    path("api/audit/", include("api.audit.urls")),
    path("api/biometrics/", include("api.biometrics.urls")),
]

urlpatterns += static(
    settings.MEDIA_URL,
    document_root=settings.MEDIA_ROOT
)