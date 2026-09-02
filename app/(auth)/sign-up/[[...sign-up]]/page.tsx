import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";

const SignUpPage = () => (
  <Suspense>
    <AuthForm mode="sign-up" />
  </Suspense>
);

export default SignUpPage;
