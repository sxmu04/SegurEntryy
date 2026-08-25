from django.urls import path

from .views import (
    UploadProfilePhotoView,
    complete_registration,
    create_user,
    list_users,
    update_user,
    delete_user,
    get_user,
)

urlpatterns = [

    path("create/", create_user),

    path("list/", list_users),
    path("get/<str:uid>/", get_user, name="get_user"),
    path("update/<str:uid>/", update_user),

    path("delete/<str:uid>/", delete_user),
    path("upload-photo/", UploadProfilePhotoView.as_view(), name="upload_profile_photo"),
    path("complete-registration/", complete_registration, name="complete_registration")
]