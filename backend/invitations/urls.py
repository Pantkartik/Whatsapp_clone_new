from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import InvitationViewSet

router = DefaultRouter()
router.register('', InvitationViewSet, basename='invitation')

urlpatterns = [
    path('', include(router.urls)),
]
