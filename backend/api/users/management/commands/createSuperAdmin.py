from django.core.management.base import BaseCommand

from firebase_admin import auth
from config.firebase_config import db

from datetime import datetime


class Command(BaseCommand):

    help = "Crear el Super Administrador inicial"

    def handle(self, *args, **kwargs):

        email = "ejuan5427@gmail.com"
        password = "123456789"

        try:

            firebase_user = auth.get_user_by_email(email)

            self.stdout.write(
                self.style.WARNING(
                    "El Super Admin ya existe."
                )
            )

            return

        except auth.UserNotFoundError:
            pass

        firebase_user = auth.create_user(
            email=email,
            password=password,
            display_name="Super Administrador",
            email_verified=True
        )

        auth.set_custom_user_claims(
            firebase_user.uid,
            {
                "role": "super-admin"
            }
        )

        db.collection("users").document(firebase_user.uid).set({

            "uid": firebase_user.uid,

            "name": "Super Administrador",

            "email": email,

            "role": "super-admin",

            "provider": "password",

            "active": True,

            "created_at": datetime.utcnow().isoformat()

        })

        self.stdout.write(
            self.style.SUCCESS(
                "Super Administrador creado correctamente."
            )
        )

        self.stdout.write(
            f"Correo: {email}"
        )

        self.stdout.write(
            f"Contraseña: {password}"
        )