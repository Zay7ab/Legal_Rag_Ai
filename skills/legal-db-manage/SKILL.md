---
name: legal-db-manage
description: "Perform database actions, create tables, query data, run migrations, and seed court judgments or cases in Pakistan LegalAI."
argument-hint: "[command]"
license: MIT
metadata:
  author: Antigravity
  version: "1.0.0"
---

# Legal Database Management Skill

Use this skill to manage database initialization, schema changes, migrations, and seeding operations for Pakistan LegalAI.

## When to Activate

- When database tables need to be created or modified.
- When new landmark Supreme Court or High Court judgments need to be seeded.
- When querying user accounts or search history statistics.
- When switching database configurations between SQLite (development) and PostgreSQL (production).

## Workflow

### Step 1: Database Setup and Connection

1. **Configuration**: The engine resides in [database.py](file:///e:/Projects/pakistan-legalai/pakistan-legalai/backend/db/database.py). It reads `DATABASE_URL` from the `.env` file.
   - Default: `sqlite:///./legalai.db` (created inside `/backend/`)
   - Production: `postgresql://user:password@host:5432/db`
2. **Initialization**: On backend start, `init_db()` is called inside the FastAPI startup lifecycle, which executes:
   ```python
   Base.metadata.create_all(bind=engine)
   ```

### Step 2: Seeding Landmark Judgments

Ensure judgments are loaded into the SQLite/PostgreSQL database for the case law search function.
- View models in [models.py](file:///e:/Projects/pakistan-legalai/pakistan-legalai/backend/db/models.py). The `Case` model has fields for `title`, `court`, `year`, `citation`, `summary`, `full_text`, `law_sections`, `outcome`, and `is_landmark`.
- Topics list resides in [models.py](file:///e:/Projects/pakistan-legalai/pakistan-legalai/backend/db/models.py#L31-L46) (`topics` table).

To seed or add new entries:
1. Write a custom Python script or migration script within `backend/scripts/`.
2. Execute the script within the virtual environment:
   ```powershell
   cd backend
   .\venv\Scripts\Activate.ps1
   python scripts/seed_cases.py
   ```

### Step 3: Debugging & Schema Verification

To check database statistics directly from Python:
```python
from db.database import SessionLocal
from db.models import Case
from db.auth_models import User

db = SessionLocal()
case_count = db.query(Case).count()
user_count = db.query(User).count()
db.close()

print(f"Total Cases: {case_count}, Total Users: {user_count}")
```

Or check it using the backend API dashboard:
- Query `http://localhost:8000/health` which automatically checks connection stats and returns database counts (`db_cases` and `db_users`).
