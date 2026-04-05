from pydantic import BaseModel, EmailStr

class UserSchema(BaseModel):
    email: EmailStr
    password: str
    role: str = "user"
    karma_score: int = 0
    banned: bool = False
    full_name: str = ""
    phone: str = ""
    hostel: str = ""