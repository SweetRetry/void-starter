import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { FieldGroup } from "@workspace/ui/components/field"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { AuthPage } from "@/components/auth-page"
import { FormError, PasswordField, TextField } from "@/components/text-field"
import { authClient } from "@/lib/auth-client"

const signUpInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(100, "Keep your name under 100 characters."),
  email: z.email("Enter an email address like name@example.com."),
  password: z.string().min(8, "Use at least 8 characters.").max(128, "Use at most 128 characters."),
})

export const Route = createFileRoute("/_auth/sign-up")({
  head: () => ({ meta: [{ title: "Create an account · Void Starter" }] }),
  component: SignUp,
})

function SignUp() {
  const router = useRouter()
  const form = useForm({
    resolver: zodResolver(signUpInput),
    defaultValues: { name: "", email: "", password: "" },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await authClient.signUp.email(values)
    if (result.error) {
      form.setError("root.server", {
        message:
          result.error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
            ? "An account with this email already exists. Sign in instead."
            : "The account wasn't created. Try again in a moment.",
      })
      return
    }
    await router.invalidate()
    await router.navigate({ to: "/notes" })
  })

  return (
    <AuthPage
      title="Create an account"
      description="Notes in D1, files in R2, summaries through AI Gateway."
      footer={
        <>
          Have an account?{" "}
          <Link to="/sign-in" className="link text-primary">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <TextField
            control={form.control}
            name="name"
            label="Name"
            autoComplete="name"
            autoFocus
          />
          <TextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
          />
          <PasswordField
            control={form.control}
            name="password"
            label="Password"
            autoComplete="new-password"
          />
          <FormError message={form.formState.errors.root?.server?.message} />
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </FieldGroup>
      </form>
    </AuthPage>
  )
}
