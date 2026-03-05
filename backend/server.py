from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import pyotp
import qrcode
import io
import base64
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from openpyxl import Workbook
from decimal import Decimal
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'financemanager-secret-key-2024')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

app = FastAPI(title="FinanceManager Pro API", version="1.0.0")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MODELS ============

class UserRole:
    ADMIN = "admin"
    ACCOUNTANT = "accountant"
    COLLABORATOR = "collaborator"
    MANAGER = "manager"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = UserRole.COLLABORATOR
    company_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    company_id: Optional[str] = None
    two_factor_enabled: bool = False
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    requires_2fa: bool = False

class TwoFactorSetup(BaseModel):
    secret: str
    qr_code: str
    uri: str

class TwoFactorVerify(BaseModel):
    code: str

class CompanyCreate(BaseModel):
    name: str
    siret: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "France"
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    logo_base64: Optional[str] = None
    vat_number: Optional[str] = None
    capital: Optional[float] = None

class CompanyResponse(BaseModel):
    id: str
    name: str
    siret: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: str
    phone: Optional[str] = None
    email: Optional[str] = None
    logo_base64: Optional[str] = None
    vat_number: Optional[str] = None
    capital: Optional[float] = None
    created_at: str

# Accounting Models
class AccountCreate(BaseModel):
    code: str
    name: str
    account_type: str  # asset, liability, equity, revenue, expense
    parent_code: Optional[str] = None
    description: Optional[str] = None

class AccountResponse(BaseModel):
    id: str
    code: str
    name: str
    account_type: str
    parent_code: Optional[str] = None
    description: Optional[str] = None
    balance: float = 0.0
    company_id: str
    created_at: str

class JournalEntryLine(BaseModel):
    account_code: str
    account_name: str
    debit: float = 0.0
    credit: float = 0.0
    description: Optional[str] = None

class JournalEntryCreate(BaseModel):
    date: str
    reference: str
    description: str
    lines: List[JournalEntryLine]

class JournalEntryResponse(BaseModel):
    id: str
    date: str
    reference: str
    description: str
    lines: List[JournalEntryLine]
    total_debit: float
    total_credit: float
    status: str  # draft, validated, cancelled
    company_id: str
    created_by: str
    created_at: str

# Invoice Models
class InvoiceLineCreate(BaseModel):
    description: str
    quantity: float
    unit_price: float
    vat_rate: float = 20.0
    discount: float = 0.0

class InvoiceLineResponse(BaseModel):
    description: str
    quantity: float
    unit_price: float
    vat_rate: float
    discount: float
    line_total: float
    vat_amount: float

class InvoiceCreate(BaseModel):
    client_name: str
    client_address: Optional[str] = None
    client_email: Optional[EmailStr] = None
    client_siret: Optional[str] = None
    invoice_type: str = "invoice"  # invoice, quote
    due_date: str
    lines: List[InvoiceLineCreate]
    notes: Optional[str] = None
    payment_terms: Optional[str] = "Paiement à 30 jours"

class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    invoice_type: str
    client_name: str
    client_address: Optional[str] = None
    client_email: Optional[str] = None
    client_siret: Optional[str] = None
    date: str
    due_date: str
    lines: List[InvoiceLineResponse]
    subtotal: float
    total_vat: float
    total: float
    status: str  # draft, sent, paid, overdue, cancelled
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    company_id: str
    created_by: str
    created_at: str

# Treasury Models
class BankAccountCreate(BaseModel):
    name: str
    bank_name: str
    iban: str
    bic: Optional[str] = None
    initial_balance: float = 0.0

class BankAccountResponse(BaseModel):
    id: str
    name: str
    bank_name: str
    iban: str
    bic: Optional[str] = None
    balance: float
    company_id: str
    created_at: str

class BankTransactionCreate(BaseModel):
    bank_account_id: str
    date: str
    description: str
    amount: float
    transaction_type: str  # credit, debit
    category: Optional[str] = None
    reference: Optional[str] = None

class BankTransactionResponse(BaseModel):
    id: str
    bank_account_id: str
    date: str
    description: str
    amount: float
    transaction_type: str
    category: Optional[str] = None
    reference: Optional[str] = None
    reconciled: bool = False
    company_id: str
    created_at: str

class CashFlowForecast(BaseModel):
    month: str
    expected_income: float
    expected_expenses: float
    net_flow: float
    cumulative_balance: float

class TreasuryAlert(BaseModel):
    id: str
    type: str  # low_balance, overdue_invoice, large_expense
    message: str
    severity: str  # info, warning, critical
    created_at: str

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str, role: str, company_id: Optional[str] = None) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "company_id": company_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(allowed_roles: List[str]):
    async def role_checker(user: dict = Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "full_name": data.full_name,
        "role": data.role,
        "company_id": data.company_id,
        "two_factor_enabled": False,
        "two_factor_secret": None,
        "created_at": now
    }
    await db.users.insert_one(user_doc)
    
    # Log audit
    await log_audit(user_id, "USER_REGISTERED", {"email": data.email})
    
    token = create_token(user_id, data.email, data.role, data.company_id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=data.email,
            full_name=data.full_name,
            role=data.role,
            company_id=data.company_id,
            two_factor_enabled=False,
            created_at=now
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check 2FA
    if user.get("two_factor_enabled"):
        if not data.totp_code:
            return TokenResponse(
                access_token="",
                user=UserResponse(
                    id=user["id"],
                    email=user["email"],
                    full_name=user["full_name"],
                    role=user["role"],
                    company_id=user.get("company_id"),
                    two_factor_enabled=True,
                    created_at=user["created_at"]
                ),
                requires_2fa=True
            )
        totp = pyotp.TOTP(user["two_factor_secret"])
        if not totp.verify(data.totp_code):
            raise HTTPException(status_code=401, detail="Invalid 2FA code")
    
    await log_audit(user["id"], "USER_LOGIN", {"email": data.email})
    
    token = create_token(user["id"], user["email"], user["role"], user.get("company_id"))
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
            company_id=user.get("company_id"),
            two_factor_enabled=user.get("two_factor_enabled", False),
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=user["role"],
        company_id=user.get("company_id"),
        two_factor_enabled=user.get("two_factor_enabled", False),
        created_at=user["created_at"]
    )

@api_router.post("/auth/2fa/setup", response_model=TwoFactorSetup)
async def setup_2fa(user: dict = Depends(get_current_user)):
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=user["email"], issuer_name="FinanceManager Pro")
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    # Store secret temporarily (not enabled yet)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"two_factor_secret_temp": secret}}
    )
    
    return TwoFactorSetup(secret=secret, qr_code=f"data:image/png;base64,{qr_base64}", uri=uri)

@api_router.post("/auth/2fa/verify")
async def verify_2fa(data: TwoFactorVerify, user: dict = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    secret = user_doc.get("two_factor_secret_temp") or user_doc.get("two_factor_secret")
    
    if not secret:
        raise HTTPException(status_code=400, detail="2FA not set up")
    
    totp = pyotp.TOTP(secret)
    if not totp.verify(data.code):
        raise HTTPException(status_code=400, detail="Invalid code")
    
    # Enable 2FA
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"two_factor_enabled": True, "two_factor_secret": secret}, "$unset": {"two_factor_secret_temp": ""}}
    )
    
    await log_audit(user["id"], "2FA_ENABLED", {})
    return {"message": "2FA enabled successfully"}

@api_router.post("/auth/2fa/disable")
async def disable_2fa(data: TwoFactorVerify, user: dict = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not user_doc.get("two_factor_enabled"):
        raise HTTPException(status_code=400, detail="2FA not enabled")
    
    totp = pyotp.TOTP(user_doc["two_factor_secret"])
    if not totp.verify(data.code):
        raise HTTPException(status_code=400, detail="Invalid code")
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"two_factor_enabled": False}, "$unset": {"two_factor_secret": ""}}
    )
    
    await log_audit(user["id"], "2FA_DISABLED", {})
    return {"message": "2FA disabled"}

# ============ COMPANY ROUTES ============

@api_router.post("/companies", response_model=CompanyResponse)
async def create_company(data: CompanyCreate, user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))):
    company_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    company_doc = {
        "id": company_id,
        **data.model_dump(),
        "created_at": now
    }
    await db.companies.insert_one(company_doc)
    
    # Update user's company_id
    await db.users.update_one({"id": user["id"]}, {"$set": {"company_id": company_id}})
    
    # Create default chart of accounts
    await create_default_chart_of_accounts(company_id)
    
    await log_audit(user["id"], "COMPANY_CREATED", {"company_id": company_id, "name": data.name})
    
    return CompanyResponse(id=company_id, **data.model_dump(), created_at=now)

@api_router.get("/companies", response_model=List[CompanyResponse])
async def get_companies(user: dict = Depends(get_current_user)):
    if user["role"] == UserRole.ADMIN:
        companies = await db.companies.find({}, {"_id": 0}).to_list(1000)
    else:
        companies = await db.companies.find({"id": user.get("company_id")}, {"_id": 0}).to_list(1)
    return [CompanyResponse(**c) for c in companies]

@api_router.get("/companies/{company_id}", response_model=CompanyResponse)
async def get_company(company_id: str, user: dict = Depends(get_current_user)):
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return CompanyResponse(**company)

@api_router.put("/companies/{company_id}", response_model=CompanyResponse)
async def update_company(company_id: str, data: CompanyCreate, user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))):
    result = await db.companies.update_one(
        {"id": company_id},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    await log_audit(user["id"], "COMPANY_UPDATED", {"company_id": company_id})
    return CompanyResponse(**company)

# ============ CHART OF ACCOUNTS ROUTES ============

async def create_default_chart_of_accounts(company_id: str):
    """Create French PCG (Plan Comptable Général) default accounts"""
    default_accounts = [
        # Class 1 - Capital
        {"code": "10", "name": "Capital et réserves", "account_type": "equity"},
        {"code": "101", "name": "Capital social", "account_type": "equity", "parent_code": "10"},
        {"code": "106", "name": "Réserves", "account_type": "equity", "parent_code": "10"},
        {"code": "12", "name": "Résultat de l'exercice", "account_type": "equity"},
        # Class 2 - Immobilisations
        {"code": "20", "name": "Immobilisations incorporelles", "account_type": "asset"},
        {"code": "21", "name": "Immobilisations corporelles", "account_type": "asset"},
        {"code": "218", "name": "Autres immobilisations corporelles", "account_type": "asset", "parent_code": "21"},
        # Class 3 - Stocks
        {"code": "31", "name": "Matières premières", "account_type": "asset"},
        {"code": "37", "name": "Stocks de marchandises", "account_type": "asset"},
        # Class 4 - Tiers
        {"code": "40", "name": "Fournisseurs et comptes rattachés", "account_type": "liability"},
        {"code": "401", "name": "Fournisseurs", "account_type": "liability", "parent_code": "40"},
        {"code": "41", "name": "Clients et comptes rattachés", "account_type": "asset"},
        {"code": "411", "name": "Clients", "account_type": "asset", "parent_code": "41"},
        {"code": "44", "name": "État et autres collectivités publiques", "account_type": "liability"},
        {"code": "4456", "name": "TVA déductible", "account_type": "asset", "parent_code": "44"},
        {"code": "4457", "name": "TVA collectée", "account_type": "liability", "parent_code": "44"},
        # Class 5 - Financier
        {"code": "51", "name": "Banques", "account_type": "asset"},
        {"code": "512", "name": "Banque compte courant", "account_type": "asset", "parent_code": "51"},
        {"code": "53", "name": "Caisse", "account_type": "asset"},
        # Class 6 - Charges
        {"code": "60", "name": "Achats", "account_type": "expense"},
        {"code": "606", "name": "Achats non stockés", "account_type": "expense", "parent_code": "60"},
        {"code": "607", "name": "Achats de marchandises", "account_type": "expense", "parent_code": "60"},
        {"code": "61", "name": "Services extérieurs", "account_type": "expense"},
        {"code": "613", "name": "Locations", "account_type": "expense", "parent_code": "61"},
        {"code": "62", "name": "Autres services extérieurs", "account_type": "expense"},
        {"code": "626", "name": "Frais postaux et télécommunications", "account_type": "expense", "parent_code": "62"},
        {"code": "63", "name": "Impôts et taxes", "account_type": "expense"},
        {"code": "64", "name": "Charges de personnel", "account_type": "expense"},
        {"code": "641", "name": "Rémunérations du personnel", "account_type": "expense", "parent_code": "64"},
        {"code": "645", "name": "Charges sociales", "account_type": "expense", "parent_code": "64"},
        {"code": "66", "name": "Charges financières", "account_type": "expense"},
        {"code": "68", "name": "Dotations aux amortissements", "account_type": "expense"},
        # Class 7 - Produits
        {"code": "70", "name": "Ventes de produits et services", "account_type": "revenue"},
        {"code": "701", "name": "Ventes de produits finis", "account_type": "revenue", "parent_code": "70"},
        {"code": "706", "name": "Prestations de services", "account_type": "revenue", "parent_code": "70"},
        {"code": "707", "name": "Ventes de marchandises", "account_type": "revenue", "parent_code": "70"},
        {"code": "74", "name": "Subventions d'exploitation", "account_type": "revenue"},
        {"code": "76", "name": "Produits financiers", "account_type": "revenue"},
        {"code": "77", "name": "Produits exceptionnels", "account_type": "revenue"},
    ]
    
    now = datetime.now(timezone.utc).isoformat()
    for acc in default_accounts:
        acc_doc = {
            "id": str(uuid.uuid4()),
            **acc,
            "balance": 0.0,
            "company_id": company_id,
            "created_at": now
        }
        await db.accounts.insert_one(acc_doc)

@api_router.get("/accounts", response_model=List[AccountResponse])
async def get_accounts(user: dict = Depends(get_current_user)):
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated")
    
    accounts = await db.accounts.find({"company_id": company_id}, {"_id": 0}).sort("code", 1).to_list(1000)
    return [AccountResponse(**a) for a in accounts]

@api_router.post("/accounts", response_model=AccountResponse)
async def create_account(data: AccountCreate, user: dict = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.MANAGER]))):
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated")
    
    # Check if code exists
    existing = await db.accounts.find_one({"company_id": company_id, "code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Account code already exists")
    
    account_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    account_doc = {
        "id": account_id,
        **data.model_dump(),
        "balance": 0.0,
        "company_id": company_id,
        "created_at": now
    }
    await db.accounts.insert_one(account_doc)
    
    await log_audit(user["id"], "ACCOUNT_CREATED", {"account_code": data.code})
    return AccountResponse(**account_doc)

@api_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str, user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))):
    result = await db.accounts.delete_one({"id": account_id, "company_id": user.get("company_id")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    
    await log_audit(user["id"], "ACCOUNT_DELETED", {"account_id": account_id})
    return {"message": "Account deleted"}

# ============ JOURNAL ENTRIES ROUTES ============

@api_router.get("/journal-entries", response_model=List[JournalEntryResponse])
async def get_journal_entries(
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated")
    
    query = {"company_id": company_id}
    if status:
        query["status"] = status
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        query["date"] = {**query.get("date", {}), "$lte": end_date}
    
    entries = await db.journal_entries.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return [JournalEntryResponse(**e) for e in entries]

@api_router.post("/journal-entries", response_model=JournalEntryResponse)
async def create_journal_entry(data: JournalEntryCreate, user: dict = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.MANAGER]))):
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated")
    
    # Validate balanced entry
    total_debit = sum(line.debit for line in data.lines)
    total_credit = sum(line.credit for line in data.lines)
    
    if abs(total_debit - total_credit) > 0.01:
        raise HTTPException(status_code=400, detail="Journal entry must be balanced (debit = credit)")
    
    entry_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    entry_doc = {
        "id": entry_id,
        **data.model_dump(),
        "total_debit": total_debit,
        "total_credit": total_credit,
        "status": "draft",
        "company_id": company_id,
        "created_by": user["id"],
        "created_at": now
    }
    await db.journal_entries.insert_one(entry_doc)
    
    await log_audit(user["id"], "JOURNAL_ENTRY_CREATED", {"entry_id": entry_id, "reference": data.reference})
    return JournalEntryResponse(**entry_doc)

@api_router.put("/journal-entries/{entry_id}/validate")
async def validate_journal_entry(entry_id: str, user: dict = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.MANAGER]))):
    company_id = user.get("company_id")
    
    entry = await db.journal_entries.find_one({"id": entry_id, "company_id": company_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    if entry["status"] != "draft":
        raise HTTPException(status_code=400, detail="Only draft entries can be validated")
    
    # Update account balances
    for line in entry["lines"]:
        account = await db.accounts.find_one({"company_id": company_id, "code": line["account_code"]})
        if account:
            balance_change = line["debit"] - line["credit"]
            if account["account_type"] in ["liability", "equity", "revenue"]:
                balance_change = -balance_change
            await db.accounts.update_one(
                {"id": account["id"]},
                {"$inc": {"balance": balance_change}}
            )
    
    await db.journal_entries.update_one({"id": entry_id}, {"$set": {"status": "validated"}})
    
    await log_audit(user["id"], "JOURNAL_ENTRY_VALIDATED", {"entry_id": entry_id})
    return {"message": "Entry validated"}

@api_router.delete("/journal-entries/{entry_id}")
async def delete_journal_entry(entry_id: str, user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))):
    entry = await db.journal_entries.find_one({"id": entry_id, "company_id": user.get("company_id")}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    if entry["status"] == "validated":
        raise HTTPException(status_code=400, detail="Cannot delete validated entries")
    
    await db.journal_entries.delete_one({"id": entry_id})
    await log_audit(user["id"], "JOURNAL_ENTRY_DELETED", {"entry_id": entry_id})
    return {"message": "Entry deleted"}

# ============ INVOICE ROUTES ============

async def get_next_invoice_number(company_id: str, invoice_type: str) -> str:
    prefix = "FAC" if invoice_type == "invoice" else "DEV"
    year = datetime.now().year
    
    # Find last invoice number
    last = await db.invoices.find_one(
        {"company_id": company_id, "invoice_type": invoice_type, "invoice_number": {"$regex": f"^{prefix}-{year}"}},
        {"_id": 0},
        sort=[("invoice_number", -1)]
    )
    
    if last:
        last_num = int(last["invoice_number"].split("-")[-1])
        return f"{prefix}-{year}-{str(last_num + 1).zfill(5)}"
    return f"{prefix}-{year}-00001"

@api_router.get("/invoices", response_model=List[InvoiceResponse])
async def get_invoices(
    invoice_type: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated")
    
    query = {"company_id": company_id}
    if invoice_type:
        query["invoice_type"] = invoice_type
    if status:
        query["status"] = status
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return [InvoiceResponse(**inv) for inv in invoices]

@api_router.post("/invoices", response_model=InvoiceResponse)
async def create_invoice(data: InvoiceCreate, user: dict = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.MANAGER]))):
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated")
    
    invoice_id = str(uuid.uuid4())
    invoice_number = await get_next_invoice_number(company_id, data.invoice_type)
    now = datetime.now(timezone.utc)
    
    # Calculate line totals
    lines_with_totals = []
    subtotal = 0.0
    total_vat = 0.0
    
    for line in data.lines:
        line_subtotal = line.quantity * line.unit_price * (1 - line.discount / 100)
        vat_amount = line_subtotal * line.vat_rate / 100
        lines_with_totals.append({
            **line.model_dump(),
            "line_total": round(line_subtotal, 2),
            "vat_amount": round(vat_amount, 2)
        })
        subtotal += line_subtotal
        total_vat += vat_amount
    
    invoice_doc = {
        "id": invoice_id,
        "invoice_number": invoice_number,
        "invoice_type": data.invoice_type,
        "client_name": data.client_name,
        "client_address": data.client_address,
        "client_email": data.client_email,
        "client_siret": data.client_siret,
        "date": now.strftime("%Y-%m-%d"),
        "due_date": data.due_date,
        "lines": lines_with_totals,
        "subtotal": round(subtotal, 2),
        "total_vat": round(total_vat, 2),
        "total": round(subtotal + total_vat, 2),
        "status": "draft",
        "notes": data.notes,
        "payment_terms": data.payment_terms,
        "company_id": company_id,
        "created_by": user["id"],
        "created_at": now.isoformat()
    }
    await db.invoices.insert_one(invoice_doc)
    
    await log_audit(user["id"], "INVOICE_CREATED", {"invoice_number": invoice_number, "type": data.invoice_type})
    return InvoiceResponse(**invoice_doc)

@api_router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id, "company_id": user.get("company_id")}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return InvoiceResponse(**invoice)

@api_router.put("/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, status: str, user: dict = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.MANAGER]))):
    valid_statuses = ["draft", "sent", "paid", "overdue", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.invoices.update_one(
        {"id": invoice_id, "company_id": user.get("company_id")},
        {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    await log_audit(user["id"], "INVOICE_STATUS_UPDATED", {"invoice_id": invoice_id, "status": status})
    return {"message": f"Invoice status updated to {status}"}

@api_router.get("/invoices/{invoice_id}/pdf")
async def get_invoice_pdf(invoice_id: str, user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id, "company_id": user.get("company_id")}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    company = await db.companies.find_one({"id": user.get("company_id")}, {"_id": 0})
    
    # Generate PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=24, spaceAfter=30)
    
    elements = []
    
    # Header
    title = "FACTURE" if invoice["invoice_type"] == "invoice" else "DEVIS"
    elements.append(Paragraph(f"<b>{title}</b>", title_style))
    elements.append(Paragraph(f"N° {invoice['invoice_number']}", styles['Normal']))
    elements.append(Paragraph(f"Date: {invoice['date']}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Company info
    if company:
        elements.append(Paragraph(f"<b>{company['name']}</b>", styles['Heading2']))
        if company.get('address'):
            elements.append(Paragraph(company['address'], styles['Normal']))
        if company.get('city'):
            elements.append(Paragraph(f"{company.get('postal_code', '')} {company['city']}", styles['Normal']))
        if company.get('siret'):
            elements.append(Paragraph(f"SIRET: {company['siret']}", styles['Normal']))
        if company.get('vat_number'):
            elements.append(Paragraph(f"N° TVA: {company['vat_number']}", styles['Normal']))
    
    elements.append(Spacer(1, 20))
    
    # Client info
    elements.append(Paragraph("<b>Client:</b>", styles['Heading3']))
    elements.append(Paragraph(invoice['client_name'], styles['Normal']))
    if invoice.get('client_address'):
        elements.append(Paragraph(invoice['client_address'], styles['Normal']))
    if invoice.get('client_siret'):
        elements.append(Paragraph(f"SIRET: {invoice['client_siret']}", styles['Normal']))
    
    elements.append(Spacer(1, 30))
    
    # Lines table
    table_data = [['Description', 'Qté', 'Prix unit.', 'TVA', 'Total HT']]
    for line in invoice['lines']:
        table_data.append([
            line['description'],
            str(line['quantity']),
            f"{line['unit_price']:.2f} €",
            f"{line['vat_rate']}%",
            f"{line['line_total']:.2f} €"
        ])
    
    table = Table(table_data, colWidths=[8*cm, 2*cm, 2.5*cm, 2*cm, 2.5*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    elements.append(table)
    
    elements.append(Spacer(1, 20))
    
    # Totals
    elements.append(Paragraph(f"<b>Sous-total HT:</b> {invoice['subtotal']:.2f} €", styles['Normal']))
    elements.append(Paragraph(f"<b>TVA:</b> {invoice['total_vat']:.2f} €", styles['Normal']))
    elements.append(Paragraph(f"<b>Total TTC:</b> {invoice['total']:.2f} €", styles['Heading2']))
    
    elements.append(Spacer(1, 20))
    
    # Payment terms
    if invoice.get('payment_terms'):
        elements.append(Paragraph(f"<b>Conditions:</b> {invoice['payment_terms']}", styles['Normal']))
    elements.append(Paragraph(f"<b>Échéance:</b> {invoice['due_date']}", styles['Normal']))
    
    if invoice.get('notes'):
        elements.append(Spacer(1, 10))
        elements.append(Paragraph(f"<i>{invoice['notes']}</i>", styles['Normal']))
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"{invoice['invoice_number']}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.post("/invoices/{quote_id}/convert")
async def convert_quote_to_invoice(quote_id: str, user: dict = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.MANAGER]))):
    """Convert a quote to an invoice"""
    quote = await db.invoices.find_one({"id": quote_id, "invoice_type": "quote", "company_id": user.get("company_id")}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    invoice_id = str(uuid.uuid4())
    invoice_number = await get_next_invoice_number(user.get("company_id"), "invoice")
    now = datetime.now(timezone.utc)
    
    invoice_doc = {
        **quote,
        "id": invoice_id,
        "invoice_number": invoice_number,
        "invoice_type": "invoice",
        "date": now.strftime("%Y-%m-%d"),
        "status": "draft",
        "created_at": now.isoformat(),
        "converted_from": quote_id
    }
    await db.invoices.insert_one(invoice_doc)
    
    await log_audit(user["id"], "QUOTE_CONVERTED", {"quote_id": quote_id, "invoice_id": invoice_id})
    return InvoiceResponse(**invoice_doc)

# ============ BANK ACCOUNT ROUTES ============

@api_router.get("/bank-accounts", response_model=List[BankAccountResponse])
async def get_bank_accounts(user: dict = Depends(get_current_user)):
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated")
    
    accounts = await db.bank_accounts.find({"company_id": company_id}, {"_id": 0}).to_list(100)
    return [BankAccountResponse(**a) for a in accounts]

@api_router.post("/bank-accounts", response_model=BankAccountResponse)
async def create_bank_account(data: BankAccountCreate, user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))):
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated")
    
    account_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    account_doc = {
        "id": account_id,
        **data.model_dump(),
        "balance": data.initial_balance,
        "company_id": company_id,
        "created_at": now
    }
    await db.bank_accounts.insert_one(account_doc)
    
    await log_audit(user["id"], "BANK_ACCOUNT_CREATED", {"account_id": account_id, "name": data.name})
    return BankAccountResponse(**account_doc)

@api_router.delete("/bank-accounts/{account_id}")
async def delete_bank_account(account_id: str, user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))):
    result = await db.bank_accounts.delete_one({"id": account_id, "company_id": user.get("company_id")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    await log_audit(user["id"], "BANK_ACCOUNT_DELETED", {"account_id": account_id})
    return {"message": "Bank account deleted"}

# ============ BANK TRANSACTIONS ROUTES ============

@api_router.get("/bank-transactions", response_model=List[BankTransactionResponse])
async def get_bank_transactions(
    bank_account_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated")
    
    query = {"company_id": company_id}
    if bank_account_id:
        query["bank_account_id"] = bank_account_id
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        query["date"] = {**query.get("date", {}), "$lte": end_date}
    
    transactions = await db.bank_transactions.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return [BankTransactionResponse(**t) for t in transactions]

@api_router.post("/bank-transactions", response_model=BankTransactionResponse)
async def create_bank_transaction(data: BankTransactionCreate, user: dict = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.MANAGER]))):
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated")
    
    # Verify bank account exists
    bank_account = await db.bank_accounts.find_one({"id": data.bank_account_id, "company_id": company_id})
    if not bank_account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    transaction_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    transaction_doc = {
        "id": transaction_id,
        **data.model_dump(),
        "reconciled": False,
        "company_id": company_id,
        "created_at": now
    }
    await db.bank_transactions.insert_one(transaction_doc)
    
    # Update bank account balance
    balance_change = data.amount if data.transaction_type == "credit" else -data.amount
    await db.bank_accounts.update_one(
        {"id": data.bank_account_id},
        {"$inc": {"balance": balance_change}}
    )
    
    await log_audit(user["id"], "BANK_TRANSACTION_CREATED", {"transaction_id": transaction_id})
    return BankTransactionResponse(**transaction_doc)

@api_router.put("/bank-transactions/{transaction_id}/reconcile")
async def reconcile_transaction(transaction_id: str, user: dict = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.MANAGER]))):
    result = await db.bank_transactions.update_one(
        {"id": transaction_id, "company_id": user.get("company_id")},
        {"$set": {"reconciled": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    await log_audit(user["id"], "TRANSACTION_RECONCILED", {"transaction_id": transaction_id})
    return {"message": "Transaction reconciled"}

@api_router.post("/bank-transactions/import")
async def import_transactions(file: UploadFile = File(...), bank_account_id: str = Query(...), user: dict = Depends(require_role([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.MANAGER]))):
    """Import bank transactions from CSV file"""
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated")
    
    content = await file.read()
    lines = content.decode('utf-8').strip().split('\n')
    
    imported = 0
    for line in lines[1:]:  # Skip header
        parts = line.split(',')
        if len(parts) >= 3:
            try:
                transaction_doc = {
                    "id": str(uuid.uuid4()),
                    "bank_account_id": bank_account_id,
                    "date": parts[0].strip(),
                    "description": parts[1].strip(),
                    "amount": abs(float(parts[2].strip())),
                    "transaction_type": "credit" if float(parts[2].strip()) > 0 else "debit",
                    "category": parts[3].strip() if len(parts) > 3 else None,
                    "reference": parts[4].strip() if len(parts) > 4 else None,
                    "reconciled": False,
                    "company_id": company_id,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.bank_transactions.insert_one(transaction_doc)
                
                balance_change = transaction_doc["amount"] if transaction_doc["transaction_type"] == "credit" else -transaction_doc["amount"]
                await db.bank_accounts.update_one(
                    {"id": bank_account_id},
                    {"$inc": {"balance": balance_change}}
                )
                imported += 1
            except Exception as e:
                logger.warning(f"Failed to import line: {line}, error: {e}")
    
    await log_audit(user["id"], "TRANSACTIONS_IMPORTED", {"count": imported, "bank_account_id": bank_account_id})
    return {"message": f"Imported {imported} transactions"}

# ============ TREASURY ROUTES ============

@api_router.get("/treasury/cash-flow-forecast", response_model=List[CashFlowForecast])
async def get_cash_flow_forecast(user: dict = Depends(get_current_user)):
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated")
    
    # Get current balance
    bank_accounts = await db.bank_accounts.find({"company_id": company_id}, {"_id": 0}).to_list(100)
    current_balance = sum(a["balance"] for a in bank_accounts)
    
    # Get expected income (unpaid invoices)
    invoices = await db.invoices.find(
        {"company_id": company_id, "invoice_type": "invoice", "status": {"$in": ["sent", "draft"]}},
        {"_id": 0}
    ).to_list(1000)
    
    # Generate 6-month forecast
    forecasts = []
    cumulative = current_balance
    
    for i in range(6):
        month = (datetime.now() + timedelta(days=30*i)).strftime("%Y-%m")
        
        # Expected income from due invoices this month
        expected_income = sum(
            inv["total"] for inv in invoices
            if inv["due_date"].startswith(month)
        )
        
        # Estimated expenses (based on historical average)
        transactions = await db.bank_transactions.find(
            {"company_id": company_id, "transaction_type": "debit"},
            {"_id": 0}
        ).to_list(100)
        avg_expenses = sum(t["amount"] for t in transactions) / max(len(transactions), 1) * 20  # Estimate
        
        net_flow = expected_income - avg_expenses
        cumulative += net_flow
        
        forecasts.append(CashFlowForecast(
            month=month,
            expected_income=round(expected_income, 2),
            expected_expenses=round(avg_expenses, 2),
            net_flow=round(net_flow, 2),
            cumulative_balance=round(cumulative, 2)
        ))
    
    return forecasts

@api_router.get("/treasury/alerts", response_model=List[TreasuryAlert])
async def get_treasury_alerts(user: dict = Depends(get_current_user)):
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated")
    
    alerts = []
    now = datetime.now(timezone.utc)
    
    # Check low balance
    bank_accounts = await db.bank_accounts.find({"company_id": company_id}, {"_id": 0}).to_list(100)
    for account in bank_accounts:
        if account["balance"] < 1000:
            alerts.append(TreasuryAlert(
                id=str(uuid.uuid4()),
                type="low_balance",
                message=f"Solde faible sur {account['name']}: {account['balance']:.2f} €",
                severity="warning" if account["balance"] > 0 else "critical",
                created_at=now.isoformat()
            ))
    
    # Check overdue invoices
    invoices = await db.invoices.find(
        {"company_id": company_id, "invoice_type": "invoice", "status": "sent"},
        {"_id": 0}
    ).to_list(1000)
    
    for inv in invoices:
        due_date = datetime.strptime(inv["due_date"], "%Y-%m-%d")
        if due_date < now.replace(tzinfo=None):
            days_overdue = (now.replace(tzinfo=None) - due_date).days
            alerts.append(TreasuryAlert(
                id=str(uuid.uuid4()),
                type="overdue_invoice",
                message=f"Facture {inv['invoice_number']} en retard de {days_overdue} jours ({inv['total']:.2f} €)",
                severity="critical" if days_overdue > 30 else "warning",
                created_at=now.isoformat()
            ))
    
    return alerts

# ============ REPORTING ROUTES ============

@api_router.get("/reports/balance-sheet")
async def get_balance_sheet(user: dict = Depends(get_current_user)):
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated")
    
    accounts = await db.accounts.find({"company_id": company_id}, {"_id": 0}).to_list(1000)
    
    assets = [a for a in accounts if a["account_type"] == "asset"]
    liabilities = [a for a in accounts if a["account_type"] == "liability"]
    equity = [a for a in accounts if a["account_type"] == "equity"]
    
    total_assets = sum(a["balance"] for a in assets)
    total_liabilities = sum(a["balance"] for a in liabilities)
    total_equity = sum(a["balance"] for a in equity)
    
    return {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "assets": {"accounts": assets, "total": round(total_assets, 2)},
        "liabilities": {"accounts": liabilities, "total": round(total_liabilities, 2)},
        "equity": {"accounts": equity, "total": round(total_equity, 2)},
        "balance_check": round(total_assets - total_liabilities - total_equity, 2)
    }

@api_router.get("/reports/income-statement")
async def get_income_statement(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated")
    
    accounts = await db.accounts.find({"company_id": company_id}, {"_id": 0}).to_list(1000)
    
    revenue = [a for a in accounts if a["account_type"] == "revenue"]
    expenses = [a for a in accounts if a["account_type"] == "expense"]
    
    total_revenue = sum(a["balance"] for a in revenue)
    total_expenses = sum(a["balance"] for a in expenses)
    net_income = total_revenue - total_expenses
    
    return {
        "period": {"start": start_date or "Beginning", "end": end_date or datetime.now().strftime("%Y-%m-%d")},
        "revenue": {"accounts": revenue, "total": round(total_revenue, 2)},
        "expenses": {"accounts": expenses, "total": round(total_expenses, 2)},
        "net_income": round(net_income, 2)
    }

@api_router.get("/reports/dashboard-stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated")
    
    # Current month
    now = datetime.now()
    month_start = now.replace(day=1).strftime("%Y-%m-%d")
    
    # Bank balance
    bank_accounts = await db.bank_accounts.find({"company_id": company_id}, {"_id": 0}).to_list(100)
    total_balance = sum(a["balance"] for a in bank_accounts)
    
    # Invoices stats
    invoices = await db.invoices.find({"company_id": company_id, "invoice_type": "invoice"}, {"_id": 0}).to_list(1000)
    total_invoiced = sum(inv["total"] for inv in invoices)
    paid_invoices = sum(inv["total"] for inv in invoices if inv["status"] == "paid")
    pending_invoices = sum(inv["total"] for inv in invoices if inv["status"] in ["sent", "draft"])
    overdue_invoices = sum(inv["total"] for inv in invoices if inv["status"] == "overdue")
    
    # Monthly revenue
    monthly_invoices = [inv for inv in invoices if inv["date"] >= month_start]
    monthly_revenue = sum(inv["total"] for inv in monthly_invoices)
    
    # Expenses this month
    transactions = await db.bank_transactions.find(
        {"company_id": company_id, "transaction_type": "debit", "date": {"$gte": month_start}},
        {"_id": 0}
    ).to_list(1000)
    monthly_expenses = sum(t["amount"] for t in transactions)
    
    # Revenue by month (last 6 months)
    revenue_by_month = []
    for i in range(5, -1, -1):
        month = (now - timedelta(days=30*i)).strftime("%Y-%m")
        month_invoices = [inv for inv in invoices if inv["date"].startswith(month) and inv["status"] == "paid"]
        revenue_by_month.append({
            "month": month,
            "revenue": sum(inv["total"] for inv in month_invoices)
        })
    
    return {
        "total_balance": round(total_balance, 2),
        "total_invoiced": round(total_invoiced, 2),
        "paid_invoices": round(paid_invoices, 2),
        "pending_invoices": round(pending_invoices, 2),
        "overdue_invoices": round(overdue_invoices, 2),
        "monthly_revenue": round(monthly_revenue, 2),
        "monthly_expenses": round(monthly_expenses, 2),
        "revenue_by_month": revenue_by_month,
        "invoices_count": len(invoices),
        "bank_accounts_count": len(bank_accounts)
    }

@api_router.get("/reports/export/excel")
async def export_to_excel(report_type: str = "balance-sheet", user: dict = Depends(get_current_user)):
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="No company associated")
    
    wb = Workbook()
    ws = wb.active
    
    if report_type == "balance-sheet":
        ws.title = "Bilan"
        accounts = await db.accounts.find({"company_id": company_id}, {"_id": 0}).to_list(1000)
        
        ws.append(["Code", "Nom", "Type", "Solde"])
        for acc in sorted(accounts, key=lambda x: x["code"]):
            ws.append([acc["code"], acc["name"], acc["account_type"], acc["balance"]])
    
    elif report_type == "invoices":
        ws.title = "Factures"
        invoices = await db.invoices.find({"company_id": company_id}, {"_id": 0}).to_list(1000)
        
        ws.append(["Numéro", "Date", "Client", "Total HT", "TVA", "Total TTC", "Statut"])
        for inv in invoices:
            ws.append([
                inv["invoice_number"],
                inv["date"],
                inv["client_name"],
                inv["subtotal"],
                inv["total_vat"],
                inv["total"],
                inv["status"]
            ])
    
    elif report_type == "transactions":
        ws.title = "Transactions"
        transactions = await db.bank_transactions.find({"company_id": company_id}, {"_id": 0}).to_list(1000)
        
        ws.append(["Date", "Description", "Type", "Montant", "Catégorie", "Rapproché"])
        for t in transactions:
            ws.append([
                t["date"],
                t["description"],
                t["transaction_type"],
                t["amount"],
                t.get("category", ""),
                "Oui" if t["reconciled"] else "Non"
            ])
    
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    
    filename = f"export_{report_type}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ============ USER MANAGEMENT ROUTES ============

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))):
    company_id = user.get("company_id")
    query = {"company_id": company_id} if company_id and user["role"] != UserRole.ADMIN else {}
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0, "two_factor_secret": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))):
    valid_roles = [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.COLLABORATOR, UserRole.MANAGER]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")
    
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await log_audit(user["id"], "USER_ROLE_UPDATED", {"target_user_id": user_id, "new_role": role})
    return {"message": f"User role updated to {role}"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_role([UserRole.ADMIN]))):
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await log_audit(user["id"], "USER_DELETED", {"deleted_user_id": user_id})
    return {"message": "User deleted"}

# ============ AUDIT LOG ============

async def log_audit(user_id: str, action: str, details: dict):
    audit_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": action,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ip_address": None  # Would be populated from request in production
    }
    await db.audit_logs.insert_one(audit_doc)

@api_router.get("/audit-logs")
async def get_audit_logs(
    limit: int = 100,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))
):
    query = {}
    if user_id:
        query["user_id"] = user_id
    if action:
        query["action"] = action
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs

# ============ DEMO DATA ============

@api_router.post("/demo/seed")
async def seed_demo_data(user: dict = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))):
    """Seed demo data for testing"""
    company_id = user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="Create a company first")
    
    now = datetime.now(timezone.utc)
    
    # Create demo bank account
    bank_account = {
        "id": str(uuid.uuid4()),
        "name": "Compte Principal",
        "bank_name": "BNP Paribas",
        "iban": "FR76 3000 4000 0500 0000 0000 123",
        "bic": "BNPAFRPP",
        "balance": 45000.00,
        "company_id": company_id,
        "created_at": now.isoformat()
    }
    await db.bank_accounts.update_one(
        {"company_id": company_id, "name": "Compte Principal"},
        {"$setOnInsert": bank_account},
        upsert=True
    )
    
    # Create demo transactions
    transactions = [
        {"description": "Loyer bureaux", "amount": 2500, "type": "debit", "category": "Loyer"},
        {"description": "Vente produits", "amount": 15000, "type": "credit", "category": "Ventes"},
        {"description": "Salaires", "amount": 8000, "type": "debit", "category": "Salaires"},
        {"description": "Facture client ABC", "amount": 5600, "type": "credit", "category": "Ventes"},
        {"description": "Fournitures bureau", "amount": 350, "type": "debit", "category": "Fournitures"},
        {"description": "Électricité", "amount": 180, "type": "debit", "category": "Énergie"},
        {"description": "Prestation consulting", "amount": 3200, "type": "credit", "category": "Services"},
    ]
    
    bank_acc = await db.bank_accounts.find_one({"company_id": company_id, "name": "Compte Principal"}, {"_id": 0})
    
    for i, t in enumerate(transactions):
        trans_doc = {
            "id": str(uuid.uuid4()),
            "bank_account_id": bank_acc["id"],
            "date": (now - timedelta(days=i*3)).strftime("%Y-%m-%d"),
            "description": t["description"],
            "amount": t["amount"],
            "transaction_type": t["type"],
            "category": t["category"],
            "reference": f"REF-{str(uuid.uuid4())[:8].upper()}",
            "reconciled": i < 3,
            "company_id": company_id,
            "created_at": now.isoformat()
        }
        await db.bank_transactions.insert_one(trans_doc)
    
    # Create demo invoices
    clients = [
        {"name": "SARL TechnoPlus", "address": "45 rue de la République, 75001 Paris"},
        {"name": "Groupe Innovation", "address": "12 avenue des Champs, 69001 Lyon"},
        {"name": "Cabinet Conseil Pro", "address": "8 place Bellecour, 69002 Lyon"},
    ]
    
    for i, client in enumerate(clients):
        invoice_id = str(uuid.uuid4())
        invoice_number = f"FAC-{now.year}-{str(i+1).zfill(5)}"
        
        lines = [
            {"description": "Prestation de conseil", "quantity": 10, "unit_price": 150, "vat_rate": 20, "discount": 0},
            {"description": "Formation équipe", "quantity": 2, "unit_price": 800, "vat_rate": 20, "discount": 5},
        ]
        
        subtotal = sum(l["quantity"] * l["unit_price"] * (1 - l["discount"]/100) for l in lines)
        total_vat = subtotal * 0.2
        
        invoice_doc = {
            "id": invoice_id,
            "invoice_number": invoice_number,
            "invoice_type": "invoice",
            "client_name": client["name"],
            "client_address": client["address"],
            "client_email": f"contact@{client['name'].lower().replace(' ', '')}.fr",
            "date": (now - timedelta(days=i*7)).strftime("%Y-%m-%d"),
            "due_date": (now + timedelta(days=30-i*7)).strftime("%Y-%m-%d"),
            "lines": [
                {**l, "line_total": l["quantity"] * l["unit_price"] * (1 - l["discount"]/100),
                 "vat_amount": l["quantity"] * l["unit_price"] * (1 - l["discount"]/100) * l["vat_rate"] / 100}
                for l in lines
            ],
            "subtotal": subtotal,
            "total_vat": total_vat,
            "total": subtotal + total_vat,
            "status": ["paid", "sent", "draft"][i],
            "notes": "Merci pour votre confiance.",
            "payment_terms": "Paiement à 30 jours",
            "company_id": company_id,
            "created_by": user["id"],
            "created_at": now.isoformat()
        }
        await db.invoices.insert_one(invoice_doc)
    
    # Update some account balances for reporting
    await db.accounts.update_one(
        {"company_id": company_id, "code": "512"},
        {"$set": {"balance": 45000}}
    )
    await db.accounts.update_one(
        {"company_id": company_id, "code": "411"},
        {"$set": {"balance": 8500}}
    )
    await db.accounts.update_one(
        {"company_id": company_id, "code": "706"},
        {"$set": {"balance": 35000}}
    )
    await db.accounts.update_one(
        {"company_id": company_id, "code": "641"},
        {"$set": {"balance": 24000}}
    )
    await db.accounts.update_one(
        {"company_id": company_id, "code": "613"},
        {"$set": {"balance": 7500}}
    )
    
    return {"message": "Demo data seeded successfully"}

# ============ HEALTH CHECK ============

@api_router.get("/")
async def root():
    return {"message": "FinanceManager Pro API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
