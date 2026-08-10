from config.firebase_config import db
from api.invitations.utils.code_generator import generate_invitation_code

from datetime import datetime, timedelta


class InvitationService:

    @staticmethod
    def create_invitation(email, role):

        code = generate_invitation_code()

        data = {
            "email": email,
            "role": role,
            "code": code,
            "used": False,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": (
                datetime.utcnow() + timedelta(minutes=30)
            ).isoformat()
        }

        db.collection("invitations").document(code).set(data)

        return data

    @staticmethod
    def validate_code(code):

        doc = db.collection("invitations").document(code).get()

        if not doc.exists:
            return None

        data = doc.to_dict()

        if data.get("used"):
            return None

        return data