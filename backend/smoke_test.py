"""Smoke test — run with: python smoke_test.py"""
import sys, os
os.environ['DATABASE_URL'] = 'sqlite:///./classroom_smoke_test.db'
os.environ['SECRET_KEY'] = 'smoke-test-key-not-for-production-x9z2m4k7'
sys.path.insert(0, '.')

print('=== Backend smoke test ===\n')

# 1. All models import and register with Base
from app.models import *  # noqa
from app.database import Base, engine

tables = sorted(Base.metadata.tables.keys())
print(f'Tables registered: {len(tables)}')
for t in tables:
    print(f'  {t}')

# 2. Create tables
Base.metadata.create_all(bind=engine)
print('\nDB create_all: OK')

# 3. Basic repo round-trip
from app.database import SessionLocal
from app.repositories.repository_core import UserRepository
from app.utils.security import hash_password

db = SessionLocal()
user_repo = UserRepository(db)
if not user_repo.list():
    user_repo.create(
        username='smoke_admin',
        email='smoke@test.local',
        hashed_password=hash_password('test1234'),
        full_name='Smoke Tester',
        role='super_admin',
    )
users = user_repo.list()
print(f'Users in DB: {len(users)} ({users[0].username})')
db.close()

# 4. Routers
from app.main import app
routes = [r.path for r in app.routes if hasattr(r, 'path')]
api_routes = [r for r in routes if r.startswith('/api')]
ws_routes  = [r for r in routes if r.startswith('/ws')]
print(f'\nAPI routes: {len(api_routes)}')
print(f'WS  routes: {len(ws_routes)}')

# 5. Required routes
required = [
    '/api/auth/login',
    '/api/dashboard/stats',
    '/api/audit/logs',
    '/api/experiments/threshold-sweep',
    '/api/reports/session/{session_id}',
    '/ws/classroom/{classroom_id}',
    '/ws/recognize/{classroom_id}',
]
print('\nRequired route check:')
all_ok = True
for r in required:
    found = r in routes
    status = 'OK  ' if found else 'MISS'
    if not found:
        all_ok = False
    print(f'  {status} {r}')

# 6. Cleanup test DB
import pathlib
# Dispose engine connections before cleanup
engine.dispose()
import gc; gc.collect()
import pathlib
p = pathlib.Path('classroom_smoke_test.db')
try:
    if p.exists():
        p.unlink()
except Exception:
    pass  # Windows file lock — test DB will be cleaned up on next run

print()
if all_ok:
    print('=== Smoke test PASSED ===')
    sys.exit(0)
else:
    print('=== Smoke test FAILED — see MISS lines above ===')
    sys.exit(1)
