import { Suspense } from 'react';
import { Login } from '../login';
const SignInPage = () => {
    return (<Suspense>
      <Login mode="signin"/>
    </Suspense>);
};
export default SignInPage;
