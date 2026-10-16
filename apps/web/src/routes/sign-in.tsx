import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import { FieldGroup } from "@workspace/ui/components/field"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { AuthPage } from "@/components/auth-page"
import { TextField } from "@/components/text-field"
import { authClient } from "@/lib/auth-client"
import { getSocialProviders } from "@/server/session.functions"

const signInInput = z.object({
  email: z.email("Enter an email address like name@example.com."),
  password: z.string().min(1, "Enter your password."),
})

export const Route = createFileRoute("/sign-in")({
  beforeLoad: ({ context }) => {
    if (context.viewer) throw redirect({ to: "/notes" })
  },
  loader: () => getSocialProviders(),
  head: () => ({ meta: [{ title: "Sign in · Void Starter" }] }),
  component: SignIn,
})

function SignIn() {
  const providers = Route.useLoaderData()
  const router = useRouter()
  const form = useForm({
    resolver: zodResolver(signInInput),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await authClient.signIn.email(values)
    if (result.error) {
      toast.error("That email and password don't match. Check both and try again.")
      return
    }
    await router.invalidate()
    await router.navigate({ to: "/notes" })
  })

  return (
    <AuthPage
      title="Sign in"
      providers={providers}
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
          />
          <TextField
            control={form.control}
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
          />
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </FieldGroup>
      </form>
    </AuthPage>
  )
}
