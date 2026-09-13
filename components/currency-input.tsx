"use client"

import { forwardRef } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function formatFromCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

type CurrencyInputProps = {
  value: number | null
  onValueChange: (value: number | null) => void
  id?: string
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

/**
 * Campo de moeda em Real. O usuário digita apenas os números e a vírgula
 * dos centavos aparece sozinha (digitar 1 2 3 4 5 vira "123,45").
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput({ value, onValueChange, className, ...props }, ref) {
    const display = value === null ? "" : formatFromCents(Math.round(value * 100))

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const digits = e.target.value.replace(/\D/g, "")
      if (digits === "") {
        onValueChange(null)
        return
      }
      const cents = Number.parseInt(digits, 10)
      onValueChange(cents / 100)
    }

    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          R$
        </span>
        <Input
          ref={ref}
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          className={cn("pl-9 tabular-nums", className)}
          {...props}
        />
      </div>
    )
  },
)
