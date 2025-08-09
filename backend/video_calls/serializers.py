from rest_framework import serializers
from user_accounts.serializers import UserPublicSerializer
from .models import VideoCall, CallParticipant

class CallParticipantSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)
    
    class Meta:
        model = CallParticipant
        fields = ['user', 'joined_at', 'left_at', 'ice_candidates']

class VideoCallSerializer(serializers.ModelSerializer):
    caller = UserPublicSerializer(read_only=True)
    receiver = UserPublicSerializer(read_only=True)
    participants = CallParticipantSerializer(many=True, read_only=True)
    
    class Meta:
        model = VideoCall
        fields = [
            'id', 'caller', 'receiver', 'call_type', 'status',
            'initiated_at', 'answered_at', 'ended_at', 'duration',
            'participants'
        ]
        read_only_fields = ['id', 'initiated_at', 'duration']

class InitiateCallSerializer(serializers.Serializer):
    room_id = serializers.UUIDField()
    call_type = serializers.ChoiceField(choices=VideoCall.CALL_TYPES, default='video')
    offer_sdp = serializers.CharField()

class WebRTCSignalSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=[
        'offer', 'answer', 'ice-candidate', 'call-end', 'call-reject'
    ])
    sdp = serializers.CharField(required=False, allow_blank=True)
    candidate = serializers.JSONField(required=False, allow_null=True)
    target_user_id = serializers.UUIDField(required=False, allow_null=True)
