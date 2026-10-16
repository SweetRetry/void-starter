import { Field, FieldError, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import type { ComponentProps } from "react"
import { type Control, Controller, type FieldPath, type FieldValues } from "react-hook-form"

interface TextFieldProps<T extends FieldValues> extends Omit<ComponentProps<typeof Input>, "name"> {
  control: Control<T>
  name: FieldPath<T>
  label: string
}

/** react-hook-form Controller + shadcn Field. The error line keeps its height so fields never jump. */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  ...input
}: TextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          <Input id={field.name} aria-invalid={fieldState.invalid} {...field} {...input} />
          <div className="min-h-5">
            <FieldError errors={[fieldState.error]} />
          </div>
        </Field>
      )}
    />
  )
}
