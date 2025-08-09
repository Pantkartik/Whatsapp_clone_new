import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class VideoCall(models.Model):
    CALL_STATUS = (
        ('initiated', 'Initiated'),
        ('ringing', 'Ringing'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('ended', 'Ended'),
        ('missed', 'Missed'),
        ('failed', 'Failed'),
    )
    
    CALL_TYPES = (
        ('video', 'Video Call'),
        ('audio', 'Audio Call'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey('messaging.Room', on_delete=models.CASCADE, related_name='video_calls')
    caller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='initiated_calls')
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_calls')
    call_type = models.CharField(max_length=10, choices=CALL_TYPES, default='video')
    status = models.CharField(max_length=10, choices=CALL_STATUS, default='initiated')
    
    # Call timing
    initiated_at = models.DateTimeField(auto_now_add=True)
    answered_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration = models.DurationField(null=True, blank=True)
    
    # WebRTC data
    offer_sdp = models.TextField(blank=True, null=True)
    answer_sdp = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'video_calls'
        ordering = ['-initiated_at']
    
    def __str__(self):
        return f"{self.call_type.title()} call from {self.caller.username} to {self.receiver.username}"
    
    def calculate_duration(self):
        """Calculate call duration"""
        if self.answered_at and self.ended_at:
            self.duration = self.ended_at - self.answered_at
            self.save(update_fields=['duration'])
    
    def end_call(self):
        """End the call and calculate duration"""
        if not self.ended_at:
            self.ended_at = timezone.now()
            self.status = 'ended'
            self.calculate_duration()
            self.save(update_fields=['ended_at', 'status', 'duration'])

class CallParticipant(models.Model):
    call = models.ForeignKey(VideoCall, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    ice_candidates = models.JSONField(default=list, blank=True)
    
    class Meta:
        db_table = 'call_participants'
        unique_together = ['call', 'user']
    
    def leave_call(self):
        """Mark participant as left"""
        if not self.left_at:
            self.left_at = timezone.now()
            self.save(update_fields=['left_at'])
