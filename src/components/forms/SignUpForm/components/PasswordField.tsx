import { PasswordInput } from '@/components/forms/components';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { SignUpFormValues } from '../schema';

type PasswordFieldProps = {
  register: UseFormRegister<SignUpFormValues>;
  errors: FieldErrors<SignUpFormValues>;
};

export function PasswordField({ register, errors }: PasswordFieldProps) {
  return (
    <PasswordInput
      id="password"
      label="Password"
      placeholder="Enter your password"
      {...register('password')}
      hasError={!!errors.password}
      error={errors.password?.message}
    />
  );
}
