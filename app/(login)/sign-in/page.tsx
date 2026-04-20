import { Suspense } from "react";

import { Login } from "../login";

const LoginFallback = () => {
  return <div className="min-h-[100dvh] bg-background" />;
};

const SignInPage = () => {
  return (
    <Suspense fallback={<LoginFallback />}>
      <Login mode="signin" />
    </Suspense>
  );
};

export default SignInPage;
