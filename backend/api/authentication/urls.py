from .views import GoogleLoginView
from .views import LoginView
from .views import CheckProviderView
from django.urls import path

urlpatterns = [

    path("login/", LoginView.as_view()),
    path("google-login/", GoogleLoginView.as_view()),
    path("check-provider/", CheckProviderView.as_view()),

]