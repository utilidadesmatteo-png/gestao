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
}

function formatBRLNumber(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Campo de moeda em Real no estilo "caixa registradora": a vírgula é
 * posicionada sozinha enquanto o usuário digita apenas os números.
 * Ex.: "150" vira "1,50", "2313" vira "23,13".
 *
 * Apagar todos os dígitos deixa o campo vazio e o valor vira null —
 * nunca gera NaN nem quebra os cálculos.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput({ value, onValueChange, className, ...props }, ref) {
    const [text, setText] = useState(value === null ? "" : formatBRLNumber(value))

    // Mantém o texto em sincronia quando o valor muda por fora
    // (reset do formulário, seleção de produto, etc.).
    useEffect(() => {
      setText(value === null ? "" : formatBRLNumber(value))
    }, [value])

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      // Só os dígitos contam; qualquer outro caractere é ignorado.
      const digits = e.target.value.replace(/\D/g, "")

      if (digits === "") {
        setText("")
        onValueChange(null)
        return
      }

      // Limita a um teto seguro para não estourar em valores absurdos.
      const num = Number.parseInt(digits.slice(0, 12), 10) / 100
      setText(formatBRLNumber(num))
      onValueChange(num)
    }

    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          R$
        </span>
        <Input
          ref={ref}
          inputMode="numeric"
          value={text}
          onChange={handleChange}
          className={cn("pl-9 tabular-nums", className)}
          {...props}
        />
      </div>
    )
  },
)
