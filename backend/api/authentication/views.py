from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from firebase_admin import auth
from config.firebase_config import db

import traceback

from .firebase_auth import verify_firebase_token


# =====================================================
# LOGIN CON GOOGLE
# =====================================================

class GoogleLoginView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        id_token = request.data.get("id_token")

        if not id_token:
            return Response(
                {
                    "success": False,
                    "message": "Token requerido"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:

            user_data = verify_firebase_token(id_token)

            uid = user_data["uid"]
            email = user_data["email"]

            # Buscar por UID
            user_ref = db.collection("users").document(uid)

            if not user_ref.get().exists:

                user_ref.set({
                    "uid": uid,
                    "email": email,
                    "name": user_data.get("name"),
                    "provider": "google",
                    "role": "visitor",
                    "active": True
                })

            user = user_ref.get().to_dict()

            return Response({
                "success": True,
                "message": "Login exitoso",
                "user": user
            })

        except Exception as e:

            traceback.print_exc()

            return Response({
                "success": False,
                "message": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


# =====================================================
# LOGIN EMAIL/PASSWORD
# =====================================================

class LoginView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        email = request.data.get("email")

        if not email:

            return Response({
                "success": False,
                "message": "Email requerido"
            }, status=400)

        try:

            # Usuario en Firebase Authentication
            firebase_user = auth.get_user_by_email(email)

            # Buscar por UID en Firestore
            user_doc = db.collection("users").document(firebase_user.uid).get()

            if not user_doc.exists:

                return Response({
                    "success": False,
                    "message": "Usuario no encontrado"
                }, status=404)

            user_data = user_doc.to_dict()

            refresh = RefreshToken()

            refresh["uid"] = firebase_user.uid
            refresh["email"] = email
            refresh["role"] = user_data.get("role", "")

            return Response({
                "success": True,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": user_data
            })

        except Exception as e:

            return Response({
                "success": False,
                "message": str(e)
            }, status=400)


# =====================================================
# CHECK PROVIDER
# =====================================================

class CheckProviderView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        email = request.data.get("email")

        if not email:

            return Response({
                "success": False,
                "message": "Email requerido"
            }, status=400)

        docs = list(
            db.collection("users")
              .where("email", "==", email)
              .limit(1)
              .stream()
        )

        if len(docs) == 0:

            return Response({
                "success": True,
                "exists": False,
                "provider": None
            })

        user = docs[0].to_dict()

        return Response({
            "success": True,
            "exists": True,
            "provider": user.get("provider", "password")
        })