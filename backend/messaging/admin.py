from django.contrib import admin
from .models import Room, RoomParticipant, Message, MessageStatus

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'room_type', 'participant_count', 'created_at', 'is_active')
    list_filter = ('room_type', 'is_active', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')
    
    def participant_count(self, obj):
        return obj.participants.count()
    participant_count.short_description = 'Participants'

@admin.register(RoomParticipant)
class RoomParticipantAdmin(admin.ModelAdmin):
    list_display = ('room', 'user', 'role', 'joined_at', 'is_muted')
    list_filter = ('role', 'is_muted', 'joined_at')
    search_fields = ('room__name', 'user__username', 'user__email')

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'sender', 'room', 'message_type', 'created_at', 'edited_at', 'deleted_at')
    list_filter = ('message_type', 'created_at', 'edited_at', 'deleted_at')
    search_fields = ('sender__username', 'room__name')
    readonly_fields = ('id', 'created_at')

@admin.register(MessageStatus)
class MessageStatusAdmin(admin.ModelAdmin):
    list_display = ('message', 'user', 'status', 'timestamp')
    list_filter = ('status', 'timestamp')
    search_fields = ('message__id', 'user__username')
