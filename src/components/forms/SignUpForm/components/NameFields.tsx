import { FormInput } from '@/components/forms/components';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { SignUpFormValues } from '../schema';

type NameFieldsProps = {
  register: UseFormRegister<SignUpFormValues>;
  errors: FieldErrors<SignUpFormValues>;
};

export function NameFields({ register, errors }: NameFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormInput
        id="firstName"
        label="First name"
        placeholder="Enter your first name"
        {...register('firstName')}
        hasError={!!errors.firstName}
        error={errors.firstName?.message}
      />

      <FormInput
        id="lastName"
        label="Last name"
        placeholder="Enter your last name"
        {...register('lastName')}
        hasError={!!errors.lastName}
        error={errors.lastName?.message}
      />
    </div>
  );
}
