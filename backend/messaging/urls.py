from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import RoomViewSet, MessageViewSet

router = DefaultRouter()
router.register('rooms', RoomViewSet, basename='room')
router.register('messages', MessageViewSet, basename='message')

urlpatterns = [
    path('', include(router.urls)),
]
