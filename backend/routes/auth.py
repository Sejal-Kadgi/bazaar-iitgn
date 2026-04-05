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

    # Allow only IITGN emails
    if not email.endswith("@iitgn.ac.in"):
        raise HTTPException(status_code=400, detail="Only IITGN emails are allowed")
    
    role = "admin" if email in ADMIN_EMAILS else "user"

    # Password validation
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

    if len(password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Password must be 72 characters or fewer")

    # Check if user exists
    if users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="User already exists")

    # Hash password
    hashed_password = hash_password(password)

    users.insert_one({
        "email": email,
        "password": hashed_password,
        "role": role,

        # Profile defaults (important for profile page)
        "full_name": "",
        "phone": "",
        "hostel": "",

        # Auth / account metadata
        "created_at": datetime.utcnow(),

        # Future trust metrics
        "completed_trades": 0,
        "reviews_received_count": 0,
        "average_rating": 0,
        "valid_reports_count": 0,

        # Optional backup field (not main source anymore)
        "karma_score": 10
    })

    return {"message": "User registered successfully"}


@router.post("/login")
def login(user: UserSchema):
    email = user.email.strip().lower()
    password = user.password.strip()

    db_user = users.find_one({"email": email})

    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # If account was created with Google
    if not db_user.get("password"):
        raise HTTPException(
            status_code=401,
            detail="This account uses Google Sign-In. Please continue with Google."
        )

    # Verify password
    if not verify_password(password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "message": "Login successful",
        "user": {
            "email": db_user["email"],
            "role": db_user.get("role", "user")
        }
    }


@router.post("/firebase-login")
def firebase_login(user: FirebaseUserSchema):
    email = user.email.strip().lower()

    # Allow only IITGN emails
    if not email.endswith("@iitgn.ac.in"):
        raise HTTPException(status_code=400, detail="Only IITGN emails are allowed")
    
    role = "admin" if email in ADMIN_EMAILS else "user"
    existing = users.find_one({"email": email})

    if not existing:
        users.insert_one({
            "full_name": user.name,   # better than "name" for profile page consistency
            "email": email,
            "photo": user.photo,
            "role": role,   # ✅ FIXED
            "password": None,
            "auth_provider": "google",

            # Profile defaults
            "phone": "",
            "hostel": "",

            # Auth / account metadata
            "created_at": datetime.utcnow(),

            # Future trust metrics
            "completed_trades": 0,
            "reviews_received_count": 0,
            "average_rating": 0,
            "valid_reports_count": 0,

            # Optional backup field
            "karma_score": 10
        })
    else:
        users.update_one(
            {"email": email},
            {"$set": {"role": role}}
        )

    return {
        "message": "Firebase login successful",
        "user": {
            "email": email,
            "role": role   # ✅ FIXED
        }
    }