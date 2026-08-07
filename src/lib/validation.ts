import { z } from "zod"

const MAX_STR = 200
const MAX_DESC = 500

export const personSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(MAX_STR),
})

export const incomeCategorySchema = z.object({
  name: z.string().trim().min(1).max(MAX_STR),
})

export const incomeSchema = z.object({
  person_id: z.string().uuid(),
  amount: z.number().positive("El importe debe ser positivo").finite(),
  description: z.string().trim().max(MAX_DESC).default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
  category_id: z.string().uuid().nullable().optional(),
})

export const expenseCategorySchema = z.object({
  name: z.string().trim().min(1).max(MAX_STR),
  tab: z.enum(["categoria", "disponible", "hucha"]).default("categoria"),
})

export const expenseSchema = z.object({
  person_id: z.string().uuid(),
  amount: z.number().positive("El importe debe ser positivo").finite(),
  description: z.string().trim().max(MAX_DESC).default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
  budget_category_id: z.string().uuid().nullable().optional(),
  expense_category_id: z.string().uuid().nullable().optional(),
  saving_id: z.string().uuid().nullable().optional(),
})

export const budgetTemplateSchema = z.object({
  name: z.string().trim().min(1).max(MAX_STR),
})

export const budgetCategorySchema = z.object({
  template_id: z.string().uuid().optional(),
  monthly_budget_id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(MAX_STR),
  budgeted: z.number().min(0, "El valor presupuestado no puede ser negativo").finite(),
  parent_id: z.string().uuid().nullable().optional(),
  is_paid: z.boolean().optional(),
})

export const monthlyBudgetSchema = z.object({
  template_id: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
})

export const savingCategorySchema = z.object({
  name: z.string().trim().min(1).max(MAX_STR),
})

export const savingSchema = z.object({
  name: z.string().trim().min(1).max(MAX_STR),
  description: z.string().trim().max(MAX_DESC).default(""),
  category_id: z.string().uuid().nullable().optional(),
})

export const savingMovementSchema = z.object({
  saving_id: z.string().uuid(),
  type: z.enum(["income", "withdrawal"]),
  amount: z.number().positive("El importe debe ser positivo").finite(),
  notes: z.string().trim().max(MAX_DESC).default(""),
  movement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
  expense_id: z.string().uuid().nullable().optional(),
})

export const futureExpenseCategorySchema = z.object({
  name: z.string().trim().min(1).max(MAX_STR),
})

export const futureExpenseSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(MAX_STR),
  description: z.string().trim().max(MAX_DESC).default(""),
  category: z.string().trim().min(1).max(MAX_STR),
  category_id: z.string().uuid().nullable().optional(),
  expected_amount: z.number().positive("El importe debe ser positivo").finite(),
  expected_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
  saving_id: z.string().uuid().nullable().optional(),
})

export const commitmentSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(MAX_STR),
  description: z.string().trim().max(MAX_DESC).default(""),
  total_amount: z.number().positive("El importe debe ser positivo").finite(),
  current_balance: z.number().min(0, "El saldo actual no puede ser negativo").finite(),
  category_id: z.string().uuid().nullable().optional(),
})

export const commitmentPaymentSchema = z.object({
  commitment_id: z.string().uuid(),
  amount: z.number().positive("El importe debe ser positivo").finite(),
  capital_amount: z.number().min(0, "El capital no puede ser negativo").finite(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)"),
  notes: z.string().trim().max(MAX_DESC).default(""),
})

export const allowedUserSchema = z.object({
  email: z.string().email("Email inválido").toLowerCase().trim(),
  active: z.boolean().optional().default(true),
})

export type PersonInput = z.input<typeof personSchema>
export type IncomeInput = z.input<typeof incomeSchema>
export type ExpenseInput = z.input<typeof expenseSchema>
export type BudgetTemplateInput = z.input<typeof budgetTemplateSchema>
export type BudgetCategoryInput = z.input<typeof budgetCategorySchema>
export type MonthlyBudgetInput = z.input<typeof monthlyBudgetSchema>
export type SavingCategoryInput = z.input<typeof savingCategorySchema>
export type SavingInput = z.input<typeof savingSchema>
export type SavingMovementInput = z.input<typeof savingMovementSchema>
export type FutureExpenseCategoryInput = z.input<typeof futureExpenseCategorySchema>
export type FutureExpenseInput = z.input<typeof futureExpenseSchema>
export type CommitmentInput = z.input<typeof commitmentSchema>
export type CommitmentPaymentInput = z.input<typeof commitmentPaymentSchema>
export type AllowedUserInput = z.input<typeof allowedUserSchema>