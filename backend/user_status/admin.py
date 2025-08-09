from django.contrib import admin
from .models import StatusUpdate, StatusView, StatusReaction, StatusViewer

@admin.register(StatusUpdate)
class StatusUpdateAdmin(admin.ModelAdmin):
    list_display = ('owner', 'status_type', 'visibility', 'view_count', 'created_at', 'expires_at')
    list_filter = ('status_type', 'visibility', 'created_at')
    search_fields = ('owner__username', 'text')
    readonly_fields = ('id', 'created_at', 'view_count')

@admin.register(StatusView)
class StatusViewAdmin(admin.ModelAdmin):
    list_display = ('status', 'viewer', 'viewed_at')
    list_filter = ('viewed_at',)
    search_fields = ('status__owner__username', 'viewer__username')

@admin.register(StatusReaction)
class StatusReactionAdmin(admin.ModelAdmin):
    list_display = ('status', 'user', 'reaction', 'created_at')
    list_filter = ('reaction', 'created_at')
    search_fields = ('status__owner__username', 'user__username')

@admin.register(StatusViewer)
class StatusViewerAdmin(admin.ModelAdmin):
    list_display = ('status', 'user', 'added_at')
    list_filter = ('added_at',)
    search_fields = ('status__owner__username', 'user__username')
