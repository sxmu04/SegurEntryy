from django.core.management.base import BaseCommand

from config.firebase_config import db


class Command(BaseCommand):

    help = "Crear roles iniciales en Firestore"

    def handle(self, *args, **kwargs):

        roles = [

            {
                "id": "super-admin",
                "name": "Super Administrador",
                "level": 1,
                "active": True
            },

            {
                "id": "coordinador",
                "name": "Coordinador",
                "level": 2,
                "active": True
            },

            {
                "id": "instructor",
                "name": "Instructor",
                "level": 3,
                "active": True
            },

            {
                "id": "guardia",
                "name": "Guardia",
                "level": 4,
                "active": True
            },

            {
                "id": "aprendiz",
                "name": "Aprendiz",
                "level": 5,
                "active": True
            },

            {
                "id": "cafeteria",
                "name": "Cafetería",
                "level": 5,
                "active": True
            },

            {
                "id": "limpieza",
                "name": "Limpieza",
                "level": 5,
                "active": True
            },

            {
                "id": "administrativo",
                "name": "Administrativo",
                "level": 3,
                "active": True
            },

            {
                "id": "visitante",
                "name": "Visitante",
                "level": 6,
                "active": True
            }

        ]

        collection = db.collection("roles")

        for role in roles:

            collection.document(
                role["id"]
            ).set(role)

            self.stdout.write(
                self.style.SUCCESS(
                    f'Rol creado: {role["id"]}'
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Roles creados correctamente."
            )
        )