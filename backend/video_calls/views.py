from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db.models import Q
from messaging.models import Room
from .models import VideoCall, CallParticipant
from .serializers import VideoCallSerializer, InitiateCallSerializer

User = get_user_model()

class VideoCallViewSet(viewsets.ModelViewSet):
    serializer_class = VideoCallSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return VideoCall.objects.filter(
            Q(caller=self.request.user) | Q(receiver=self.request.user)
        ).order_by('-initiated_at')
    
    @action(detail=False, methods=['post'])
    def initiate(self, request):
        """Initiate a video call"""
        serializer = InitiateCallSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        room_id = serializer.validated_data['room_id']
        room = get_object_or_404(Room, id=room_id, participants=request.user)
        
        # Get the other participant (for direct rooms)
        if room.room_type == 'direct':
            receiver = room.participants.exclude(id=request.user.id).first()
            if not receiver:
                return Response(
                    {'error': 'No other participant found'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            return Response(
                {'error': 'Group calls not implemented yet'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if there's already an active call
        active_call = VideoCall.objects.filter(
            room=room,
            status__in=['initiated', 'ringing', 'accepted']
        ).first()
        
        if active_call:
            return Response(
                {'error': 'Call already in progress'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create video call
        call = VideoCall.objects.create(
            room=room,
            caller=request.user,
            receiver=receiver,
            call_type=serializer.validated_data['call_type'],
            offer_sdp=serializer.validated_data['offer_sdp'],
            status='ringing'
        )
        
        # Add caller as participant
        CallParticipant.objects.create(call=call, user=request.user)
        
        return Response(
            VideoCallSerializer(call).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept a video call"""
        call = self.get_object()
        
        if call.receiver != request.user:
            return Response(
                {'error': 'Only receiver can accept the call'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if call.status != 'ringing':
            return Response(
                {'error': 'Call is not in ringing state'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        answer_sdp = request.data.get('answer_sdp')
        if not answer_sdp:
            return Response(
                {'error': 'Answer SDP is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update call status
        call.status = 'accepted'
        call.answer_sdp = answer_sdp
        call.answered_at = timezone.now()
        call.save()
        
        # Add receiver as participant
        CallParticipant.objects.create(call=call, user=request.user)
        
        return Response(VideoCallSerializer(call).data)
    
    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        """Decline a video call"""
        call = self.get_object()
        
        if call.receiver != request.user:
            return Response(
                {'error': 'Only receiver can decline the call'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if call.status not in ['initiated', 'ringing']:
            return Response(
                {'error': 'Call cannot be declined'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update call status
        call.status = 'declined'
        call.ended_at = timezone.now()
        call.save()
        
        return Response(VideoCallSerializer(call).data)
    
    @action(detail=True, methods=['post'])
    def end(self, request, pk=None):
        """End a video call"""
        call = self.get_object()
        
        if request.user not in [call.caller, call.receiver]:
            return Response(
                {'error': 'Only call participants can end the call'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if call.status in ['ended', 'declined', 'failed']:
            return Response(
                {'error': 'Call already ended'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # End the call
        call.end_call()
        
        # Mark all participants as left
        call.participants.filter(left_at__isnull=True).update(left_at=timezone.now())
        
        return Response(VideoCallSerializer(call).data)
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get call history"""
        calls = self.get_queryset()[:50]  # Last 50 calls
        serializer = VideoCallSerializer(calls, many=True)
        return Response(serializer.data)
