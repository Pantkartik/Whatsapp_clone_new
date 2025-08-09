from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Q, Prefetch
from django.shortcuts import get_object_or_404
from .models import Room, Message, RoomParticipant
from .serializers import (
    RoomSerializer, MessageSerializer, CreateDirectRoomSerializer,
    SendMessageSerializer
)

User = get_user_model()

class RoomViewSet(viewsets.ModelViewSet):
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Room.objects.filter(
            participants=self.request.user,
            is_active=True
        ).prefetch_related(
            Prefetch(
                'roomparticipant_set',
                queryset=RoomParticipant.objects.select_related('user')
            )
        ).order_by('-updated_at')
    
    @action(detail=False, methods=['post'])
    def get_or_create_direct(self, request):
        """Get or create a direct message room between two users"""
        serializer = CreateDirectRoomSerializer(
            data=request.data, 
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        other_user = User.objects.get(id=serializer.validated_data['user_id'])
        
        # Check if room already exists
        existing_room = Room.objects.filter(
            room_type='direct',
            participants=request.user
        ).filter(
            participants=other_user
        ).first()
        
        if existing_room:
            return Response(RoomSerializer(existing_room, context={'request': request}).data)
        
        # Create new room
        room = Room.objects.create(
            room_type='direct',
            created_by=request.user
        )
        
        # Add participants
        RoomParticipant.objects.create(room=room, user=request.user, role='member')
        RoomParticipant.objects.create(room=room, user=other_user, role='member')
        
        return Response(
            RoomSerializer(room, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Mark all messages in room as read"""
        room = self.get_object()
        participant = RoomParticipant.objects.filter(
            room=room, user=request.user
        ).first()
        
        if participant:
            participant.mark_as_read()
            return Response({'detail': 'Messages marked as read'})
        
        return Response(
            {'error': 'Not a participant of this room'},
            status=status.HTTP_400_BAD_REQUEST
        )

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        room_id = self.request.query_params.get('room')
        if not room_id:
            return Message.objects.none()
        
        # Verify user is participant of the room
        room = get_object_or_404(Room, id=room_id, participants=self.request.user)
        
        return Message.objects.filter(
            room=room,
            deleted_at__isnull=True
        ).select_related('sender').order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        """Send a new message"""
        room_id = request.data.get('room_id')
        room = get_object_or_404(Room, id=room_id, participants=request.user)
        
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create message
        message_data = serializer.validated_data.copy()
        message_data.pop('reply_to_id', None)
        
        message = Message.objects.create(
            room=room,
            sender=request.user,
            **message_data
        )
        
        # Handle reply
        reply_to_id = serializer.validated_data.get('reply_to_id')
        if reply_to_id:
            try:
                reply_message = Message.objects.get(id=reply_to_id, room=room)
                message.reply_to = reply_message
                message.save()
            except Message.DoesNotExist:
                pass
        
        # Update room's updated_at timestamp
        room.save(update_fields=['updated_at'])
        
        return Response(
            MessageSerializer(message).data,
            status=status.HTTP_201_CREATED
        )
