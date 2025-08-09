import uuid
import secrets
import string
from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models
from django.utils import timezone
from datetime import timedelta

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    avatar = models.URLField(blank=True, null=True)
    bio = models.CharField(max_length=200, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    
    # Override groups and user_permissions with unique related_name to avoid clashes
    groups = models.ManyToManyField(
        Group,
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to.',
        related_name='custom_user_set',
        related_query_name='custom_user',
    )
    user_permissions = models.ManyToManyField(
        Permission,
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='custom_user_permissions_set',
        related_query_name='custom_user',
    )
    
    # Security settings
    twofa_enabled = models.BooleanField(default=False)
    twofa_secret = models.CharField(max_length=32, blank=True, null=True)
    
    # Status tracking
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(auto_now=True)
    
    # Privacy settings
    show_last_seen = models.CharField(
        max_length=10,
        choices=[
            ('everyone', 'Everyone'),
            ('contacts', 'My Contacts'),
            ('nobody', 'Nobody'),
        ],
        default='everyone'
    )
    
    show_status_to = models.CharField(
        max_length=10,
        choices=[
            ('everyone', 'Everyone'),
            ('contacts', 'My Contacts'),
            ('nobody', 'Nobody'),
        ],
        default='everyone'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        db_table = 'users'
    
    def __str__(self):
        return self.username
    
    def generate_2fa_code(self):
        return ''.join(secrets.choice(string.digits) for _ in range(6))
    
    def set_online_status(self, is_online):
        self.is_online = is_online
        if not is_online:
            self.last_seen = timezone.now()
        self.save(update_fields=['is_online', 'last_seen'])

class TwoFactorCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='twofa_codes')
    code = models.CharField(max_length=6)
    purpose = models.CharField(
        max_length=20,
        choices=[
            ('login', 'Login'),
            ('enable_2fa', 'Enable 2FA'),
            ('disable_2fa', 'Disable 2FA'),
        ]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        db_table = 'two_factor_codes'
        unique_together = ['user', 'code', 'purpose']
    
    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=10)
        super().save(*args, **kwargs)
    
    def is_valid(self):
        return (
            self.used_at is None and
            timezone.now() < self.expires_at
        )
    
    def mark_as_used(self):
        self.used_at = timezone.now()
        self.save(update_fields=['used_at'])

class Contact(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contacts')
    contact = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contacted_by')
    nickname = models.CharField(max_length=100, blank=True, null=True)
    blocked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'contacts'
        unique_together = ['user', 'contact']
    
    def __str__(self):
        return f"{self.user.username} -> {self.contact.username}"
