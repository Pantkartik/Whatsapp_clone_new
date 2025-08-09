from rest_framework import serializers
from user_accounts.serializers import UserPublicSerializer
from .models import Invitation, InvitationUsage

class InvitationUsageSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)
    
    class Meta:
        model = InvitationUsage
        fields = ['user', 'used_at', 'ip_address']

class InvitationSerializer(serializers.ModelSerializer):
    owner = UserPublicSerializer(read_only=True)
    usages = InvitationUsageSerializer(many=True, read_only=True)
    full_link = serializers.SerializerMethodField()
    remaining_uses = serializers.SerializerMethodField()
    
    class Meta:
        model = Invitation
        fields = [
            'id', 'owner', 'token', 'max_uses', 'uses_count',
            'expires_at', 'is_active', 'created_at', 'updated_at',
            'usages', 'full_link', 'remaining_uses'
        ]
        read_only_fields = ['id', 'owner', 'token', 'uses_count', 'created_at', 'updated_at']
    
    def get_full_link(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f'/invite/{obj.token}')
        return f'/invite/{obj.token}'
    
    def get_remaining_uses(self, obj):
        return max(0, obj.max_uses - obj.uses_count)

class InvitationInfoSerializer(serializers.Serializer):
    """Serializer for invitation info (public data)"""
    valid = serializers.BooleanField()
    owner = UserPublicSerializer(required=False)
    created_at = serializers.DateTimeField(required=False)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
    remaining_uses = serializers.IntegerField(required=False)

class AcceptInvitationSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=32)
    
    def validate_token(self, value):
        try:
            invitation = Invitation.objects.get(token=value)
            if not invitation.is_valid():
                raise serializers.ValidationError("Invitation is no longer valid.")
            return value
        except Invitation.DoesNotExist:
            raise serializers.ValidationError("Invalid invitation token.")
