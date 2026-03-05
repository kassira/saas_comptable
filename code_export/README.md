# FinanceManager Pro - Code Source Complet

## 📁 Structure du projet

```
code_export/
├── backend/                    # Backend FastAPI
│   ├── server.py              # API principale (auth, comptabilité, facturation, trésorerie)
│   ├── requirements.txt       # Dépendances Python
│   └── .env                   # Variables d'environnement backend
│
├── frontend_src/              # Frontend React
│   ├── App.js                 # Composant principal avec routes
│   ├── App.css                # Styles de base
│   ├── index.css              # Styles globaux + Tailwind
│   ├── index.js               # Point d'entrée
│   │
│   ├── contexts/              # Context React
│   │   ├── AuthContext.js     # Authentification JWT + 2FA
│   │   └── ThemeContext.js    # Thème sombre/clair
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   └── MainLayout.js  # Layout principal avec sidebar
│   │   └── ui/                # Composants Shadcn/UI
│   │
│   └── pages/                 # Pages de l'application
│       ├── LoginPage.js
│       ├── RegisterPage.js
│       ├── DashboardPage.js
│       ├── AccountingPage.js
│       ├── ChartOfAccountsPage.js
│       ├── JournalEntriesPage.js
│       ├── InvoicesPage.js
│       ├── CreateInvoicePage.js
│       ├── QuotesPage.js
│       ├── TreasuryPage.js
│       ├── BankAccountsPage.js
│       ├── ReportsPage.js
│       ├── SettingsPage.js
│       ├── UsersPage.js
│       ├── CompanyPage.js
│       └── TwoFactorSetupPage.js
│
├── package.json               # Dépendances Node.js
├── frontend.env               # Variables d'environnement frontend
├── backend.env                # Variables d'environnement backend
└── design_guidelines.json     # Guidelines de design
```

## 🚀 Technologies utilisées

### Backend
- **FastAPI** - Framework Python haute performance
- **MongoDB** (Motor) - Base de données NoSQL
- **PyJWT** - Authentification JWT
- **PyOTP** - Authentification 2FA TOTP
- **ReportLab** - Génération PDF
- **OpenPyXL** - Export Excel
- **Bcrypt** - Hachage de mots de passe

### Frontend
- **React 19** - Framework UI
- **React Router** - Navigation SPA
- **Tailwind CSS** - Framework CSS
- **Shadcn/UI** - Composants UI
- **Recharts** - Graphiques
- **Axios** - Requêtes HTTP
- **Sonner** - Notifications toast

## 📋 Fonctionnalités

### Authentification
- Inscription/Connexion JWT
- Authentification 2FA (TOTP)
- Gestion des rôles (admin, manager, comptable, collaborateur)

### Comptabilité
- Plan comptable PCG français
- Saisie d'écritures comptables
- Validation et audit trail
- Bilan et compte de résultat

### Facturation
- Création de devis et factures
- Export PDF personnalisé
- Conversion devis → facture
- Suivi des statuts (brouillon, envoyée, payée, en retard)

### Trésorerie
- Gestion des comptes bancaires
- Saisie de transactions
- Rapprochement bancaire
- Prévisionnel de trésorerie (6 mois)
- Alertes trésorerie

### Reporting
- Tableau de bord avec KPIs
- Graphiques d'évolution
- Export Excel (bilan, factures, transactions)
- Analyses visuelles

## 🔧 Installation

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001
```

### Frontend
```bash
cd frontend
yarn install
yarn start
```

## 🔐 Variables d'environnement

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=financemanager
JWT_SECRET=your-secret-key
CORS_ORIGINS=*
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

## 📱 Captures d'écran

L'application inclut:
- Page de connexion moderne
- Dashboard avec graphiques
- Gestion comptable complète
- Module de facturation PDF
- Trésorerie avec prévisionnel
- Mode sombre/clair

---
Développé avec ❤️ pour FinanceManager Pro
