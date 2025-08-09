from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import User, TwoFactorCode, Contact
from .serializers import (
    UserSerializer, UserPublicSerializer, RegisterSerializer, 
    LoginSerializer, TwoFactorVerifySerializer, ContactSerializer
)

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'user': UserSerializer(user).data,
            'message': 'Account created successfully. Please log in.'
        }, status=status.HTTP_201_CREATED)

class LoginStartView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        if user.twofa_enabled:
            code = user.generate_2fa_code()
            TwoFactorCode.objects.create(
                user=user,
                code=code,
                purpose='login'
            )
            
            return Response({
                'twofa_required': True,
                'message': 'Verification code sent to your email.'
            })
        else:
            user.set_online_status(True)
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            })

class LoginVerifyView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = TwoFactorVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        code = serializer.validated_data['code']
        
        try:
            user = User.objects.get(email=email)
            twofa_code = TwoFactorCode.objects.filter(
                user=user,
                code=code,
                purpose='login'
            ).first()
            
            if not twofa_code or not twofa_code.is_valid():
                return Response(
                    {'detail': 'Invalid or expired verification code.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            twofa_code.mark_as_used()
            user.set_online_status(True)
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            })
            
        except User.DoesNotExist:
            return Response(
                {'detail': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            request.user.set_online_status(False)
            
            return Response({'detail': 'Successfully logged out.'})
        except Exception:
            return Response({'detail': 'Invalid token.'}, 
                          status=status.HTTP_400_BAD_REQUEST)

class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user

class Toggle2FAView(APIView):
    def post(self, request):
        user = request.user
        
        if user.twofa_enabled:
            user.twofa_enabled = False
            user.twofa_secret = None
            user.save()
            
            TwoFactorCode.objects.filter(user=user).delete()
            
            return Response({
                'twofa_enabled': False,
                'message': '2FA has been disabled.'
            })
        else:
            code = user.generate_2fa_code()
            TwoFactorCode.objects.create(
                user=user,
                code=code,
                purpose='enable_2fa'
            )
            
            return Response({
                'verification_required': True,
                'message': 'Verification code sent to your email.'
            })

class Verify2FAToggleView(APIView):
    def post(self, request):
        code = request.data.get('code')
        if not code:
            return Response(
                {'detail': 'Verification code is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = request.user
        twofa_code = TwoFactorCode.objects.filter(
            user=user,
            code=code,
            purpose='enable_2fa'
        ).first()
        
        if not twofa_code or not twofa_code.is_valid():
            return Response(
                {'detail': 'Invalid or expired verification code.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.twofa_enabled = True
        user.save()
        
        twofa_code.mark_as_used()
        
        return Response({
            'twofa_enabled': True,
            'message': '2FA has been enabled successfully.'
        })

class SearchUsersView(generics.ListAPIView):
    serializer_class = UserPublicSerializer
    
    def get_queryset(self):
        query = self.request.query_params.get('q', '').strip()
        if len(query) < 2:
            return User.objects.none()
        
        return User.objects.filter(
            Q(username__icontains=query) | Q(email__icontains=query)
        ).exclude(
            id=self.request.user.id
        )[:10]

class ContactViewSet(viewsets.ModelViewSet):
    serializer_class = ContactSerializer
    
    def get_queryset(self):
        return Contact.objects.filter(user=self.request.user).order_by('created_at')
    
    @action(detail=True, methods=['post'])
    def block(self, request, pk=None):
        contact = self.get_object()
        contact.blocked = True
        contact.save()
        return Response({'detail': 'Contact blocked successfully.'})
    
    @action(detail=True, methods=['post'])
    def unblock(self, request, pk=None):
        contact = self.get_object()
        contact.blocked = False
        contact.save()
        return Response({'detail': 'Contact unblocked successfully.'})
