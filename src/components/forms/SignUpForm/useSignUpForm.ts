import { useRouter } from 'next/navigation';
import { useSignUp } from '@/api/auth';
import { SignUpFormValues, defaultSignUpValues } from './schema';
import { useQueryErrorHandler } from '@/hooks/useQueryErrorHandler';

export function useSignUpForm() {
  const router = useRouter();
  const { onError } = useQueryErrorHandler();
  const { mutate: signUp, isPending } = useSignUp();

  const onSubmit = async (values: SignUpFormValues) => {
    signUp(
      {
        email: values.email,
        password: values.password,
        full_name: values.full_name,
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
    defaultValues: defaultSignUpValues,
    onSubmit,
    isPending,
  };
} 