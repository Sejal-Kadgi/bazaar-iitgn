# from fastapi import APIRouter, HTTPException
# from pydantic import BaseModel, EmailStr
# from database import users
# import bcrypt
# from datetime import datetime

# router = APIRouter(prefix="/auth", tags=["Auth"])


# class UserSchema(BaseModel):
#     email: EmailStr
#     password: str


# class FirebaseUserSchema(BaseModel):
#     name: str = ""
#     email: EmailStr
#     photo: str = ""


# def hash_password(password: str) -> str:
#     return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# def verify_password(password: str, hashed_password: str) -> bool:
#     return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


# @router.post("/register")
# def register(user: UserSchema):
#     email = user.email.strip().lower()
#     password = user.password.strip()

#     # Allow only IITGN emails
#     if not email.endswith("@iitgn.ac.in"):
#         raise HTTPException(status_code=400, detail="Only IITGN emails are allowed")

#     # Password validation
#     if len(password) < 6:
#         raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

#     if len(password.encode("utf-8")) > 72:
#         raise HTTPException(status_code=400, detail="Password must be 72 characters or fewer")

#     # Check if user exists
#     if users.find_one({"email": email}):
#         raise HTTPException(status_code=400, detail="User already exists")

#     # Hash password
#     hashed_password = hash_password(password)

#     users.insert_one({
#         "email": email,
#         "password": hashed_password,
#         "role": "user",
#         "created_at": datetime.utcnow(),
#         "completed_trades": 0,
#         "reviews_received_count": 0,
#         "average_rating": 0,
#         "valid_reports_count": 0,
#         "karma_score": 10
#     })

#     return {"message": "User registered successfully"}


# @router.post("/login")
# def login(user: UserSchema):
#     email = user.email.strip().lower()
#     password = user.password.strip()

#     db_user = users.find_one({"email": email})

#     if not db_user:
#         raise HTTPException(status_code=401, detail="Invalid credentials")

#     # If account was created with Google
#     if not db_user.get("password"):
#         raise HTTPException(
#             status_code=401,
#             detail="This account uses Google Sign-In. Please continue with Google."
#         )

#     # Verify password
#     if not verify_password(password, db_user["password"]):
#         raise HTTPException(status_code=401, detail="Invalid credentials")

#     return {
#         "message": "Login successful",
#         "user": {
#             "email": db_user["email"],
#             "role": db_user.get("role", "user")
#         }
#     }


# @router.post("/firebase-login")
# def firebase_login(user: FirebaseUserSchema):
#     email = user.email.strip().lower()

#     # Allow only IITGN emails
#     if not email.endswith("@iitgn.ac.in"):
#         raise HTTPException(status_code=400, detail="Only IITGN emails are allowed")

#     existing = users.find_one({"email": email})

#     if not existing:
#         users.insert_one({
#             "name": user.name,
#             "email": email,
#             "photo": user.photo,
#             "role": "user",
#             "password": None,
#             "auth_provider": "google",
#             "created_at": datetime.utcnow(),
#             "completed_trades": 0,
#             "reviews_received_count": 0,
#             "average_rating": 0,
#             "valid_reports_count": 0,
#             "karma_score": 10
#         })

#     return {
#         "message": "Firebase login successful",
#         "user": {
#             "email": email,
#             "role": "user"
#         }
#     }

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from database import users
import bcrypt
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Auth"])

# Use placeholder admin emails (replace later if needed)
ADMIN_EMAILS = [
    "admin1@iitgn.ac.in",
    "admin2@iitgn.ac.in"
]


class UserSchema(BaseModel):
    email: EmailStr
    password: str


class FirebaseUserSchema(BaseModel):
    name: str = ""
    email: EmailStr
    photo: str = ""


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


@router.post("/register")
def register(user: UserSchema):
    email = user.email.strip().lower()
    password = user.password.strip()

    # Only IITGN emails
    if not email.endswith("@iitgn.ac.in"):
        raise HTTPException(status_code=400, detail="Only IITGN emails are allowed")

    # Password validation
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

    if len(password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Password must be 72 characters or fewer")

    existing = users.find_one({"email": email})

    # If user already exists
    if existing:
        # If it is a Google-only account, allow setting password (upgrade to both)
        if existing.get("password") in [None, ""] and existing.get("auth_provider") in ["google", "both"]:
            hashed_password = hash_password(password)

            users.update_one(
                {"email": email},
                {
                    "$set": {
                        "password": hashed_password,
                        "auth_provider": "both",
                        "updated_at": datetime.utcnow()
                    }
                }
            )

            return {
                "message": "Password added successfully. You can now log in with email/password and Google."
            }

        raise HTTPException(status_code=400, detail="User already exists")

    role = "admin" if email in ADMIN_EMAILS else "user"
    hashed_password = hash_password(password)

    users.insert_one({
        "email": email,
        "password": hashed_password,
        "role": role,

        # Auth info
        "auth_provider": "local",
        "google_linked": False,

        # Profile defaults
        "full_name": "",
        "photo": "",
        "phone": "",
        "hostel": "",

        # Metadata
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),

        # Trust / reputation defaults
        "completed_trades": 0,
        "reviews_received_count": 0,
        "average_rating": 0,
        "valid_reports_count": 0,
        "karma_score": 10
    })

    return {"message": "User registered successfully"}


@router.post("/login")
def login(user: UserSchema):
    email = user.email.strip().lower()
    password = user.password.strip()

    db_user = users.find_one({"email": email})

    if not db_user:
        raise HTTPException(status_code=401, detail="No account found. Please sign up first.")

    # If Google-only account
    if not db_user.get("password"):
        raise HTTPException(
            status_code=401,
            detail="This account uses Google Sign-In. Please continue with Google or add a password via signup."
        )

    if not verify_password(password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "message": "Login successful",
        "user": {
            "email": db_user["email"],
            "role": db_user.get("role", "user"),
            "auth_provider": db_user.get("auth_provider", "local")
        }
    }


@router.post("/firebase-login")
def firebase_login(user: FirebaseUserSchema):
    email = user.email.strip().lower()
    name = user.name.strip()
    photo = user.photo.strip()

    # Only IITGN emails
    if not email.endswith("@iitgn.ac.in"):
        raise HTTPException(status_code=400, detail="Only IITGN emails are allowed")

    role = "admin" if email in ADMIN_EMAILS else "user"
    existing = users.find_one({"email": email})

    # If user does not exist -> create Google account
    if not existing:
        users.insert_one({
            "email": email,
            "password": None,
            "role": role,

            # Auth info
            "auth_provider": "google",
            "google_linked": True,

            # Profile
            "full_name": name,
            "photo": photo,
            "phone": "",
            "hostel": "",

            # Metadata
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),

            # Trust / reputation defaults
            "completed_trades": 0,
            "reviews_received_count": 0,
            "average_rating": 0,
            "valid_reports_count": 0,
            "karma_score": 10
        })

        return {
            "message": "Google login successful",
            "user": {
                "email": email,
                "role": role,
                "auth_provider": "google"
            }
        }

    # If user exists and was local-only -> link Google
    update_data = {
        "role": role,
        "updated_at": datetime.utcnow()
    }

    # Update profile fields if provided
    if name and not existing.get("full_name"):
        update_data["full_name"] = name

    if photo:
        update_data["photo"] = photo

    current_provider = existing.get("auth_provider", "local")

    if current_provider == "local":
        update_data["auth_provider"] = "both"
        update_data["google_linked"] = True
    elif current_provider == "google":
        update_data["auth_provider"] = "google"
        update_data["google_linked"] = True
    elif current_provider == "both":
        update_data["auth_provider"] = "both"
        update_data["google_linked"] = True

    users.update_one(
        {"email": email},
        {"$set": update_data}
    )

    updated_user = users.find_one({"email": email})

    return {
        "message": "Google login successful",
        "user": {
            "email": email,
            "role": updated_user.get("role", "user"),
            "auth_provider": updated_user.get("auth_provider", "google")
        }
    }