from database import users

def is_admin(email: str):
    user = users.find_one({"email": email})
    return user and user.get("role") == "admin"