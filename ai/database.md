# Base de datos - Supabase (PostgreSQL)

Todas las tablas tienen RLS (Row Level Security) habilitado con política `FOR ALL USING (user_id = auth.uid())`. Las excepciones son `allowed_users` y `user_roles` que usan políticas de admin.

Cada tabla incluye `user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id) NOT NULL` para aislamiento multi-usuario.

## Tablas actuales

### people
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| name | text | NOT NULL |
| user_id | uuid FK → auth.users | DEFAULT auth.uid() |
| created_at | timestamptz | default now() |

### income
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| person_id | uuid FK → people | NOT NULL |
| amount | numeric | NOT NULL |
| description | text | |
| date | date | NOT NULL |
| category_id | uuid FK → income_categories | nullable |
| user_id | uuid FK → auth.users | DEFAULT auth.uid() |
| created_at | timestamptz | |

### income_categories
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| name | text | NOT NULL |
| user_id | uuid FK → auth.users | DEFAULT auth.uid() |
| created_at | timestamptz | |

### expenses
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| person_id | uuid FK → people | NOT NULL |
| amount | numeric | NOT NULL |
| description | text | |
| date | date | NOT NULL |
| budget_category_id | uuid FK → budget_categories | nullable |
| user_id | uuid FK → auth.users | DEFAULT auth.uid() |
| created_at | timestamptz | |

### budget_templates
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| name | text | NOT NULL |
| user_id | uuid FK → auth.users | DEFAULT auth.uid() |
| created_at | timestamptz | |

### budget_categories
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| template_id | uuid FK → budget_templates | NOT NULL |
| name | text | NOT NULL |
| budgeted | numeric | default 0 |
| parent_id | uuid FK → budget_categories (self) | nullable |
| user_id | uuid FK → auth.users | DEFAULT auth.uid() |
| created_at | timestamptz | |

### monthly_budgets
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| template_id | uuid FK → budget_templates | NOT NULL |
| month | date | NOT NULL (primer día del mes) |
| user_id | uuid FK → auth.users | DEFAULT auth.uid() |
| created_at | timestamptz | |

### saving_categories
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| name | text | |
| user_id | uuid FK → auth.users | DEFAULT auth.uid() |
| created_at | timestamptz | |

### savings
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| name | text | |
| description | text | |
| current_amount | numeric | |
| category_id | uuid FK → saving_categories | nullable |
| user_id | uuid FK → auth.users | DEFAULT auth.uid() |
| created_at | timestamptz | |

### saving_movements
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| saving_id | uuid FK → savings | |
| type | text | 'income' | 'withdrawal' |
| amount | numeric | |
| notes | text | |
| movement_date | date | |
| user_id | uuid FK → auth.users | DEFAULT auth.uid() |
| created_at | timestamptz | |

### future_expense_categories
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| name | text | |
| user_id | uuid FK → auth.users | DEFAULT auth.uid() |
| created_at | timestamptz | |

### future_expenses
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| title | text | |
| description | text | |
| category | text | |
| category_id | uuid FK → future_expense_categories | nullable |
| expected_amount | numeric | |
| expected_date | date | |
| status | text | 'planned' | 'completed' | 'cancelled' |
| user_id | uuid FK → auth.users | DEFAULT auth.uid() |
| created_at | timestamptz | |

### commitments
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| name | text | |
| description | text | |
| total_amount | numeric | |
| current_balance | numeric | |
| category_id | uuid FK → budget_categories | nullable |
| user_id | uuid FK → auth.users | DEFAULT auth.uid() |
| created_at | timestamptz | |

### commitment_payments
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| commitment_id | uuid FK → commitments | |
| amount | numeric | |
| capital_amount | numeric | |
| date | date | |
| notes | text | |
| user_id | uuid FK → auth.users | DEFAULT auth.uid() |
| created_at | timestamptz | |

### allowed_users
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| email | text | |
| active | boolean | default true |
| created_at | timestamptz | |
| *(RLS: solo admin puede gestionar)* | | |

### user_roles
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| user_id | uuid | |
| role | text | 'admin' | 'user' |
| created_at | timestamptz | |
| *(RLS: solo admin puede gestionar)* | | |

## RLS (Row Level Security)

Archivos de migración en `sql/`:
- **sql/rls-migration.sql**: Agrega columna `user_id UUID DEFAULT auth.uid()` a las 14 tablas de datos, actualiza registros existentes con un UUID semilla.
- **sql/rls-policies.sql**: Habilita RLS en todas las tablas:
  - Tablas 1-14: política `FOR ALL USING (user_id = auth.uid())`
  - `allowed_users` y `user_roles`: política `FOR ALL USING (EXISTS SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')`

## Seguridad en código

- **Zod validation**: `src/lib/validation.ts` — 14 schemas para todas las entidades
- **Sanitization**: `src/lib/sanitize.ts` — XSS sanitization en inputs
- **Friendly errors**: `src/lib/errors.ts` — `friendlyError()` oculta detalles técnicos, `logError()` solo en dev
- **Security headers**: `next.config.ts` — X-Frame-Options, X-Content-Type-Options, etc.
- **Submit buttons**: `disabled={busy}` + Loader2 spinner en todos los formularios