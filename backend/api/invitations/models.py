from django.db import models
import uuid
from datetime import datetime, timedelta

class Invitation(models.Model):

    ROLE_CHOICES = [
        ("aprendiz", "Aprendiz"),
        ("instructor", "Instructor"),
        ("seguridad", "Seguridad"),
        ("limpieza", "Limpieza"),
        ("cafeteria", "Cafetería"),
        ("coordinador", "Coordinador"),
    ]

    email = models.EmailField()
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)

    code = models.CharField(max_length=6, unique=True)
    is_used = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.code:
            self.code = str(uuid.uuid4().int)[:6]

        if not self.expires_at:
            self.expires_at = datetime.now() + timedelta(minutes=30)

        super().save(*args, **kwargs)