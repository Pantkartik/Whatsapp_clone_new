import uuid
import secrets
import string
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

def generate_invite_token():
    """Generate a secure invite token"""
    return ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))

class Invitation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='invitations')
    token = models.CharField(max_length=32, unique=True, default=generate_invite_token)
    
    # Invitation settings
    max_uses = models.PositiveIntegerField(default=1)
    uses_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'invitations'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['owner', '-created_at']),
        ]
    
    def __str__(self):
        return f"Invitation by {self.owner.username} - {self.token[:8]}..."
    
    def is_valid(self):
        """Check if invitation is still valid"""
        if not self.is_active:
            return False
        
        if self.uses_count >= self.max_uses:
            return False
        
        if self.expires_at and timezone.now() > self.expires_at:
            return False
        
        return True
    
    def use_invitation(self):
        """Increment usage count"""
        self.uses_count += 1
        self.save(update_fields=['uses_count'])
        
        # Auto-deactivate if max uses reached
        if self.uses_count >= self.max_uses:
            self.is_active = False
            self.save(update_fields=['is_active'])
    
    def regenerate_token(self):
        """Generate new token"""
        self.token = generate_invite_token()
        self.uses_count = 0
        self.is_active = True
        self.save(update_fields=['token', 'uses_count', 'is_active'])

class InvitationUsage(models.Model):
    invitation = models.ForeignKey(Invitation, on_delete=models.CASCADE, related_name='usages')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='invitation_usages')
    room = models.ForeignKey('messaging.Room', on_delete=models.CASCADE, null=True)
    
    # IP tracking
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Timestamps
    used_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'invitation_usages'
        unique_together = ['invitation', 'user']
        ordering = ['-used_at']
    
    def __str__(self):
        return f"{self.user.username} used invitation {self.invitation.token[:8]}..."

class QRCodeSession(models.Model):
    """Track QR code scanning sessions"""
    invitation = models.ForeignKey(Invitation, on_delete=models.CASCADE, related_name='qr_sessions')
    session_id = models.UUIDField(default=uuid.uuid4, unique=True)
    scanned_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        db_table = 'qr_code_sessions'
        ordering = ['-scanned_at']
