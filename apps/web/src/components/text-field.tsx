import { Field, FieldError, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { type ComponentProps, type ReactNode, useState } from "react"
import { type Control, Controller, type FieldPath, type FieldValues } from "react-hook-form"

interface TextFieldProps<T extends FieldValues> extends Omit<ComponentProps<typeof Input>, "name"> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  /** A small control on the label row, such as "Show" for a password */
  labelAction?: ReactNode
}

/** react-hook-form Controller + shadcn Field. The error line keeps its height so fields never jump. */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  labelAction,
  ...input
}: TextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            {labelAction}
          </div>
          <Input id={field.name} aria-invalid={fieldState.invalid} {...field} {...input} />
          <div className="min-h-5">
            <FieldError errors={[fieldState.error]} />
          </div>
        </Field>
      )}
    />
  )
}

type PasswordFieldProps<T extends FieldValues> = Omit<TextFieldProps<T>, "type" | "labelAction">

/** A password input with a Show/Hide toggle on the label row. */
export function PasswordField<T extends FieldValues>(props: PasswordFieldProps<T>) {
  const [visible, setVisible] = useState(false)

  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      labelAction={
        <button
          type="button"
          className="link text-xs text-muted-foreground"
          aria-controls={props.name}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? "Hide" : "Show"}
        </button>
      }
    />
  )
}

/** A server-side failure for the whole form, kept on screen until the next submit. */
export function FormError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  ) : null
}
