from rest_framework import serializers
from django.contrib.auth import get_user_model
from user_accounts.serializers import UserPublicSerializer
from .models import Room, Message, RoomParticipant, MessageStatus

User = get_user_model()

class RoomParticipantSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)
    
    class Meta:
        model = RoomParticipant
        fields = ['user', 'role', 'joined_at', 'last_read_at', 'is_muted']

class MessageSerializer(serializers.ModelSerializer):
    sender = UserPublicSerializer(read_only=True)
    reply_to = serializers.SerializerMethodField()
    read_by = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'message_type', 'ciphertext', 'nonce', 'tag',
            'file_url', 'file_name', 'file_size', 'file_type',
            'reply_to', 'forwarded_from', 'edited_at', 'deleted_at',
            'created_at', 'read_by'
        ]
        read_only_fields = ['id', 'sender', 'created_at']
    
    def get_reply_to(self, obj):
        if obj.reply_to:
            return {
                'id': str(obj.reply_to.id),
                'sender': obj.reply_to.sender.username,
                'message_type': obj.reply_to.message_type,
                'created_at': obj.reply_to.created_at
            }
        return None
    
    def get_read_by(self, obj):
        # Return list of users who have read this message
        read_statuses = obj.statuses.filter(status='read')
        return [status.user.username for status in read_statuses]

class RoomSerializer(serializers.ModelSerializer):
    participants = RoomParticipantSerializer(source='roomparticipant_set', many=True, read_only=True)
    last_message = MessageSerializer(source='get_last_message', read_only=True)
    unread_count = serializers.SerializerMethodField()
    participant_count = serializers.IntegerField(source='participants.count', read_only=True)
    
    class Meta:
        model = Room
        fields = [
            'id', 'name', 'room_type', 'avatar', 'description',
            'participants', 'participant_count', 'last_message',
            'unread_count', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.get_unread_count(request.user)
        return 0

class CreateDirectRoomSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    
    def validate_user_id(self, value):
        request = self.context.get('request')
        
        if value == request.user.id:
            raise serializers.ValidationError("Cannot create room with yourself.")
        
        try:
            User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")
        
        return value

class SendMessageSerializer(serializers.Serializer):
    message_type = serializers.ChoiceField(choices=Message.MESSAGE_TYPES, default='text')
    ciphertext = serializers.CharField()
    nonce = serializers.CharField(max_length=64)
    tag = serializers.CharField(max_length=64, required=False, allow_blank=True)
    reply_to_id = serializers.UUIDField(required=False, allow_null=True)
    
    # File upload fields
    file_url = serializers.URLField(required=False, allow_blank=True)
    file_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    file_size = serializers.IntegerField(required=False, allow_null=True)
    file_type = serializers.CharField(max_length=100, required=False, allow_blank=True)
