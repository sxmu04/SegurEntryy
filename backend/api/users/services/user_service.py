from firebase_admin import auth
from config.firebase_config import db

from datetime import datetime, timedelta
from uuid import uuid4

from api.notifications.services.notification_service import NotificationService


class UserService:

    # ==========================================================
    # CREAR USUARIO MEDIANTE CÓDIGO DE INVITACIÓN
    # ==========================================================

    @staticmethod
    def create_user(data):

        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        invitation_code = data.get(
            "invitation_code",
            ""
        ).strip().upper()

        # ==========================================
        # VALIDACIONES
        # ==========================================

        if not email:
            raise Exception(
                "El correo es obligatorio."
            )

        if not password:
            raise Exception(
                "La contraseña es obligatoria."
            )

        if len(password) < 6:
            raise Exception(
                "La contraseña debe tener mínimo 6 caracteres."
            )

        if not invitation_code:
            raise Exception(
                "Debe ingresar un código de invitación."
            )

        # ==========================================
        # BUSCAR INVITACIÓN
        # ==========================================

        invitation_ref = (
            db.collection("invitations")
            .document(invitation_code)
        )

        invitation_doc = invitation_ref.get()

        if not invitation_doc.exists:
            raise Exception(
                "Código de invitación inválido."
            )

        invitation = invitation_doc.to_dict()

        # ==========================================
        # VERIFICAR ESTADO
        # ==========================================

        if invitation.get("used", False):

            raise Exception(
                "Este código de invitación ya fue utilizado."
            )

        if invitation.get("cancelled", False):

            raise Exception(
                "Esta invitación fue cancelada."
            )

        # ==========================================
        # VERIFICAR EXPIRACIÓN
        # ==========================================

        expires_at = invitation.get("expires_at")

        if expires_at:

            try:

                expiration_date = datetime.fromisoformat(
                    expires_at
                )

                if datetime.utcnow() > expiration_date:

                    invitation_ref.update({
                        "status": "expired"
                    })

                    raise Exception(
                        "El código de invitación ha expirado."
                    )

            except ValueError:

                pass

        # ==========================================
        # VERIFICAR CORREO
        # ==========================================

        invitation_email = (
            invitation.get("email", "")
            .strip()
            .lower()
        )

        if invitation_email != email:

            raise Exception(
                "El correo no coincide con la invitación."
            )

        # ==========================================
        # OBTENER UID
        # ==========================================

        uid = invitation.get("uid")

        if not uid:

            raise Exception(
                "La invitación no tiene un usuario asociado."
            )

        # ==========================================
        # DATOS DE LA INVITACIÓN
        # ==========================================

        name = (
            invitation.get("name", "")
            .strip()
        )

        role = (
            invitation.get("role", "")
            .strip()
            .lower()
        )

        if not name:

            raise Exception(
                "La invitación no tiene un nombre asignado."
            )

        if not role:

            raise Exception(
                "La invitación no tiene un rol asignado."
            )

        # ==========================================
        # BUSCAR USUARIO EN FIREBASE AUTH
        # ==========================================

        try:

            firebase_user = auth.get_user(uid)

        except auth.UserNotFoundError:

            raise Exception(
                "El usuario asociado a esta invitación no existe."
            )

        # ==========================================
        # ASIGNAR CONTRASEÑA Y ACTIVAR CUENTA
        # ==========================================

        firebase_user = auth.update_user(
            uid,
            password=password,
            email_verified=True,
            display_name=name,
            disabled=False
        )

        # ==========================================
        # ASIGNAR ROL
        # ==========================================

        auth.set_custom_user_claims(
            uid,
            {
                "role": role
            }
        )

        # ==========================================
        # DATOS DEL USUARIO
        # ==========================================

        user_data = {

            "uid": uid,

            "name": name,

            "email": email,

            "role": role,

            "document": invitation.get(
                "document",
                ""
            ),

            "phone": invitation.get(
                "phone",
                ""
            ),

            "address": invitation.get(
                "address",
                ""
            ),

            "photo": invitation.get(
                "photo",
                ""
            ),

            "provider": "password",

            "active": True,

            "registered_at":
                datetime.utcnow().isoformat()
        }

        # ==========================================
        # GUARDAR / ACTUALIZAR FIRESTORE
        # ==========================================

        user_ref = (
            db.collection("users")
            .document(uid)
        )

        user_doc = user_ref.get()

        if user_doc.exists:

            user_ref.update({

                "name": name,

                "email": email,

                "role": role,

                "document": invitation.get(
                    "document",
                    ""
                ),

                "phone": invitation.get(
                    "phone",
                    ""
                ),

                "address": invitation.get(
                    "address",
                    ""
                ),

                "photo": invitation.get(
                    "photo",
                    ""
                ),

                "provider": "password",

                "active": True,

                "registered_at":
                    datetime.utcnow().isoformat()
            })

        else:

            user_ref.set(user_data)

        # ==========================================
        # MARCAR INVITACIÓN COMO UTILIZADA
        # ==========================================

        invitation_ref.update({

            "used": True,

            "accepted": True,

            "status": "accepted",

            "used_at":
                datetime.utcnow().isoformat(),

            "updated_at":
                datetime.utcnow().isoformat()

        })

        return user_data

    # ==========================================================
    # CREAR USUARIO DESDE SUPER ADMIN
    # ==========================================================

    @staticmethod
    def create_superadmin_user(data):

        from django.core.mail import send_mail
        from django.conf import settings

        name = data.get(
            "name",
            ""
        ).strip()

        email = data.get(
            "email",
            ""
        ).strip().lower()

        role = data.get(
            "role",
            ""
        ).strip().lower()

        document = data.get(
            "document",
            ""
        ).strip()

        phone = data.get(
            "phone",
            ""
        ).strip()

        address = data.get(
            "address",
            ""
        ).strip()

        photo = data.get(
            "photo",
            ""
        ).strip()

        # ==========================================
        # VALIDACIONES
        # ==========================================

        if not name:

            raise Exception(
                "El nombre es obligatorio."
            )

        if not email:

            raise Exception(
                "El correo es obligatorio."
            )

        if not role:

            raise Exception(
                "El rol es obligatorio."
            )

        roles_validos = [

            "administrador",

            "vigilante",

            "usuario",

            "aprendiz",

            "instructor"

        ]

        if role not in roles_validos:

            raise Exception(
                "Rol inválido."
            )

        # ==========================================
        # VERIFICAR SI YA EXISTE EN FIREBASE
        # ==========================================

        try:

            auth.get_user_by_email(email)

            raise Exception(
                "Ya existe un usuario con este correo."
            )

        except auth.UserNotFoundError:

            pass

        # ==========================================
        # GENERAR CÓDIGO
        # ==========================================

        invitation_code = (
            uuid4()
            .hex[:8]
            .upper()
        )

        # ==========================================
        # FECHAS
        # ==========================================

        now = datetime.utcnow()

        expires_at = (
            now + timedelta(minutes=30)
        )

        # ==========================================
        # CREAR USUARIO EN FIREBASE AUTH
        # ==========================================

        try:

            firebase_user = auth.create_user(

                email=email,

                display_name=name,

                email_verified=False,

                disabled=True

            )

        except Exception as e:

            raise Exception(
                f"No fue posible crear el usuario en Firebase: {str(e)}"
            )

        uid = firebase_user.uid

        # ==========================================
        # ASIGNAR ROL
        # ==========================================

        auth.set_custom_user_claims(

            uid,

            {
                "role": role
            }

        )

        # ==========================================
        # DATOS DE LA INVITACIÓN
        # ==========================================

        invitation_data = {

            "code": invitation_code,

            "uid": uid,

            "name": name,

            "email": email,

            "role": role,

            "document": document,

            "phone": phone,

            "address": address,

            "photo": photo,

            "used": False,

            "accepted": False,

            "cancelled": False,

            "sent": False,

            "status": "pending",

            "created_at":
                now.isoformat(),

            "updated_at":
                now.isoformat(),

            "sent_at": None,

            "expires_at":
                expires_at.isoformat(),

            "resend_count": 0

        }

        # ==========================================
        # GUARDAR INVITACIÓN
        # ==========================================

        try:

            db.collection(
                "invitations"
            ).document(
                invitation_code
            ).set(
                invitation_data
            )

        except Exception as e:

            try:

                auth.delete_user(uid)

            except Exception:

                pass

            raise Exception(
                f"No fue posible guardar la invitación: {str(e)}"
            )

        # ==========================================
        # ENVIAR CORREO
        # ==========================================

        try:

            send_mail(

                subject="Invitación a SegurEntry",

                message=f"""
                        Hola {name},

                        Has sido invitado a formar parte de SegurEntry.

                        Tu rol asignado es:

                        {role.upper()}

                        Para completar tu registro debes ingresar al sistema y utilizar el siguiente código de invitación:

                        CÓDIGO DE INVITACIÓN:

                        {invitation_code}

                        Utiliza este código en el formulario "Crear cuenta".

                        Importante:

                        - El código solamente puede utilizarse una vez.
                        - El código tiene una vigencia de 30 minutos.
                        - Debes registrarte utilizando este mismo correo electrónico.
                        - Durante el registro podrás establecer tu propia contraseña.

                        Equipo SegurEntry.
                        """,

                from_email=settings.EMAIL_HOST_USER,

                recipient_list=[
                    email
                ],

                fail_silently=False

            )

        except Exception as e:

            # ==========================================
            # LIMPIAR SI EL CORREO FALLA
            # ==========================================

            db.collection(
                "invitations"
            ).document(
                invitation_code
            ).delete()

            try:

                auth.delete_user(uid)

            except Exception:

                pass

            raise Exception(
                f"No fue posible enviar la invitación: {str(e)}"
            )

        # ==========================================
        # MARCAR COMO ENVIADA
        # ==========================================

        sent_at = datetime.utcnow().isoformat()

        db.collection(
            "invitations"
        ).document(
            invitation_code
        ).update({

            "sent": True,

            "sent_at": sent_at,

            "updated_at":
                sent_at

        })

        # ==========================================================
        # CREAR NOTIFICACIÓN
        # ==========================================================

        NotificationService.create_notification(

            uid=uid,

            title="Nueva invitación creada",

            message=(
                f"Se creó una invitación para {name} "
                f"con el rol {role.upper()}."
            ),

            notification_type="invitation_created",

            data={

                "invitation_code":
                    invitation_code,

                "email":
                    email,

                "role":
                    role,

                "uid":
                    uid

            }

        )

        # ==========================================
        # RESPUESTA
        # ==========================================

        return {

            "success": True,

            "message":
                "Invitación creada y enviada correctamente.",

            "invitation": {

                "code":
                    invitation_code,

                "uid":
                    uid,

                "name":
                    name,

                "email":
                    email,

                "role":
                    role,

                "used":
                    False,

                "accepted":
                    False,

                "status":
                    "pending",

                "sent":
                    True,

                "created_at":
                    now.isoformat(),

                "expires_at":
                    expires_at.isoformat()

            }

        }

    # ==========================================================
    # LISTAR USUARIOS
    # ==========================================================

    @staticmethod
    def get_all_users():

        users = []

        docs = (
            db.collection("users")
            .stream()
        )

        for doc in docs:

            users.append(
                doc.to_dict()
            )

        return users

    # ==========================================================
    # OBTENER USUARIO
    # ==========================================================

    @staticmethod
    def get_user(uid):

        doc = (
            db.collection("users")
            .document(uid)
            .get()
        )

        if not doc.exists:

            raise Exception(
                "Usuario no encontrado."
            )

        return doc.to_dict()

    # ==========================================================
    # ACTUALIZAR USUARIO
    # ==========================================================

    @staticmethod
    def update_user(uid, data):

        user_ref = (
            db.collection("users")
            .document(uid)
        )

        if not user_ref.get().exists:

            raise Exception(
                "Usuario no encontrado."
            )

        auth_data = {}

        if "email" in data:

            auth_data["email"] = (
                data["email"]
                .strip()
                .lower()
            )

        if "password" in data:

            auth_data["password"] = (
                data["password"]
            )

        if "name" in data:

            auth_data["display_name"] = (
                data["name"]
            )

        if auth_data:

            auth.update_user(
                uid,
                **auth_data
            )

        firestore_data = {}

        if "name" in data:

            firestore_data["name"] = (
                data["name"]
            )

        if "email" in data:

            firestore_data["email"] = (
                data["email"]
                .strip()
                .lower()
            )

        if "role" in data:

            firestore_data["role"] = (
                data["role"]
            )

            auth.set_custom_user_claims(

                uid,

                {
                    "role": data["role"]
                }

            )

        if "document" in data:

            firestore_data["document"] = (
                data["document"]
            )

        if "phone" in data:

            firestore_data["phone"] = (
                data["phone"]
            )

        if "address" in data:

            firestore_data["address"] = (
                data["address"]
            )

        if "photo" in data:

            firestore_data["photo"] = (
                data["photo"]
            )

        if "active" in data:

            firestore_data["active"] = (
                data["active"]
            )

        if firestore_data:

            user_ref.update(
                firestore_data
            )

        return (
            user_ref
            .get()
            .to_dict()
        )

    # ==========================================================
    # ELIMINAR USUARIO
    # ==========================================================

    @staticmethod
    def delete_user(uid):

        try:

            auth.delete_user(uid)

        except auth.UserNotFoundError:

            pass

        (
            db.collection("users")
            .document(uid)
            .delete()
        )

        return True

    # ==========================================================
    # ACTUALIZAR PERFIL
    # ==========================================================

    @staticmethod
    def update_profile(uid, data):

        user_ref = (
            db.collection("users")
            .document(uid)
        )

        user = user_ref.get()

        if not user.exists:

            raise Exception(
                "Usuario no encontrado"
            )

        update_data = {

            "name":
                data.get("name"),

            "email":
                data.get("email"),

            "phone":
                data.get("phone"),

            "address":
                data.get("address"),

            "document":
                data.get("document"),

            "photo":
                data.get("photo")

        }

        update_data = {

            k: v

            for k, v in update_data.items()

            if v is not None

        }

        user_ref.update(
            update_data
        )

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

    # ==========================================================
    # COMPLETAR REGISTRO
    # ==========================================================

    @staticmethod
    def complete_registration(data):

        email = (
            data.get("email", "")
            .strip()
            .lower()
        )

        password = data.get(
            "password",
            ""
        )

        invitation_code = (
            data.get(
                "invitation_code",
                ""
            )
            .strip()
            .upper()
        )

        # ==========================================
        # VALIDACIONES
        # ==========================================

        if not email:

            raise Exception(
                "El correo es obligatorio."
            )

        if not password:

            raise Exception(
                "La contraseña es obligatoria."
            )

        if len(password) < 6:

            raise Exception(
                "La contraseña debe tener mínimo 6 caracteres."
            )

        if not invitation_code:

            raise Exception(
                "El código de invitación es obligatorio."
            )

        # ==========================================
        # BUSCAR INVITACIÓN
        # ==========================================

        invitation_ref = (
            db.collection("invitations")
            .document(invitation_code)
        )

        invitation_doc = (
            invitation_ref.get()
        )

        if not invitation_doc.exists:

            raise Exception(
                "Código de invitación inválido."
            )

        invitation = (
            invitation_doc.to_dict()
        )

        # ==========================================
        # VERIFICAR USO
        # ==========================================

        if invitation.get(
            "used",
            False
        ):

            raise Exception(
                "Este código de invitación ya fue utilizado."
            )

        # ==========================================
        # VERIFICAR CANCELACIÓN
        # ==========================================

        if invitation.get(
            "cancelled",
            False
        ):

            raise Exception(
                "Esta invitación fue cancelada."
            )

        # ==========================================
        # VERIFICAR EXPIRACIÓN
        # ==========================================

        expires_at = invitation.get(
            "expires_at"
        )

        if expires_at:

            try:

                expiration_date = (
                    datetime.fromisoformat(
                        expires_at
                    )
                )

                if datetime.utcnow() > expiration_date:

                    invitation_ref.update({

                        "status":
                            "expired",

                        "updated_at":
                            datetime.utcnow().isoformat()

                    })

                    raise Exception(
                        "El código de invitación ha expirado."
                    )

            except ValueError:

                pass

        # ==========================================
        # VERIFICAR CORREO
        # ==========================================

        invitation_email = (
            invitation
            .get("email", "")
            .strip()
            .lower()
        )

        if invitation_email != email:

            raise Exception(
                "El correo no coincide con el correo de la invitación."
            )

        # ==========================================
        # OBTENER UID
        # ==========================================

        uid = invitation.get(
            "uid"
        )

        if not uid:

            raise Exception(
                "La invitación no tiene un usuario asociado."
            )

        # ==========================================
        # VERIFICAR USUARIO FIREBASE
        # ==========================================

        try:

            firebase_user = (
                auth.get_user(uid)
            )

        except auth.UserNotFoundError:

            raise Exception(
                "El usuario asociado a esta invitación no existe."
            )

        # ==========================================
        # ACTIVAR CUENTA
        # ==========================================

        auth.update_user(

            uid,

            password=password,

            email_verified=True,

            disabled=False

        )

        # ==========================================
        # ASIGNAR ROL
        # ==========================================

        role = (
            invitation
            .get("role", "")
            .strip()
            .lower()
        )

        if role:

            auth.set_custom_user_claims(

                uid,

                {
                    "role": role
                }

            )

        # ==========================================
        # ACTUALIZAR FIRESTORE
        # ==========================================

        user_ref = (
            db.collection("users")
            .document(uid)
        )

        user_doc = (
            user_ref.get()
        )

        registered_at = (
            datetime.utcnow()
            .isoformat()
        )

        if user_doc.exists:

            user_ref.update({

                "name":
                    invitation.get(
                        "name",
                        ""
                    ),

                "email":
                    email,

                "role":
                    invitation.get(
                        "role",
                        ""
                    ),

                "document":
                    invitation.get(
                        "document",
                        ""
                    ),

                "phone":
                    invitation.get(
                        "phone",
                        ""
                    ),

                "address":
                    invitation.get(
                        "address",
                        ""
                    ),

                "photo":
                    invitation.get(
                        "photo",
                        ""
                    ),

                "active":
                    True,

                "provider":
                    "password",

                "registered_at":
                    registered_at

            })

        else:

            user_data = {

                "uid":
                    uid,

                "name":
                    invitation.get(
                        "name",
                        ""
                    ),

                "email":
                    email,

                "role":
                    invitation.get(
                        "role",
                        ""
                    ),

                "document":
                    invitation.get(
                        "document",
                        ""
                    ),

                "phone":
                    invitation.get(
                        "phone",
                        ""
                    ),

                "address":
                    invitation.get(
                        "address",
                        ""
                    ),

                "photo":
                    invitation.get(
                        "photo",
                        ""
                    ),

                "provider":
                    "password",

                "active":
                    True,

                "registered_at":
                    registered_at

            }

            user_ref.set(
                user_data
            )

        # ==========================================
        # MARCAR INVITACIÓN
        # ==========================================

        invitation_ref.update({

            "used":
                True,

            "accepted":
                True,

            "status":
                "accepted",

            "used_at":
                registered_at,

            "updated_at":
                registered_at

        })

        # ==========================================
        # DEVOLVER USUARIO
        # ==========================================

        return {

            "uid":
                uid,

            "email":
                email,

            "name":
                invitation.get(
                    "name",
                    ""
                ),

            "role":
                invitation.get(
                    "role",
                    ""
                ),

            "active":
                True

        }

    # ==========================================================
    # LISTAR INVITACIONES
    # ==========================================================

    @staticmethod
    def get_all_invitations():

        invitations = []

        docs = (
            db.collection("invitations")
            .stream()
        )

        now = datetime.utcnow()

        for doc in docs:

            invitation = doc.to_dict()

            invitation["id"] = doc.id

            # ==========================================
            # DETERMINAR ESTADO
            # ==========================================

            if invitation.get(
                "cancelled",
                False
            ):

                invitation["status"] = (
                    "cancelled"
                )

            elif invitation.get(
                "accepted",
                False
            ) or invitation.get(
                "used",
                False
            ):

                invitation["status"] = (
                    "accepted"
                )

            else:

                expires_at = (
                    invitation.get(
                        "expires_at"
                    )
                )

                if expires_at:

                    try:

                        expiration_date = (
                            datetime.fromisoformat(
                                expires_at
                            )
                        )

                        if now > expiration_date:

                            invitation["status"] = (
                                "expired"
                            )

                        else:

                            invitation["status"] = (
                                "pending"
                            )

                    except ValueError:

                        invitation["status"] = (
                            "pending"
                        )

                else:

                    invitation["status"] = (
                        "pending"
                    )

            invitations.append(
                invitation
            )

        # ==========================================
        # ORDENAR MÁS RECIENTES PRIMERO
        # ==========================================

        invitations.sort(

            key=lambda item:
                item.get(
                    "created_at",
                    ""
                ),

            reverse=True

        )

        return invitations

    # ==========================================================
    # OBTENER UNA INVITACIÓN
    # ==========================================================

    @staticmethod
    def get_invitation(invitation_code):

        invitation_code = (
            invitation_code
            .strip()
            .upper()
        )

        doc = (
            db.collection("invitations")
            .document(invitation_code)
            .get()
        )

        if not doc.exists:

            raise Exception(
                "Invitación no encontrada."
            )

        invitation = (
            doc.to_dict()
        )

        invitation["id"] = doc.id

        return invitation

    # ==========================================================
    # MODIFICAR INVITACIÓN
    # ==========================================================

    @staticmethod
    def update_invitation(
        invitation_code,
        data
    ):

        invitation_code = (
            invitation_code
            .strip()
            .upper()
        )

        invitation_ref = (
            db.collection("invitations")
            .document(invitation_code)
        )

        invitation_doc = (
            invitation_ref.get()
        )

        if not invitation_doc.exists:

            raise Exception(
                "Invitación no encontrada."
            )

        invitation = (
            invitation_doc.to_dict()
        )

        # ==========================================
        # NO MODIFICAR INVITACIONES FINALIZADAS
        # ==========================================

        if invitation.get(
            "used",
            False
        ):

            raise Exception(
                "No se puede modificar una invitación aceptada."
            )

        if invitation.get(
            "cancelled",
            False
        ):

            raise Exception(
                "No se puede modificar una invitación cancelada."
            )

        # ==========================================
        # DATOS ACTUALES
        # ==========================================

        current_email = (
            invitation
            .get("email", "")
            .strip()
            .lower()
        )

        current_name = (
            invitation
            .get("name", "")
            .strip()
        )

        current_role = (
            invitation
            .get("role", "")
            .strip()
            .lower()
        )

        new_name = (
            data.get(
                "name",
                current_name
            )
            .strip()
        )

        new_email = (
            data.get(
                "email",
                current_email
            )
            .strip()
            .lower()
        )

        new_role = (
            data.get(
                "role",
                current_role
            )
            .strip()
            .lower()
        )

        roles_validos = [

            "administrador",

            "vigilante",

            "usuario",

            "aprendiz",

            "instructor"

        ]

        if not new_name:

            raise Exception(
                "El nombre es obligatorio."
            )

        if not new_email:

            raise Exception(
                "El correo es obligatorio."
            )

        if new_role not in roles_validos:

            raise Exception(
                "Rol inválido."
            )

        # ==========================================
        # VERIFICAR CAMBIO DE CORREO
        # ==========================================

        uid = invitation.get(
            "uid"
        )

        if new_email != current_email:

            try:

                existing_user = (
                    auth.get_user_by_email(
                        new_email
                    )
                )

                if existing_user.uid != uid:

                    raise Exception(
                        "Ya existe otro usuario con este correo."
                    )

            except auth.UserNotFoundError:

                pass

        # ==========================================
        # ACTUALIZAR FIREBASE AUTH
        # ==========================================

        if uid:

            auth_update = {

                "display_name":
                    new_name

            }

            if new_email != current_email:

                auth_update["email"] = (
                    new_email
                )

            auth.update_user(
                uid,
                **auth_update
            )

            auth.set_custom_user_claims(

                uid,

                {
                    "role":
                        new_role
                }

            )

        # ==========================================
        # ACTUALIZAR INVITACIÓN
        # ==========================================

        update_data = {

            "name":
                new_name,

            "email":
                new_email,

            "role":
                new_role,

            "document":
                data.get(
                    "document",
                    invitation.get(
                        "document",
                        ""
                    )
                ),

            "phone":
                data.get(
                    "phone",
                    invitation.get(
                        "phone",
                        ""
                    )
                ),

            "address":
                data.get(
                    "address",
                    invitation.get(
                        "address",
                        ""
                    )
                ),

            "photo":
                data.get(
                    "photo",
                    invitation.get(
                        "photo",
                        ""
                    )
                ),

            "updated_at":
                datetime.utcnow().isoformat()

        }

        invitation_ref.update(
            update_data
        )

        updated_invitation = (
            invitation_ref.get()
            .to_dict()
        )

        updated_invitation["id"] = (
            invitation_code
        )

        return updated_invitation

    # ==========================================================
    # REENVIAR INVITACIÓN
    # ==========================================================

    @staticmethod
    def resend_invitation(
        invitation_code
    ):

        from django.core.mail import send_mail
        from django.conf import settings

        invitation_code = (
            invitation_code
            .strip()
            .upper()
        )

        invitation_ref = (
            db.collection("invitations")
            .document(invitation_code)
        )

        invitation_doc = (
            invitation_ref.get()
        )

        if not invitation_doc.exists:

            raise Exception(
                "Invitación no encontrada."
            )

        invitation = (
            invitation_doc.to_dict()
        )

        # ==========================================
        # VALIDAR ESTADO
        # ==========================================

        if invitation.get(
            "used",
            False
        ):

            raise Exception(
                "No se puede reenviar una invitación que ya fue aceptada."
            )

        if invitation.get(
            "cancelled",
            False
        ):

            raise Exception(
                "No se puede reenviar una invitación cancelada."
            )

        # ==========================================
        # OBTENER DATOS
        # ==========================================

        email = (
            invitation
            .get("email", "")
            .strip()
            .lower()
        )

        name = (
            invitation
            .get("name", "")
            .strip()
        )

        role = (
            invitation
            .get("role", "")
            .strip()
            .lower()
        )

        if not email:

            raise Exception(
                "La invitación no tiene un correo."
            )

        # ==========================================
        # VERIFICAR / CREAR UID
        # ==========================================

        uid = invitation.get(
            "uid"
        )

        if not uid:

            try:

                firebase_user = (
                    auth.get_user_by_email(
                        email
                    )
                )

                uid = firebase_user.uid

            except auth.UserNotFoundError:

                firebase_user = (
                    auth.create_user(

                        email=email,

                        display_name=name,

                        email_verified=False,

                        disabled=True

                    )
                )

                uid = firebase_user.uid

            auth.set_custom_user_claims(

                uid,

                {
                    "role": role
                }

            )

        # ==========================================
        # GENERAR NUEVA VIGENCIA
        # ==========================================

        now = datetime.utcnow()

        new_expires_at = (
            now + timedelta(minutes=30)
        )

        resend_count = (
            invitation.get(
                "resend_count",
                0
            ) + 1
        )

        # ==========================================
        # ENVIAR CORREO
        # ==========================================

        try:

            send_mail(

                subject="Reenvío de invitación a SegurEntry",

                message=f"""
                        Hola {name},

                        Te reenviamos la invitación para formar parte de SegurEntry.

                        Tu rol asignado es:

                        {role.upper()}

                        CÓDIGO DE INVITACIÓN:

                        {invitation_code}

                        Utiliza este código en el formulario "Crear cuenta".

                        Importante:

                        - El código solamente puede utilizarse una vez.
                        - El código tiene una vigencia de 30 minutos.
                        - Debes utilizar este mismo correo electrónico.
                        - Durante el registro podrás establecer tu propia contraseña.

                        Equipo SegurEntry.
                        """,

                from_email=settings.EMAIL_HOST_USER,

                recipient_list=[
                    email
                ],

                fail_silently=False

            )

        except Exception as e:

            raise Exception(
                f"No fue posible reenviar la invitación: {str(e)}"
            )

        # ==========================================
        # ACTUALIZAR INVITACIÓN
        # ==========================================

        sent_at = datetime.utcnow().isoformat()

        invitation_ref.update({

            "uid":
                uid,

            "sent":
                True,

            "sent_at":
                sent_at,

            "expires_at":
                new_expires_at.isoformat(),

            "resend_count":
                resend_count,

            "status":
                "pending",

            "updated_at":
                sent_at

        })

        updated_invitation = (
            invitation_ref.get()
            .to_dict()
        )

        updated_invitation["id"] = (
            invitation_code
        )

        return updated_invitation

    # ==========================================================
    # CANCELAR INVITACIÓN
    # ==========================================================

    @staticmethod
    def cancel_invitation(
        invitation_code
    ):

        invitation_code = (
            invitation_code
            .strip()
            .upper()
        )

        invitation_ref = (
            db.collection("invitations")
            .document(invitation_code)
        )

        invitation_doc = (
            invitation_ref.get()
        )

        if not invitation_doc.exists:

            raise Exception(
                "Invitación no encontrada."
            )

        invitation = (
            invitation_doc.to_dict()
        )

        if invitation.get(
            "used",
            False
        ):

            raise Exception(
                "No se puede cancelar una invitación aceptada."
            )

        if invitation.get(
            "cancelled",
            False
        ):

            raise Exception(
                "La invitación ya está cancelada."
            )

        # ==========================================
        # DESACTIVAR USUARIO FIREBASE
        # ==========================================

        uid = invitation.get(
            "uid"
        )

        if uid:

            try:

                auth.update_user(

                    uid,

                    disabled=True

                )

            except auth.UserNotFoundError:

                pass

        # ==========================================
        # MARCAR INVITACIÓN
        # ==========================================

        cancelled_at = (
            datetime.utcnow()
            .isoformat()
        )

        invitation_ref.update({

            "cancelled":
                True,

            "status":
                "cancelled",

            "cancelled_at":
                cancelled_at,

            "updated_at":
                cancelled_at

        })

        return True

    # ==========================================================
    # ELIMINAR INVITACIÓN
    # ==========================================================

    @staticmethod
    def delete_invitation(
        invitation_code
    ):

        invitation_code = (
            invitation_code
            .strip()
            .upper()
        )

        invitation_ref = (
            db.collection("invitations")
            .document(invitation_code)
        )

        invitation_doc = (
            invitation_ref.get()
        )

        if not invitation_doc.exists:

            raise Exception(
                "Invitación no encontrada."
            )

        invitation = (
            invitation_doc.to_dict()
        )

        if invitation.get(
            "used",
            False
        ):

            raise Exception(
                "No se puede eliminar una invitación aceptada."
            )

        # ==========================================
        # ELIMINAR USUARIO FIREBASE SI EXISTE
        # ==========================================

        uid = invitation.get(
            "uid"
        )

        if uid:

            try:

                auth.delete_user(
                    uid
                )

            except auth.UserNotFoundError:

                pass

        # ==========================================
        # ELIMINAR INVITACIÓN
        # ==========================================

        invitation_ref.delete()

        return True