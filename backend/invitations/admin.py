from django.contrib import admin
from .models import Invitation, InvitationUsage, QRCodeSession

@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ('owner', 'token_short', 'uses_count', 'max_uses', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at', 'expires_at')
    search_fields = ('owner__username', 'token')
    readonly_fields = ('id', 'token', 'created_at', 'updated_at')
    
    def token_short(self, obj):
        return f"{obj.token[:8]}..."
    token_short.short_description = 'Token'

@admin.register(InvitationUsage)
class InvitationUsageAdmin(admin.ModelAdmin):
    list_display = ('invitation_token', 'user', 'room', 'used_at', 'ip_address')
    list_filter = ('used_at',)
    search_fields = ('invitation__token', 'user__username', 'ip_address')
    
    def invitation_token(self, obj):
        return f"{obj.invitation.token[:8]}..."
    invitation_token.short_description = 'Invitation'

@admin.register(QRCodeSession)
class QRCodeSessionAdmin(admin.ModelAdmin):
    list_display = ('invitation_token', 'session_id', 'scanned_at', 'ip_address')
    list_filter = ('scanned_at',)
    search_fields = ('invitation__token', 'ip_address')
    
    def invitation_token(self, obj):
        return f"{obj.invitation.token[:8]}..."
    invitation_token.short_description = 'Invitation'
