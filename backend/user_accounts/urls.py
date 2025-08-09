from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginStartView, LoginVerifyView, LogoutView, 
    MeView, Toggle2FAView, Verify2FAToggleView, SearchUsersView,
    ContactViewSet
)

router = DefaultRouter()
router.register('contacts', ContactViewSet, basename='contact')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/start/', LoginStartView.as_view(), name='login_start'),
    path('login/verify/', LoginVerifyView.as_view(), name='login_verify'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
    path('toggle-2fa/', Toggle2FAView.as_view(), name='toggle_2fa'),
    path('verify-2fa-toggle/', Verify2FAToggleView.as_view(), name='verify_2fa_toggle'),
    path('search/', SearchUsersView.as_view(), name='search_users'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),
]
