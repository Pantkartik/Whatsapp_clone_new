from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db import transaction
from messaging.models import Room, RoomParticipant
from .models import Invitation, InvitationUsage, QRCodeSession
from .serializers import (
    InvitationSerializer, InvitationInfoSerializer, AcceptInvitationSerializer
)

User = get_user_model()

class InvitationViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InvitationSerializer
    
    def get_queryset(self):
        return Invitation.objects.filter(owner=self.request.user).order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        """Get user's current invitation (create if none exists)"""
        invitation = self.get_queryset().first()
        
        if not invitation:
            # Create default invitation
            invitation = Invitation.objects.create(
                owner=request.user,
                max_uses=1000,  # High limit for QR codes
                expires_at=None  # No expiration
            )
        
        serializer = InvitationSerializer(invitation, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def regenerate(self, request):
        """Regenerate invitation token"""
        invitation = self.get_queryset().first()
        
        if not invitation:
            invitation = Invitation.objects.create(
                owner=request.user,
                max_uses=1000,
                expires_at=None
            )
        else:
            invitation.regenerate_token()
        
        serializer = InvitationSerializer(invitation, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def info(self, request):
        """Get invitation info (public endpoint)"""
        token = request.query_params.get('token')
        if not token:
            return Response(
                {'error': 'Token parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            invitation = Invitation.objects.get(token=token)
            
            # Track QR code scan
            QRCodeSession.objects.create(
                invitation=invitation,
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            if invitation.is_valid():
                data = {
                    'valid': True,
                    'owner': {
                        'id': str(invitation.owner.id),
                        'username': invitation.owner.username,
                        'avatar': invitation.owner.avatar,
                        'bio': invitation.owner.bio
                    },
                    'created_at': invitation.created_at,
                    'expires_at': invitation.expires_at,
                    'remaining_uses': max(0, invitation.max_uses - invitation.uses_count)
                }
            else:
                data = {'valid': False}
            
            serializer = InvitationInfoSerializer(data)
            return Response(serializer.data)
            
        except Invitation.DoesNotExist:
            return Response(
                InvitationInfoSerializer({'valid': False}).data
            )
    
    @action(detail=False, methods=['post'])
    def accept(self, request):
        """Accept an invitation"""
        serializer = AcceptInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        invitation = get_object_or_404(Invitation, token=token)
        
        if not invitation.is_valid():
            return Response(
                {'error': 'Invitation is no longer valid'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user already used this invitation
        existing_usage = InvitationUsage.objects.filter(
            invitation=invitation,
            user=request.user
        ).first()
        
        if existing_usage:
            # Return existing room
            return Response({
                'detail': 'Already connected',
                'room_id': str(existing_usage.room.id)
            })
        
        # Create or get direct room between users
        with transaction.atomic():
            # Check if room already exists
            existing_room = Room.objects.filter(
                room_type='direct',
                participants=request.user
            ).filter(
                participants=invitation.owner
            ).first()
            
            if existing_room:
                room = existing_room
            else:
                # Create new room
                room = Room.objects.create(
                    room_type='direct',
                    created_by=invitation.owner
                )
                
                # Add participants
                RoomParticipant.objects.create(room=room, user=invitation.owner, role='member')
                RoomParticipant.objects.create(room=room, user=request.user, role='member')
            
            # Record invitation usage
            InvitationUsage.objects.create(
                invitation=invitation,
                user=request.user,
                room=room,
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            # Increment usage count
            invitation.use_invitation()
        
        return Response({
            'detail': 'Invitation accepted',
            'room_id': str(room.id)
        })
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
