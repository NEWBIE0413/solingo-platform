import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";

const SignInPage = () => (
  <Suspense>
    <AuthForm mode="sign-in" />
  </Suspense>
);

export default SignInPage;
