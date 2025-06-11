'use client';

import { UseFormReturn } from 'react-hook-form';
import { Separator } from '@/components/ui/separator';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import {
  FormInput,
  FormField,
  FormButtons,
} from '@/components/forms/components';
import { DetailsFormValues } from '../schema';

// Phone validation is handled by the schema, no need for real-time validation

// Component to render all form fields
function DetailsFields({
  register,
  errors,
  phone,
  onPhoneChange,
  clearErrors,
}: {
  register: UseFormReturn<DetailsFormValues>['register'];
  errors: UseFormReturn<DetailsFormValues>['formState']['errors'];
  phone: string | undefined;
  onPhoneChange: (value: string) => void;
  clearErrors: UseFormReturn<DetailsFormValues>['clearErrors'];
}) {
  const handlePhoneChange = (value: string) => {
    // Clear phone errors when user types
    clearErrors('phone');
    onPhoneChange(value);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormInput
          id="firstName"
          label="First Name"
          {...register('firstName')}
          hasError={!!errors.firstName}
          error={errors.firstName?.message}
          className="border-[#ECECEC] focus:border-[#DEA85B] focus:ring-[#DEA85B]"
        />

        <FormInput
          id="lastName"
          label="Last Name"
          {...register('lastName')}
          hasError={!!errors.lastName}
          error={errors.lastName?.message}
          className="border-[#ECECEC] focus:border-[#DEA85B] focus:ring-[#DEA85B]"
        />
      </div>

      <FormField 
        id="phone" 
        label="Phone Number (Optional)" 
        error={errors.phone?.message}
      >
        <PhoneInput
          defaultCountry="us"
          value={phone || ''}
          onChange={handlePhoneChange}
          inputClassName={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-background focus:ring-[#DEA85B] ${
            errors.phone 
              ? 'border-red-500 focus:border-red-500' 
              : 'border-[#ECECEC] focus:border-[#DEA85B]'
          }`}
        />
      </FormField>
    </>
  );
}

type DetailsFormContentProps = {
  form: UseFormReturn<DetailsFormValues>;
  isPending: boolean;
  saveSuccess: boolean;
  onCancel: () => void;
  onSubmit: (data: DetailsFormValues) => Promise<void>;
};

export function DetailsFormContent({
  form,
  isPending,
  saveSuccess,
  onCancel,
  onSubmit,
}: DetailsFormContentProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    clearErrors,
    formState: { errors },
  } = form;

  const phone = watch('phone');

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DetailsFields
        register={register}
        errors={errors}
        phone={phone}
        onPhoneChange={(value) => setValue('phone', value)}
        clearErrors={clearErrors}
      />

      <Separator className="my-3" />

      <FormButtons
        isPending={isPending}
        saveSuccess={saveSuccess}
        onCancel={onCancel}
      />
    </form>
  );
}
