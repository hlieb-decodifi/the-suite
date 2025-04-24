import { RadioGroup } from '@/components/forms/components';
import { FieldErrors, Controller, Control } from 'react-hook-form';
import { SignUpFormValues, userTypes } from '../schema';

type UserTypesFieldsProps = {
  errors: FieldErrors<SignUpFormValues>;
  control: Control<SignUpFormValues>;
};

export function UserTypesFields({ errors, control }: UserTypesFieldsProps) {
  const userTypeOptions = userTypes.map((type) => ({
    value: type,
    label: `Register as a ${type}`,
  }));

  return (
    <Controller
      name="userType"
      control={control}
      render={({ field }) => (
        <RadioGroup
          options={userTypeOptions}
          error={errors.userType?.message || undefined}
          {...field}
        />
      )}
    />
  );
}
