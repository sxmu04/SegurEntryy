from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .services.invitation_service import InvitationService
from mail_service.email_service import send_invitation_email

from config.firebase_config import db
import traceback


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

            invitation = InvitationService.create_invitation(
                email=email,
                role=role
            )

            send_invitation_email(
                email,
                invitation["code"]
            )

            return Response({
                "success": True,
                "message": "Invitación enviada correctamente cambie la contraseña apenas haga el registro para poder acceder a la página.",
                "code": invitation["code"]
            })

        except Exception as e:

            return Response({
                "success": False,
                "message": str(e)
            }, status=500)

class ValidateInvitationView(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):

        email = request.data.get("email")
        code = request.data.get("code")

        if not email:

            return Response({
                "success": False,
                "message": "Debe enviar un correo."
            }, status=400)

        if not code:

            return Response({
                "success": False,
                "message": "Debe enviar un código."
            }, status=400)

        invitation = InvitationService.validate_code(code)

        if not invitation:

            return Response({
                "success": False,
                "message": "Código inválido o expirado."
            }, status=400)

        if invitation["email"].lower() != email.lower():

            return Response({
                "success": False,
                "message": "El correo no coincide con la invitación."
            }, status=400)

        return Response({
            "success": True,
            "message": "Invitación válida.",
            "email": invitation["email"],
            "role": invitation["role"]
        })
    
class ListInvitationsView(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):

        try:

            invitations = []

            docs = db.collection("invitations").stream()

            for doc in docs:

                invitation = doc.to_dict()
                invitation["id"] = doc.id

                invitations.append(invitation)

            return Response({
                "success": True,
                "invitations": invitations
            })

        except Exception as e:

            return Response({
                "success": False,
                "message": str(e)
            }, status=500)

class DeleteInvitationView(APIView):

    authentication_classes = []
    permission_classes = [AllowAny]

    def delete(self, request, invitation_id):

        db.collection("invitations").document(
            invitation_id
        ).delete()

        return Response({
            "success": True
        })