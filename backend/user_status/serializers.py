from rest_framework import serializers
from django.utils import timezone
from user_accounts.serializers import UserPublicSerializer
from .models import StatusUpdate, StatusView, StatusReaction, StatusViewer

class StatusViewSerializer(serializers.ModelSerializer):
    viewer = UserPublicSerializer(read_only=True)
    
    class Meta:
        model = StatusView
        fields = ['viewer', 'viewed_at']

class StatusReactionSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)
    
    class Meta:
        model = StatusReaction
        fields = ['user', 'reaction', 'created_at']

class StatusUpdateSerializer(serializers.ModelSerializer):
    owner = UserPublicSerializer(read_only=True)
    views = StatusViewSerializer(many=True, read_only=True)
    reactions = StatusReactionSerializer(many=True, read_only=True)
    viewer_count = serializers.IntegerField(source='view_count', read_only=True)
    has_viewed = serializers.SerializerMethodField()
    time_remaining_seconds = serializers.SerializerMethodField()
    
    class Meta:
        model = StatusUpdate
        fields = [
            'id', 'owner', 'status_type', 'text', 'media_url', 'media_type',
            'background_color', 'visibility', 'created_at', 'expires_at',
            'viewer_count', 'views', 'reactions', 'has_viewed',
            'time_remaining_seconds'
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'expires_at', 'viewer_count']
    
    def get_has_viewed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return StatusView.objects.filter(
                status=obj,
                viewer=request.user
            ).exists()
        return False
    
    def get_time_remaining_seconds(self, obj):
        remaining = obj.time_remaining()
        return int(remaining.total_seconds()) if remaining else 0

class CreateStatusSerializer(serializers.ModelSerializer):
    custom_viewer_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        write_only=True
    )
    
    class Meta:
        model = StatusUpdate
        fields = [
            'status_type', 'text', 'media_url', 'media_type',
            'background_color', 'visibility', 'custom_viewer_ids'
        ]
    
    def validate(self, attrs):
        status_type = attrs.get('status_type')
        text = attrs.get('text')
        media_url = attrs.get('media_url')
        
        if status_type == 'text' and not text:
            raise serializers.ValidationError("Text is required for text status")
        
        if status_type in ['image', 'video'] and not media_url:
            raise serializers.ValidationError(f"Media URL is required for {status_type} status")
        
        return attrs
    
    def create(self, validated_data):
        custom_viewer_ids = validated_data.pop('custom_viewer_ids', [])
        
        status = StatusUpdate.objects.create(
            owner=self.context['request'].user,
            **validated_data
        )
        
        # Add custom viewers if visibility is custom
        if status.visibility == 'custom' and custom_viewer_ids:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            viewers = User.objects.filter(id__in=custom_viewer_ids)
            for viewer in viewers:
                StatusViewer.objects.create(status=status, user=viewer)
        
        return status

class StatusReactionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatusReaction
        fields = ['reaction']
    
    def create(self, validated_data):
        status_id = self.context['status_id']
        user = self.context['request'].user
        
        reaction, created = StatusReaction.objects.update_or_create(
            status_id=status_id,
            user=user,
            defaults=validated_data
        )
        
        return reaction
