#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for FinanceManager Pro
Tests all major API endpoints with the provided test credentials
"""

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class FinanceManagerAPITester:
    def __init__(self, base_url: str = "https://financepro-sme.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.company_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.session = requests.Session()
        
    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}: PASSED {details}")
        else:
            self.failed_tests.append({"test": test_name, "details": details})
            print(f"❌ {test_name}: FAILED {details}")
        return success

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200, headers: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Make HTTP request and validate response"""
        url = f"{self.base_url}/{endpoint}"
        req_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            req_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            req_headers.update(headers)
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=req_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=req_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=req_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=req_headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            success = response.status_code == expected_status
            try:
                response_data = response.json() if response.content else {}
            except:
                response_data = {"raw_response": response.text}
                
            return success, response_data
            
        except Exception as e:
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test API health endpoint"""
        success, data = self.make_request('GET', '')
        return self.log_result("Health Check", success, f"Response: {data.get('message', 'No message')}")

    def test_login(self, email: str = "admin@test.fr", password: str = "test123456"):
        """Test user login"""
        login_data = {"email": email, "password": password}
        success, data = self.make_request('POST', 'auth/login', login_data)
        
        if success and 'access_token' in data:
            self.token = data['access_token']
            self.user_id = data['user']['id']
            self.company_id = data['user'].get('company_id')
            return self.log_result("User Login", True, f"Token received, Company ID: {self.company_id}")
        else:
            return self.log_result("User Login", False, f"Login failed: {data}")

    def test_get_current_user(self):
        """Test get current user info"""
        success, data = self.make_request('GET', 'auth/me')
        return self.log_result("Get Current User", success, f"User: {data.get('email', 'Unknown')}")

    def test_company_operations(self):
        """Test company-related operations"""
        # Get companies
        success, data = self.make_request('GET', 'companies')
        companies_test = self.log_result("Get Companies", success, f"Found {len(data) if isinstance(data, list) else 0} companies")
        
        if success and data and len(data) > 0:
            company = data[0]
            # Get specific company
            success, company_data = self.make_request('GET', f'companies/{company["id"]}')
            company_detail_test = self.log_result("Get Company Details", success, f"Company: {company_data.get('name', 'Unknown')}")
            return companies_test and company_detail_test
        
        return companies_test

    def test_chart_of_accounts(self):
        """Test chart of accounts operations"""
        # Get accounts
        success, data = self.make_request('GET', 'accounts')
        get_accounts = self.log_result("Get Chart of Accounts", success, f"Found {len(data) if isinstance(data, list) else 0} accounts")
        
        # Create new account
        new_account = {
            "code": "999",
            "name": "Test Account",
            "account_type": "expense",
            "description": "Test account for API testing"
        }
        success, account_data = self.make_request('POST', 'accounts', new_account, 200)
        create_account = self.log_result("Create Account", success, f"Account created: {account_data.get('code', 'Unknown')}")
        
        return get_accounts and create_account

    def test_journal_entries(self):
        """Test journal entries operations"""
        # Get journal entries
        success, data = self.make_request('GET', 'journal-entries')
        get_entries = self.log_result("Get Journal Entries", success, f"Found {len(data) if isinstance(data, list) else 0} entries")
        
        # Create journal entry
        entry_data = {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "reference": f"TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "description": "Test journal entry",
            "lines": [
                {"account_code": "512", "account_name": "Banque", "debit": 1000.0, "credit": 0.0},
                {"account_code": "706", "account_name": "Prestations", "debit": 0.0, "credit": 1000.0}
            ]
        }
        success, entry_result = self.make_request('POST', 'journal-entries', entry_data, 200)
        create_entry = self.log_result("Create Journal Entry", success, f"Entry: {entry_result.get('reference', 'Unknown')}")
        
        return get_entries and create_entry

    def test_invoices_operations(self):
        """Test invoice operations"""
        # Get invoices
        success, data = self.make_request('GET', 'invoices')
        get_invoices = self.log_result("Get Invoices", success, f"Found {len(data) if isinstance(data, list) else 0} invoices")
        
        # Create invoice
        invoice_data = {
            "client_name": "Test Client SAS",
            "client_address": "123 Test Street, 75001 Paris",
            "client_email": "test@client.com",
            "invoice_type": "invoice",
            "due_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "lines": [
                {
                    "description": "Test Service",
                    "quantity": 1.0,
                    "unit_price": 500.0,
                    "vat_rate": 20.0,
                    "discount": 0.0
                }
            ],
            "notes": "Test invoice created by API test",
            "payment_terms": "Paiement à 30 jours"
        }
        success, invoice_result = self.make_request('POST', 'invoices', invoice_data, 200)
        create_invoice = self.log_result("Create Invoice", success, f"Invoice: {invoice_result.get('invoice_number', 'Unknown')}")
        
        # Test PDF generation if invoice was created
        pdf_test = True
        if create_invoice and 'id' in invoice_result:
            success, pdf_data = self.make_request('GET', f'invoices/{invoice_result["id"]}/pdf', expected_status=200)
            pdf_test = self.log_result("Generate Invoice PDF", success, "PDF generation test")
        
        return get_invoices and create_invoice and pdf_test

    def test_quotes_operations(self):
        """Test quote operations"""
        # Get quotes
        success, data = self.make_request('GET', 'invoices', {"invoice_type": "quote"})
        get_quotes = self.log_result("Get Quotes", success, f"Found quotes")
        
        # Create quote
        quote_data = {
            "client_name": "Test Quote Client",
            "client_address": "456 Quote Street, 69001 Lyon",
            "invoice_type": "quote",
            "due_date": (datetime.now() + timedelta(days=15)).strftime("%Y-%m-%d"),
            "lines": [
                {
                    "description": "Quote Service",
                    "quantity": 2.0,
                    "unit_price": 300.0,
                    "vat_rate": 20.0,
                    "discount": 5.0
                }
            ]
        }
        success, quote_result = self.make_request('POST', 'invoices', quote_data, 200)
        create_quote = self.log_result("Create Quote", success, f"Quote: {quote_result.get('invoice_number', 'Unknown')}")
        
        return get_quotes and create_quote

    def test_bank_accounts(self):
        """Test bank account operations"""
        # Get bank accounts
        success, data = self.make_request('GET', 'bank-accounts')
        get_accounts = self.log_result("Get Bank Accounts", success, f"Found {len(data) if isinstance(data, list) else 0} accounts")
        
        # Create bank account
        account_data = {
            "name": "Test Bank Account",
            "bank_name": "Test Bank",
            "iban": "FR76 1234 5678 9012 3456 7890 123",
            "bic": "TESTFRPP",
            "initial_balance": 5000.0
        }
        success, account_result = self.make_request('POST', 'bank-accounts', account_data, 200)
        create_account = self.log_result("Create Bank Account", success, f"Account: {account_result.get('name', 'Unknown')}")
        
        return get_accounts and create_account

    def test_bank_transactions(self):
        """Test bank transaction operations"""
        # Get bank transactions
        success, data = self.make_request('GET', 'bank-transactions')
        get_transactions = self.log_result("Get Bank Transactions", success, f"Found {len(data) if isinstance(data, list) else 0} transactions")
        
        # Get bank accounts first to create transaction
        success, accounts = self.make_request('GET', 'bank-accounts')
        if success and accounts and len(accounts) > 0:
            account_id = accounts[0]['id']
            
            # Create transaction
            transaction_data = {
                "bank_account_id": account_id,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "description": "Test Transaction",
                "amount": 250.0,
                "transaction_type": "credit",
                "category": "Test",
                "reference": f"TEST-{datetime.now().strftime('%H%M%S')}"
            }
            success, transaction_result = self.make_request('POST', 'bank-transactions', transaction_data, 200)
            create_transaction = self.log_result("Create Bank Transaction", success, f"Transaction: {transaction_result.get('description', 'Unknown')}")
        else:
            create_transaction = self.log_result("Create Bank Transaction", False, "No bank accounts available")
        
        return get_transactions and create_transaction

    def test_treasury_operations(self):
        """Test treasury operations"""
        # Get cash flow forecast
        success, data = self.make_request('GET', 'treasury/cash-flow-forecast')
        forecast_test = self.log_result("Get Cash Flow Forecast", success, f"Forecast periods: {len(data) if isinstance(data, list) else 0}")
        
        # Get treasury alerts
        success, alerts = self.make_request('GET', 'treasury/alerts')
        alerts_test = self.log_result("Get Treasury Alerts", success, f"Alerts: {len(alerts) if isinstance(alerts, list) else 0}")
        
        return forecast_test and alerts_test

    def test_reports(self):
        """Test reporting operations"""
        # Dashboard stats
        success, data = self.make_request('GET', 'reports/dashboard-stats')
        dashboard_test = self.log_result("Get Dashboard Stats", success, f"Stats available: {bool(data)}")
        
        # Balance sheet
        success, balance_sheet = self.make_request('GET', 'reports/balance-sheet')
        balance_test = self.log_result("Get Balance Sheet", success, f"Balance sheet generated")
        
        # Income statement
        success, income_statement = self.make_request('GET', 'reports/income-statement')
        income_test = self.log_result("Get Income Statement", success, f"Income statement generated")
        
        # Excel export
        success, excel_data = self.make_request('GET', 'reports/export/excel?report_type=balance-sheet', expected_status=200)
        excel_test = self.log_result("Excel Export", success, "Excel export test")
        
        return dashboard_test and balance_test and income_test and excel_test

    def test_user_management(self):
        """Test user management operations"""
        # Get users (requires admin/manager role)
        success, data = self.make_request('GET', 'users')
        users_test = self.log_result("Get Users", success, f"Found {len(data) if isinstance(data, list) else 0} users")
        
        return users_test

    def test_2fa_setup(self):
        """Test 2FA setup operations"""
        # Setup 2FA
        success, data = self.make_request('POST', 'auth/2fa/setup')
        setup_test = self.log_result("2FA Setup", success, f"2FA setup: {bool(data.get('secret'))}")
        
        return setup_test

    def test_demo_data_seeding(self):
        """Test demo data seeding"""
        success, data = self.make_request('POST', 'demo/seed')
        return self.log_result("Demo Data Seeding", success, f"Demo data: {data.get('message', 'Unknown')}")

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting FinanceManager Pro API Testing...")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)
        
        # Core authentication tests
        if not self.test_health_check():
            print("❌ Health check failed - stopping tests")
            return False
            
        if not self.test_login():
            print("❌ Login failed - stopping tests")
            return False
            
        self.test_get_current_user()
        
        # Company and setup tests
        self.test_company_operations()
        
        # Accounting tests
        self.test_chart_of_accounts()
        self.test_journal_entries()
        
        # Invoicing tests
        self.test_invoices_operations()
        self.test_quotes_operations()
        
        # Treasury tests
        self.test_bank_accounts()
        self.test_bank_transactions()
        self.test_treasury_operations()
        
        # Reporting tests
        self.test_reports()
        
        # User management tests
        self.test_user_management()
        
        # Security tests
        self.test_2fa_setup()
        
        # Demo data tests
        self.test_demo_data_seeding()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Summary:")
        print(f"   Total Tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {len(self.failed_tests)}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"   - {test['test']}: {test['details']}")
        
        return len(self.failed_tests) == 0

def main():
    """Main test execution"""
    tester = FinanceManagerAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())