from django.core.mail import send_mail
from django.conf import settings

def send_invitation_email(email, code):

    send_mail(
        subject="Código de acceso SegurEntry",
        message = f"""
                    Bienvenido a SegurEntry.

                    Has sido invitado a crear una cuenta.

                    Código de invitación:

                    {code}

                    Utiliza este código durante el registro.

                    No compartas este código con nadie.
                    """
        from_email=settings.EMAIL_HOST_USER,
        recipient_list=[email],
        fail_silently=False
    )