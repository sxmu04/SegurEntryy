from django.core.mail import send_mail
from django.conf import settings

def send_invitation_email(email, code):
    subject = "Código de invitación SegurEntry"
    message = f"Tu código de acceso es: {code}"

    send_mail(
        subject,
        message,
        settings.EMAIL_HOST_USER,
        [email],
        fail_silently=False,
    )