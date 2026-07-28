# Base de datos - Supabase (PostgreSQL)

## Tablas actuales

### people
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| name | text | NOT NULL |
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
| created_at | timestamptz | |

### income_categories
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| name | text | NOT NULL |
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
| created_at | timestamptz | |

### budget_templates
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| name | text | NOT NULL |
| created_at | timestamptz | |

### budget_categories
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| template_id | uuid FK → budget_templates | NOT NULL |
| name | text | NOT NULL |
| budgeted | numeric | default 0 |
| parent_id | uuid FK → budget_categories (self) | nullable |
| created_at | timestamptz | |

### monthly_budgets
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| template_id | uuid FK → budget_templates | NOT NULL |
| month | date | NOT NULL (primer día del mes) |
| created_at | timestamptz | |

### saving_categories
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| name | text | |
| created_at | timestamptz | |

### savings
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| name | text | |
| description | text | |
| current_amount | numeric | |
| category_id | uuid FK → saving_categories | nullable |
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
| created_at | timestamptz | |

### future_expense_categories
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| name | text | |
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
| created_at | timestamptz | |

### allowed_users
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| email | text | |
| active | boolean | |
| created_at | timestamptz | |

### user_roles
| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid PK | |
| user_id | uuid | |
| role | text | 'admin' | 'user' |
| created_at | timestamptz | |