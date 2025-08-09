from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import VideoCallViewSet

router = DefaultRouter()
router.register('calls', VideoCallViewSet, basename='videocall')

urlpatterns = [
    path('', include(router.urls)),
]
