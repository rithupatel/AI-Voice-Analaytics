import logging
import sys
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.auth import get_password_hash, verify_password
from app.config import settings
from app.database import init_db
from app.external_db import init_external_db
from app.routers import recordings

# Setup logging to both stdout and persistent system.log
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(settings.SYSTEM_LOG_PATH, encoding="utf-8")
    ]
)
logger = logging.getLogger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"System logging initialized. Persistent log file: {settings.SYSTEM_LOG_PATH}")
    logger.info("Initializing Database...")
    await init_db()
    logger.info("Database initialized successfully.")
    await init_external_db()
    yield
    logger.info("Shutting down application...")

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recordings.router)

@app.get("/")
async def root():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "docs_url": "/docs"
    }

import random
import smtplib
from email.message import EmailMessage

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User


class RequestCodeReq(BaseModel):
    email: str

class VerifyCodeReq(BaseModel):
    email: str
    code: str

@app.post("/api/v1/auth/request-code")
async def request_code(req: RequestCodeReq, db: AsyncSession = Depends(get_db)):  # noqa: B008
    if not req.email.endswith(f"@{settings.ALLOWED_DOMAIN}"):
        raise HTTPException(status_code=403, detail=f"Email must end with @{settings.ALLOWED_DOMAIN}")
    
    code = f"{random.randint(1000, 9999)}"
    hashed = get_password_hash(code)
    
    result = await db.execute(select(User).where(User.username == req.email))
    user = result.scalars().first()
    
    if user:
        user.hashed_password = hashed
    else:
        user = User(username=req.email, hashed_password=hashed)
        db.add(user)
    
    await db.commit()
    
    try:
        msg = EmailMessage()
        msg['Subject'] = "Your AI Voice Analytics Login Code"
        msg['From'] = settings.GMAIL_ADDRESS
        msg['To'] = req.email
        msg.set_content(f"Hello,\n\nYour login code is: {code}\n\nUse this code to log into the AI Voice Analytics platform.\n\nBest,\nQA Team")
        
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(settings.GMAIL_ADDRESS, settings.GMAIL_APP_PASSWORD.replace(" ", ""))
            server.send_message(msg)
    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to send OTP email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email. Please check server logs.")
        
    return {"message": "Code sent successfully"}

@app.post("/api/v1/auth/verify-code")
async def verify_code(req: VerifyCodeReq, db: AsyncSession = Depends(get_db)):  # noqa: B008
    result = await db.execute(select(User).where(User.username == req.email))
    user = result.scalars().first()
    
    if not user or not verify_password(req.code, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or code",
        )
        
    return {"message": "Login successful", "email": user.username}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
