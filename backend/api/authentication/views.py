from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from firebase_admin import auth
from config.firebase_config import db

import traceback


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
            }, status=status.HTTP_400_BAD_REQUEST)

        email = email.strip().lower()

        try:

            # ==========================================
            # FIREBASE AUTHENTICATION
            # ==========================================

            firebase_user = auth.get_user_by_email(email)

            # ==========================================
            # FIRESTORE
            # ==========================================

            user_doc = (
                db.collection("users")
                .document(firebase_user.uid)
                .get()
            )

            if not user_doc.exists:

                return Response({
                    "success": False,
                    "message": "Usuario no encontrado"
                }, status=status.HTTP_404_NOT_FOUND)

            user_data = user_doc.to_dict()

            # ==========================================
            # 🚫 CUENTA INACTIVA
            # ==========================================

            if user_data.get("active", True) is False:

                return Response({

                    "success": False,

                    "code": "USER_INACTIVE",

                    "message":
                        "Tu usuario ha sido desactivado. "
                        "Contacta al administrador para solicitar "
                        "su activación."

                }, status=status.HTTP_403_FORBIDDEN)

            # ==========================================
            # TOKEN
            # ==========================================

            refresh = RefreshToken()

            refresh["uid"] = firebase_user.uid
            refresh["email"] = email
            refresh["role"] = user_data.get("role", "")

            # ==========================================
            # RESPUESTA
            # ==========================================

            return Response({

                "success": True,

                "message": "Login exitoso",

                "access": str(refresh.access_token),

                "refresh": str(refresh),

                "user": user_data

            })

        except Exception as e:

            traceback.print_exc()

            return Response({

                "success": False,

                "message": str(e)

            }, status=status.HTTP_400_BAD_REQUEST)