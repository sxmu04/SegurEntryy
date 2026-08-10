from firebase_admin import auth
from config.firebase_config import db

from datetime import datetime


class UserService:

    @staticmethod
    def create_user(data):

        name = data.get("name", "").strip()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        invitation_code = data.get("invitation_code", "").strip()

        if not name:
            raise Exception("El nombre es obligatorio.")

        if not email:
            raise Exception("El correo es obligatorio.")

        if not password:
            raise Exception("La contraseña es obligatoria.")

        if not invitation_code:
            raise Exception("Debe ingresar un código de invitación.")

        # Buscar invitación
        invitation_ref = db.collection("invitations").document(invitation_code)
        invitation_doc = invitation_ref.get()

        if not invitation_doc.exists:
            raise Exception("Código de invitación inválido.")

        invitation = invitation_doc.to_dict()

        if invitation.get("used", False):
            raise Exception("Este código ya fue utilizado.")

        if invitation["email"].lower() != email:
            raise Exception("El correo no coincide con la invitación.")

        # Verificar si ya existe en Firebase Auth
        try:
            auth.get_user_by_email(email)
            raise Exception("Ya existe un usuario con este correo.")
        except auth.UserNotFoundError:
            pass

        # Crear usuario en Firebase Authentication
        firebase_user = auth.create_user(
            email=email,
            password=password,
            display_name=name,
            email_verified=True
        )

        # Asignar rol
        auth.set_custom_user_claims(
            firebase_user.uid,
            {
                "role": invitation["role"]
            }
        )

        # Guardar usuario en Firestore
        user_data = {
            "uid": firebase_user.uid,
            "name": name,
            "email": email,
            "role": invitation["role"],
            "provider": "password",
            "active": True,
            "created_at": datetime.utcnow().isoformat()
        }

        db.collection("users").document(firebase_user.uid).set(user_data)

        # Marcar invitación como utilizada
        invitation_ref.update({
            "used": True,
            "used_at": datetime.utcnow().isoformat()
        })

        return user_data
    
     # ← AGREGAR AQUÍ
    @staticmethod
    def create_superadmin_user(data):

        from django.core.mail import send_mail
        from django.conf import settings
        from uuid import uuid4

        name = data.get("name", "").strip()
        email = data.get("email", "").strip().lower()
        role = data.get("role", "").strip().lower()

        document = data.get("document", "").strip()
        phone = data.get("phone", "").strip()
        address = data.get("address", "").strip()
        photo = data.get("photo", "").strip()

        if not name:
            raise Exception("El nombre es obligatorio.")

        if not email:
            raise Exception("El correo es obligatorio.")

        if not role:
            raise Exception("El rol es obligatorio.")

        # Opcional: limitar los roles que puede crear un administrador
        roles_validos = [
            
            "administrador",
            "vigilante",
            "usuario",
            "aprendiz",
            "instructor"
        ]

        if role not in roles_validos:
            raise Exception("Rol inválido.")

        # Verificar si ya existe
        try:
            auth.get_user_by_email(email)
            raise Exception("Ya existe un usuario con este correo.")
        except auth.UserNotFoundError:
            pass

        # Contraseña temporal
        temp_password = "Admin123456"

        # Crear usuario en Firebase Authentication
        firebase_user = auth.create_user(
            email=email,
            password=temp_password,
            display_name=name,
            email_verified=False
        )

        # Asignar rol
        auth.set_custom_user_claims(
            firebase_user.uid,
            {
                "role": role
            }
        )

        # Información del usuario
        user_data = {
            "uid": firebase_user.uid,
            "name": name,
            "email": email,
            "document": document,
            "phone": phone,
            "address": address,
            "photo": photo,
            "role": role,
            "provider": "password",
            "active": True,
            "created_at": datetime.utcnow().isoformat()
        }

        db.collection("users").document(firebase_user.uid).set(user_data)

        # Generar enlace para crear contraseña
        reset_link = auth.generate_password_reset_link(email)

        # Enviar correo
        try:

            send_mail(
                subject="Invitación a SegurEntry",
                message=f"""
                        Hola {name},

                        Has sido registrado exitosamente en SegurEntry.

                        Rol asignado:
                        {role.upper()}

                        Para activar tu cuenta y crear tu contraseña ingresa al siguiente enlace:

                        {reset_link}

                        Equipo SegurEntry.
                        """,
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[email],
                fail_silently=False
            )

            print(f"✅ Invitación enviada correctamente a {email}")

        except Exception as e:

            print("❌ ERROR ENVIANDO CORREO:", str(e))
            raise Exception(
                f"Usuario creado, pero no fue posible enviar el correo: {str(e)}"
            )

        invitation_code = uuid4().hex[:8].upper()

        invitation_data = {
            "code": invitation_code,
            "uid": firebase_user.uid,
            "name": name,
            "email": email,
            "role": role,
            "used": False,
            "created_at": datetime.utcnow().isoformat(),
            "sent": True,
            "accepted": False
        }

        db.collection("invitations").document(invitation_code).set(invitation_data)

        return user_data

    @staticmethod
    def get_all_users():

        users = []

        docs = db.collection("users").stream()

        for doc in docs:
            users.append(doc.to_dict())

        return users

    @staticmethod
    def get_user(uid):

        doc = db.collection("users").document(uid).get()

        if not doc.exists:
            raise Exception("Usuario no encontrado.")

        return doc.to_dict()

    @staticmethod
    def update_user(uid, data):

        user_ref = db.collection("users").document(uid)

        if not user_ref.get().exists:
            raise Exception("Usuario no encontrado.")

        auth_data = {}

        if "email" in data:
            auth_data["email"] = data["email"].strip().lower()

        if "password" in data:
            auth_data["password"] = data["password"]

        if "name" in data:
            auth_data["display_name"] = data["name"]

        if auth_data:
            auth.update_user(uid, **auth_data)

        firestore_data = {}

        if "name" in data:
            firestore_data["name"] = data["name"]

        if "email" in data:
            firestore_data["email"] = data["email"].strip().lower()

        if "role" in data:

            firestore_data["role"] = data["role"]

            auth.set_custom_user_claims(
                uid,
                {
                    "role": data["role"]
                }
            )
        
        if "document" in data:
            firestore_data["document"] = data["document"]

        if "phone" in data:
            firestore_data["phone"] = data["phone"]

        if "address" in data:
            firestore_data["address"] = data["address"]

        if "photo" in data:
            firestore_data["photo"] = data["photo"]

        if "active" in data:
            firestore_data["active"] = data["active"]

        if firestore_data:
            user_ref.update(firestore_data)

        return user_ref.get().to_dict()

    @staticmethod
    def delete_user(uid):

            auth.delete_user(uid)

            db.collection("users").document(uid).delete()

            return True

    @staticmethod
    def update_profile(uid, data):

        user_ref = db.collection("users").document(uid)

        user = user_ref.get()

        if not user.exists:
            raise Exception("Usuario no encontrado")

        update_data = {
            "name": data.get("name"),
            "email": data.get("email"),
            "phone": data.get("phone"),
            "address": data.get("address"),
            "document": data.get("document"),
            "photo": data.get("photo")
        }

        update_data = {
            k: v
            for k, v in update_data.items()
            if v is not None
        }

        user_ref.update(update_data)

        if "email" in update_data:

            auth.update_user(
                uid,
                email=update_data["email"]
            )

        if "name" in update_data:

            auth.update_user(
                uid,
                display_name=update_data["name"]
            )

        return update_data