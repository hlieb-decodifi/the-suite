import { useRouter } from 'next/navigation';
import { useSignIn } from '@/api/auth';
import { SignInFormValues, defaultSignInValues } from './schema';
import { useQueryErrorHandler } from '@/hooks/useQueryErrorHandler';

export function useSignInForm() {
  const router = useRouter();
  const { onError } = useQueryErrorHandler();
  const { mutate: signIn, isPending } = useSignIn();

  const onSubmit = async (values: SignInFormValues) => {
    signIn(
      {
        email: values.email,
        password: values.password,
      },
      {
        onSuccess: (data) => {
          if (data.error) {
            onError(data.error);
            return;
          }
          if (data.user) {
            router.push('/dashboard');
          }
        },
        onError,
      }
    );
  };

  return {
    defaultValues: defaultSignInValues,
    onSubmit,
    isPending,
  };
} 