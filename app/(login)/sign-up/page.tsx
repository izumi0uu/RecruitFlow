import { Suspense } from 'react';
import { Login } from '../login';
const SignUpPage = () => {
    return (<Suspense>
      <Login mode="signup"/>
    </Suspense>);
};
export default SignUpPage;
