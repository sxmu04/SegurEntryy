from firebase_admin import auth


def verify_firebase_token(id_token):

    decoded_token = auth.verify_id_token(id_token)

    return {
        "uid": decoded_token.get("uid"),
        "email": decoded_token.get("email"),
        "name": decoded_token.get("name"),
    }