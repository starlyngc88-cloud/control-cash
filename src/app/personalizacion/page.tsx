"use client"

import { useLanguage } from "@/i18n/useLanguage"
import { Palette, DollarSign } from "lucide-react"

export default function PersonalizacionPage() {
  const { t, language, setLanguage, currency, setCurrency } = useLanguage()
  const p = t.personalizacion

  return (
    <div className="max-w-xl mx-auto py-8 px-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center size-10 rounded-xl bg-pink-100 text-pink-600 dark:bg-pink-900/30">
          <Palette className="size-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{p.title}</h2>
          <p className="text-sm text-muted-foreground">{p.subtitle}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold mb-2">Idioma</h3>
          <div className="space-y-2">
            <label
              className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                language === "standard"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name="language"
                value="standard"
                checked={language === "standard"}
                onChange={() => setLanguage("standard")}
                className="size-4 accent-primary"
              />
              <div>
                <p className="font-medium text-sm">{p.estandar}</p>
                <p className="text-xs text-muted-foreground">{p.standardDesc}</p>
              </div>
            </label>

            <label
              className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                language === "kellycaribe"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name="language"
                value="kellycaribe"
                checked={language === "kellycaribe"}
                onChange={() => setLanguage("kellycaribe")}
                className="size-4 accent-primary"
              />
              <div>
                <p className="font-medium text-sm">{p.kellycaribe}</p>
                <p className="text-xs text-muted-foreground">{p.caribeDesc}</p>
              </div>
            </label>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="size-4 text-emerald-500" />
            <h3 className="text-sm font-semibold">{p.moneda}</h3>
          </div>
          <div className="space-y-2">
            <label
              className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                currency === "COP"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name="currency"
                value="COP"
                checked={currency === "COP"}
                onChange={() => setCurrency("COP")}
                className="size-4 accent-primary"
              />
              <div>
                <p className="font-medium text-sm">{p.copDesc}</p>
                <p className="text-xs text-muted-foreground">$1.234,56</p>
              </div>
            </label>

            <label
              className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                currency === "EUR"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name="currency"
                value="EUR"
                checked={currency === "EUR"}
                onChange={() => setCurrency("EUR")}
                className="size-4 accent-primary"
              />
              <div>
                <p className="font-medium text-sm">{p.eurDesc}</p>
                <p className="text-xs text-muted-foreground">1.234,56 €</p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
