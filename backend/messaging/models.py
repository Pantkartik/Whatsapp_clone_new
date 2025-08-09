import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class Room(models.Model):
    ROOM_TYPES = (
        ('direct', 'Direct Message'),
        ('group', 'Group Chat'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, blank=True, null=True)
    room_type = models.CharField(max_length=10, choices=ROOM_TYPES, default='direct')
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        through='RoomParticipant',
        related_name='chat_rooms'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_rooms'
    )
    avatar = models.URLField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'chat_rooms'
        ordering = ['-updated_at']
    
    def __str__(self):
        if self.room_type == 'group':
            return f"Group: {self.name or f'Room {self.id}'}"
        
        participants = list(self.participants.all())
        if len(participants) >= 2:
            return f"Chat: {participants[0].username} & {participants[1].username}"
        return f"Room {self.id}"
    
    def get_last_message(self):
        return self.messages.first()
    
    def get_unread_count(self, user):
        last_read = RoomParticipant.objects.filter(
            room=self, user=user
        ).first()
        
        if not last_read or not last_read.last_read_at:
            return self.messages.count()
        
        return self.messages.filter(
            created_at__gt=last_read.last_read_at
        ).exclude(sender=user).count()

class RoomParticipant(models.Model):
    ROLES = (
        ('member', 'Member'),
        ('admin', 'Admin'),
        ('owner', 'Owner'),
    )
    
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=ROLES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(null=True, blank=True)
    is_muted = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'room_participants'
        unique_together = ['room', 'user']
    
    def mark_as_read(self):
        self.last_read_at = timezone.now()
        self.save(update_fields=['last_read_at'])

class Message(models.Model):
    MESSAGE_TYPES = (
        ('text', 'Text'),
        ('image', 'Image'),
        ('file', 'File'),
        ('audio', 'Audio'),
        ('video', 'Video'),
        ('location', 'Location'),
        ('system', 'System'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPES, default='text')
    
    # Encrypted message content
    ciphertext = models.TextField()
    nonce = models.CharField(max_length=64)
    tag = models.CharField(max_length=64, blank=True)
    
    # File attachments
    file_url = models.URLField(blank=True, null=True)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    file_type = models.CharField(max_length=100, blank=True, null=True)
    
    # Message metadata
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replied_messages')
    forwarded_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='forwarded_messages')
    edited_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'messages'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['room', '-created_at']),
            models.Index(fields=['sender', '-created_at']),
        ]
    
    def __str__(self):
        return f"Message from {self.sender.username} in {self.room}"
    
    def is_deleted(self):
        return self.deleted_at is not None
    
    def is_edited(self):
        return self.edited_at is not None

class MessageStatus(models.Model):
    MESSAGE_STATUS_CHOICES = (
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('read', 'Read'),
    )
    
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='statuses')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=MESSAGE_STATUS_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'message_statuses'
        unique_together = ['message', 'user']
        indexes = [
            models.Index(fields=['message', 'status']),
        ]
