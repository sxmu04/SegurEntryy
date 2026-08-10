from datetime import datetime, timedelta
import jwt

from django.conf import settings


class JWTService:

    @staticmethod
    def generate_token(user):

        payload = {
            "uid": user["uid"],
            "email": user["email"],
            "role": user.get("role"),
            "exp": datetime.utcnow() + timedelta(days=1)
        }

        token = jwt.encode(
            payload,
            settings.SECRET_KEY,
            algorithm="HS256"
        )

        return token