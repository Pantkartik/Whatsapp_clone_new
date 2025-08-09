from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import StatusUpdateViewSet

router = DefaultRouter()
router.register('', StatusUpdateViewSet, basename='status')

urlpatterns = [
    path('', include(router.urls)),
]
