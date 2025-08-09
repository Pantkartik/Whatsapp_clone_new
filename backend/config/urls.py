from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def api_root(request):
    return JsonResponse({
        'message': 'WhatsApp Clone API',
        'version': '1.0',
        'endpoints': {
            'admin': '/admin/',
            'accounts': '/api/accounts/',
            'chat': '/api/chat/',
            'status': '/api/status/',
            'invitations': '/api/invite/',
            'video': '/api/video/',
        }
    })

urlpatterns = [
    path('', api_root, name='api_root'),  # This fixes the 404 error
    path('admin/', admin.site.urls),
    path('api/accounts/', include('user_accounts.urls')),
    path('api/chat/', include('messaging.urls')),
    path('api/status/', include('user_status.urls')),
    path('api/invite/', include('invitations.urls')),
    path('api/video/', include('video_calls.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
