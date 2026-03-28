import { AuthVisualShell } from '@/components/auth/AuthVisualShell';
import { AuthFormView } from '@/components/auth/AuthFormView';

export default function Auth() {
  return (
    <AuthVisualShell innerClassName="items-center justify-center px-4 py-12">
      <AuthFormView layout="page" />
    </AuthVisualShell>
  );
}
