import * as React from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

import { Input } from "~/components/ui/input"
import { cn } from "~/lib/utils"

function PasswordInput({
  className,
  // `type` is intentionally ignored — visibility is controlled internally.
  type: _type,
  ...props
}: React.ComponentProps<"input">) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        data-slot="password-input"
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={props.disabled}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-2xl text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        {visible ? (
          <EyeOffIcon className="size-[18px]" />
        ) : (
          <EyeIcon className="size-[18px]" />
        )}
      </button>
    </div>
  )
}

export { PasswordInput }
