import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { FieldGroup } from "@workspace/ui/components/field"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { AuthPage } from "@/components/auth-page"
import { FormError, PasswordField, TextField } from "@/components/text-field"
import { authClient } from "@/lib/auth-client"

const signInInput = z.object({
  email: z.email("Enter an email address like name@example.com."),
  password: z.string().min(1, "Enter your password."),
})

export const Route = createFileRoute("/_auth/sign-in")({
  head: () => ({ meta: [{ title: "Sign in · Void Starter" }] }),
  component: SignIn,
})

function SignIn() {
  const router = useRouter()
  const form = useForm({
    resolver: zodResolver(signInInput),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await authClient.signIn.email(values)
    if (result.error) {
      form.setError("root.server", {
        message: "That email and password don't match. Check both and try again.",
      })
      return
    }
    await router.invalidate()
    await router.navigate({ to: "/notes" })
  })

  return (
    <AuthPage
      title="Sign in"
      description="Welcome back. Your notes are where you left them."
      footer={
        <>
          New here?{" "}
          <Link to="/sign-up" className="link text-primary">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <TextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
          />
          <PasswordField
            control={form.control}
            name="password"
            label="Password"
            autoComplete="current-password"
          />
          <FormError message={form.formState.errors.root?.server?.message} />
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </FieldGroup>
      </form>
    </AuthPage>
  )
}
