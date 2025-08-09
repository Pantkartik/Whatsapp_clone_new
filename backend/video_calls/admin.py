from django.contrib import admin
from .models import VideoCall, CallParticipant

@admin.register(VideoCall)
class VideoCallAdmin(admin.ModelAdmin):
    list_display = ('caller', 'receiver', 'call_type', 'status', 'duration', 'initiated_at')
    list_filter = ('call_type', 'status', 'initiated_at')
    search_fields = ('caller__username', 'receiver__username')
    readonly_fields = ('id', 'initiated_at', 'duration')

@admin.register(CallParticipant)
class CallParticipantAdmin(admin.ModelAdmin):
    list_display = ('call', 'user', 'joined_at', 'left_at')
    list_filter = ('joined_at', 'left_at')
    search_fields = ('call__id', 'user__username')
