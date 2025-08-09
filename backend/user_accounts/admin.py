from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, TwoFactorCode, Contact

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_online', 'twofa_enabled', 'date_joined')
    list_filter = ('is_online', 'twofa_enabled', 'is_staff', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Profile', {
            'fields': ('avatar', 'bio', 'phone_number')
        }),
        ('Security', {
            'fields': ('twofa_enabled', 'twofa_secret')
        }),
        ('Status', {
            'fields': ('is_online', 'last_seen')
        }),
        ('Privacy', {
            'fields': ('show_last_seen', 'show_status_to')
        }),
    )

@admin.register(TwoFactorCode)
class TwoFactorCodeAdmin(admin.ModelAdmin):
    list_display = ('user', 'purpose', 'code', 'created_at', 'expires_at', 'used_at')
    list_filter = ('purpose', 'created_at', 'used_at')
    search_fields = ('user__username', 'user__email', 'code')
    readonly_fields = ('created_at', 'expires_at', 'used_at')

@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ('user', 'contact', 'nickname', 'blocked', 'created_at')
    list_filter = ('blocked', 'created_at')
    search_fields = ('user__username', 'contact__username', 'nickname')
