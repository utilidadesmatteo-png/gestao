"use client"

import { forwardRef, useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type CurrencyInputProps = {
  value: number | null
  onValueChange: (value: number | null) => void
  id?: string
  placeholder?: string
  autoFocus?: boolean
  className?: string
  // Quando true, a vírgula é posicionada sozinha enquanto o usuário digita
  // (estilo caixa registradora): "150" vira "1,50", "2313" vira "23,13".
  autoDecimal?: boolean
}

function formatBRLNumber(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Converte o texto digitado pelo usuário em número.
 * Aceita os formatos comuns: "51,30", "51.30", "5.130,58", "5130.58".
 * Regra: se houver vírgula E ponto, o último símbolo é o separador decimal
 * e o outro é separador de milhar. Se houver só um, ele é o decimal.
 */
function parseInput(text: string): number | null {
  const cleaned = text.replace(/[^\d.,]/g, "")
  if (cleaned === "") return null

  const hasComma = cleaned.includes(",")
  const hasDot = cleaned.includes(".")

  let normalized: string
  if (hasComma && hasDot) {
    // O separador decimal é o que aparece por último.
    const decimalSep = cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".") ? "," : "."
    const thousandSep = decimalSep === "," ? "." : ","
    normalized = cleaned.split(thousandSep).join("").replace(decimalSep, ".")
  } else if (hasComma) {
    normalized = cleaned.replace(",", ".")
  } else {
    normalized = cleaned
  }

  const num = Number.parseFloat(normalized)
  return Number.isFinite(num) ? num : null
}

/**
 * Campo de moeda em Real. O usuário digita o preço normalmente
 * (ex.: 51,30) e o valor é formatado ao sair do campo.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput({ value, onValueChange, className, autoDecimal, ...props }, ref) {
    const [text, setText] = useState(value === null ? "" : formatBRLNumber(value))
    const [focused, setFocused] = useState(false)

    // Mantém o texto em sincronia quando o valor muda por fora (reset, etc.)
    // sem atrapalhar a digitação enquanto o campo está em foco.
    useEffect(() => {
      if (!focused || autoDecimal) {
        setText(value === null ? "" : formatBRLNumber(value))
      }
    }, [value, focused, autoDecimal])

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value

      // Modo caixa registradora: só contam os dígitos; a vírgula vai sozinha.
      if (autoDecimal) {
        const digits = raw.replace(/\D/g, "")
        if (digits === "") {
          setText("")
          onValueChange(null)
          return
        }
        const num = Number.parseInt(digits, 10) / 100
        setText(formatBRLNumber(num))
        onValueChange(num)
        return
      }

      setText(raw)
      onValueChange(parseInput(raw))
    }

    function handleFocus() {
      setFocused(true)
    }

    function handleBlur() {
      setFocused(false)
      if (autoDecimal) return
      const parsed = parseInput(text)
      setText(parsed === null ? "" : formatBRLNumber(parsed))
    }

    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          R$
        </span>
        <Input
          ref={ref}
          inputMode="decimal"
          value={text}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn("pl-9 tabular-nums", className)}
          {...props}
        />
      </div>
    )
  },
)
