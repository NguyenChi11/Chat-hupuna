// app\login\page.tsx

'use client';
import { Suspense } from 'react';
import LoginForm from '@/ui/login/login-form';
export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
