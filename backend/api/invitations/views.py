from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from api.users.services.user_service import UserService


# ==========================================================
# CREAR INVITACIÓN
# ==========================================================

class CreateInvitationView(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):

        email = request.data.get("email")
        role = request.data.get("role")

        if not email or not role:

            return Response({
                "success": False,
                "message": "Email y rol son obligatorios."
            }, status=400)

        try:

            invitation = UserService.create_superadmin_user({
                "name": request.data.get("name", ""),
                "email": email,
                "role": role,
                "document": request.data.get("document", ""),
                "phone": request.data.get("phone", ""),
                "address": request.data.get("address", ""),
                "photo": request.data.get("photo", "")
            })

            return Response({

                "success": True,

                "message":
                    "Invitación creada y enviada correctamente.",

                "invitation":
                    invitation.get("invitation", invitation)

            })

        except Exception as e:

            return Response({

                "success": False,

                "message": str(e)

            }, status=500)


# ==========================================================
# VALIDAR INVITACIÓN
# ==========================================================

class ValidateInvitationView(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):

        email = request.data.get("email")
        code = request.data.get("code")

        if not email:

            return Response({

                "success": False,

                "message":
                    "Debe enviar un correo."

            }, status=400)

        if not code:

            return Response({

                "success": False,

                "message":
                    "Debe enviar un código."

            }, status=400)

        try:

            invitation = (
                UserService.get_invitation(code)
            )

            if invitation.get(
                "used",
                False
            ):

                return Response({

                    "success": False,

                    "message":
                        "Esta invitación ya fue utilizada."

                }, status=400)

            if invitation.get(
                "cancelled",
                False
            ):

                return Response({

                    "success": False,

                    "message":
                        "Esta invitación fue cancelada."

                }, status=400)

            if (
                invitation.get("email", "")
                .strip()
                .lower()
                != email.strip().lower()
            ):

                return Response({

                    "success": False,

                    "message":
                        "El correo no coincide con la invitación."

                }, status=400)

            return Response({

                "success": True,

                "message":
                    "Invitación válida.",

                "email":
                    invitation.get(
                        "email",
                        ""
                    ),

                "role":
                    invitation.get(
                        "role",
                        ""
                    ),

                "name":
                    invitation.get(
                        "name",
                        ""
                    )

            })

        except Exception as e:

            return Response({

                "success": False,

                "message": str(e)

            }, status=400)


# ==========================================================
# LISTAR INVITACIONES
# ==========================================================

class ListInvitationsView(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):

        try:

            invitations = (
                UserService.get_all_invitations()
            )

            return Response({

                "success": True,

                "invitations":
                    invitations

            })

        except Exception as e:

            return Response({

                "success": False,

                "message": str(e)

            }, status=500)


# ==========================================================
# OBTENER UNA INVITACIÓN
# ==========================================================

class GetInvitationView(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, invitation_id):

        try:

            invitation = (
                UserService.get_invitation(
                    invitation_id
                )
            )

            return Response({

                "success": True,

                "invitation":
                    invitation

            })

        except Exception as e:

            return Response({

                "success": False,

                "message": str(e)

            }, status=404)


# ==========================================================
# MODIFICAR INVITACIÓN
# ==========================================================

class UpdateInvitationView(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    def put(self, request, invitation_id):

        try:

            invitation = (
                UserService.update_invitation(

                    invitation_id,

                    request.data

                )
            )

            return Response({

                "success": True,

                "message":
                    "Invitación actualizada correctamente.",

                "invitation":
                    invitation

            })

        except Exception as e:

            return Response({

                "success": False,

                "message": str(e)

            }, status=400)


# ==========================================================
# REENVIAR INVITACIÓN
# ==========================================================

class ResendInvitationView(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, invitation_id):

        try:

            invitation = (
                UserService.resend_invitation(
                    invitation_id
                )
            )

            return Response({

                "success": True,

                "message":
                    "Invitación reenviada correctamente.",

                "invitation":
                    invitation

            })

        except Exception as e:

            return Response({

                "success": False,

                "message": str(e)

            }, status=400)


# ==========================================================
# CANCELAR INVITACIÓN
# ==========================================================

class CancelInvitationView(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    def patch(self, request, invitation_id):

        try:

            UserService.cancel_invitation(
                invitation_id
            )

            return Response({

                "success": True,

                "message":
                    "Invitación cancelada correctamente."

            })

        except Exception as e:

            return Response({

                "success": False,

                "message": str(e)

            }, status=400)


# ==========================================================
# ELIMINAR INVITACIÓN
# ==========================================================

class DeleteInvitationView(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    def delete(self, request, invitation_id):

        try:

            UserService.delete_invitation(
                invitation_id
            )

            return Response({

                "success": True,

                "message":
                    "Invitación eliminada correctamente."

            })

        except Exception as e:

            return Response({

                "success": False,

                "message": str(e)

            }, status=400)