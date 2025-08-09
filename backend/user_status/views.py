from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Q, Prefetch
from django.utils import timezone
from django.shortcuts import get_object_or_404
from user_accounts.models import Contact
from .models import StatusUpdate, StatusView, StatusReaction
from .serializers import (
    StatusUpdateSerializer, CreateStatusSerializer,
    StatusReactionCreateSerializer, StatusViewSerializer
)

User = get_user_model()

class StatusUpdateViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateStatusSerializer
        return StatusUpdateSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        # Get statuses that user can view (not expired)
        queryset = StatusUpdate.objects.filter(
            expires_at__gt=timezone.now()
        ).exclude(
            owner=user  # Exclude own statuses from feed
        ).select_related('owner').prefetch_related(
            Prefetch(
                'views',
                queryset=StatusView.objects.select_related('viewer')
            ),
            Prefetch(
                'reactions',
                queryset=StatusReaction.objects.select_related('user')
            )
        )
        
        # Filter based on visibility and contacts
        contacts = Contact.objects.filter(
            user=user, blocked=False
        ).values_list('contact_id', flat=True)
        
        # Build visibility filter
        visibility_filter = Q(visibility='everyone')
        
        # Add contacts visibility
        if contacts:
            visibility_filter |= Q(
                visibility='contacts',
                owner_id__in=contacts
            )
        
        # Add custom visibility (where user is explicitly added)
        visibility_filter |= Q(
            visibility='custom',
            custom_viewers__user=user
        )
        
        return queryset.filter(visibility_filter).distinct().order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def my_statuses(self, request):
        """Get current user's status updates"""
        statuses = StatusUpdate.objects.filter(
            owner=request.user,
            expires_at__gt=timezone.now()
        ).prefetch_related(
            Prefetch(
                'views',
                queryset=StatusView.objects.select_related('viewer')
            ),
            Prefetch(
                'reactions',
                queryset=StatusReaction.objects.select_related('user')
            )
        ).order_by('-created_at')
        
        serializer = StatusUpdateSerializer(
            statuses, 
            many=True, 
            context={'request': request}
        )
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def view(self, request, pk=None):
        """Mark status as viewed"""
        status = self.get_object()
        
        # Check if user can view this status
        if not status.can_view(request.user):
            return Response(
                {'error': 'You cannot view this status'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Don't track views for own status
        if status.owner == request.user:
            return Response({'detail': 'Own status view not tracked'})
        
        # Create or get existing view
        view, created = StatusView.objects.get_or_create(
            status=status,
            viewer=request.user
        )
        
        return Response({
            'detail': 'Status marked as viewed',
            'view_created': created
        })
    
    @action(detail=True, methods=['get'])
    def viewers(self, request, pk=None):
        """Get list of status viewers"""
        status = self.get_object()
        
        # Only owner can see viewers
        if status.owner != request.user:
            return Response(
                {'error': 'Only status owner can view this'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        views = status.views.all()
        serializer = StatusViewSerializer(views, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def react(self, request, pk=None):
        """Add reaction to status"""
        status = self.get_object()
        
        # Check if user can view this status
        if not status.can_view(request.user):
            return Response(
                {'error': 'You cannot react to this status'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = StatusReactionCreateSerializer(
            data=request.data,
            context={'status_id': status.id, 'request': request}
        )
        serializer.is_valid(raise_exception=True)
        reaction = serializer.save()
        
        return Response({
            'detail': 'Reaction added',
            'reaction': reaction.reaction
        })
    
    @action(detail=True, methods=['delete'])
    def unreact(self, request, pk=None):
        """Remove reaction from status"""
        status = self.get_object()
        
        try:
            reaction = StatusReaction.objects.get(
                status=status,
                user=request.user
            )
            reaction.delete()
            return Response({'detail': 'Reaction removed'})
        except StatusReaction.DoesNotExist:
            return Response(
                {'error': 'No reaction found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def destroy(self, request, *args, **kwargs):
        """Delete status (only owner can delete)"""
        instance = self.get_object()
        
        if instance.owner != request.user:
            return Response(
                {'error': 'Only status owner can delete'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
