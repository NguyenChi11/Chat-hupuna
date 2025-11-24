// app\login\page.tsx

'use client';
import { Suspense } from 'react';
import LoginForm from '../../components/layout/login-form';
export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
