import { Suspense } from "react";

import { Login } from "../login";

const LoginFallback = () => {
  return <div className="min-h-[100dvh] bg-background" />;
};

const SignUpPage = () => {
  return (
    <Suspense fallback={<LoginFallback />}>
      <Login mode="signup" />
    </Suspense>
  );
};

export default SignUpPage;
