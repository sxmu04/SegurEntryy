from django.urls import path
from .views import *

urlpatterns = [
    path('', lambda request: None),  # temporal para evitar error
]