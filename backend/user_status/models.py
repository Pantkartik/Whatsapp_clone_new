import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

class StatusUpdate(models.Model):
    STATUS_TYPES = (
        ('text', 'Text'),
        ('image', 'Image'),
        ('video', 'Video'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='status_updates')
    status_type = models.CharField(max_length=10, choices=STATUS_TYPES, default='text')
    
    # Content
    text = models.TextField(blank=True)
    media_url = models.URLField(blank=True, null=True)
    media_type = models.CharField(max_length=50, blank=True)
    background_color = models.CharField(max_length=7, default='#3b82f6')  # Hex color
    
    # Privacy settings
    visibility = models.CharField(
        max_length=10,
        choices=[
            ('everyone', 'Everyone'),
            ('contacts', 'My Contacts'),
            ('custom', 'Custom'),
        ],
        default='everyone'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    
    # Analytics
    view_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'status_updates'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', '-created_at']),
            models.Index(fields=['expires_at']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Status by {self.owner.username} - {self.status_type}"
    
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    def time_remaining(self):
        if self.is_expired():
            return timedelta(0)
        return self.expires_at - timezone.now()
    
    def can_view(self, user):
        """Check if user can view this status"""
        if self.owner == user:
            return True
        
        if self.visibility == 'everyone':
            return True
        elif self.visibility == 'contacts':
            # Check if user is in owner's contacts
            from user_accounts.models import Contact
            return Contact.objects.filter(
                user=self.owner,
                contact=user,
                blocked=False
            ).exists()
        elif self.visibility == 'custom':
            return StatusViewer.objects.filter(
                status=self,
                user=user
            ).exists()
        
        return False

class StatusViewer(models.Model):
    """Track who can view custom visibility statuses"""
    status = models.ForeignKey(StatusUpdate, on_delete=models.CASCADE, related_name='custom_viewers')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'status_viewers'
        unique_together = ['status', 'user']

class StatusView(models.Model):
    """Track status views for analytics"""
    status = models.ForeignKey(StatusUpdate, on_delete=models.CASCADE, related_name='views')
    viewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='status_views')
    viewed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'status_views'
        unique_together = ['status', 'viewer']
        ordering = ['-viewed_at']
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            # Update view count
            StatusUpdate.objects.filter(id=self.status.id).update(
                view_count=models.F('view_count') + 1
            )

class StatusReaction(models.Model):
    REACTIONS = (
        ('❤️', 'Heart'),
        ('😂', 'Laugh'),
        ('😮', 'Wow'),
        ('😢', 'Sad'),
        ('😡', 'Angry'),
        ('👍', 'Like'),
        ('👎', 'Dislike'),
    )
    
    status = models.ForeignKey(StatusUpdate, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    reaction = models.CharField(max_length=2, choices=REACTIONS)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'status_reactions'
        unique_together = ['status', 'user']
        ordering = ['-created_at']
