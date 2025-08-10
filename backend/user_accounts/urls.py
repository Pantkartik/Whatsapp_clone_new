from django.urls import path
from .views import (
    SessionLoginView, SessionLogoutView, SessionRegisterView, MeView
)

urlpatterns = [
    path('login/', SessionLoginView.as_view(), name='login'),
    path('logout/', SessionLogoutView.as_view(), name='logout'),
    path('register/', SessionRegisterView.as_view(), name='register'),
    path('me/', MeView.as_view(), name='me'),
]
