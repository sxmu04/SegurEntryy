from datetime import datetime, timezone
from zoneinfo import ZoneInfo


COLOMBIA_TIME_ZONE = ZoneInfo("America/Bogota")


def utc_now():
    """Devuelve el instante actual como datetime UTC consciente de zona."""
    return datetime.now(timezone.utc)


def utc_now_iso():
    """ISO 8601 inequívoco para persistencia y transporte entre servicios."""
    return utc_now().isoformat()


def colombia_now():
    """Devuelve el instante actual convertido a America/Bogota."""
    return utc_now().astimezone(COLOMBIA_TIME_ZONE)


def colombia_today():
    """Fecha calendario actual en Colombia."""
    return colombia_now().date()


def parse_legacy_utc_datetime(value):
    """
    Convierte timestamps de SegurEntry a datetime consciente de zona.

    Compatibilidad histórica:
    los registros antiguos se guardaban con datetime.utcnow().isoformat(),
    por lo que no contienen Z ni offset aunque representan UTC. Cuando el
    valor es naive se interpreta como UTC para conservar el instante real.
    """
    if value is None or value == "":
        return None

    if isinstance(value, datetime):
        parsed = value
    else:
        text = str(value).strip()

        if not text:
            return None

        if text.endswith("Z") or text.endswith("z"):
            text = f"{text[:-1]}+00:00"

        try:
            parsed = datetime.fromisoformat(text)
        except (TypeError, ValueError):
            return None

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)

    return parsed


def to_colombia_datetime(value):
    parsed = parse_legacy_utc_datetime(value)

    if parsed is None:
        return None

    return parsed.astimezone(COLOMBIA_TIME_ZONE)
