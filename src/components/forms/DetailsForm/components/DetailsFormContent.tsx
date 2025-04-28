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

// Component to render all form fields
function DetailsFields({
  register,
  errors,
  phone,
  onPhoneChange,
}: {
  register: UseFormReturn<DetailsFormValues>['register'];
  errors: UseFormReturn<DetailsFormValues>['formState']['errors'];
  phone: string | undefined;
  onPhoneChange: (value: string) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
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

      <FormField id="phone" label="Phone Number" error={errors.phone?.message}>
        <PhoneInput
          defaultCountry="us"
          value={phone || ''}
          onChange={onPhoneChange}
          inputClassName="flex h-10 w-full rounded-md border border-[#ECECEC] px-3 py-2 text-sm ring-offset-background focus:border-[#DEA85B] focus:ring-[#DEA85B]"
        />
      </FormField>
    </>
  );
}

type DetailsFormContentProps = {
  form: UseFormReturn<DetailsFormValues>;
  isPending: boolean;
  saveSuccess: boolean;
  onSubmit: (data: DetailsFormValues) => void;
  onCancel: () => void;
};

export function DetailsFormContent({
  form,
  isPending,
  saveSuccess,
  onSubmit,
  onCancel,
}: DetailsFormContentProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const phone = watch('phone');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <DetailsFields
        register={register}
        errors={errors}
        phone={phone}
        onPhoneChange={(value) => setValue('phone', value)}
      />

      <Separator className="my-4" />

      <FormButtons
        isPending={isPending}
        saveSuccess={saveSuccess}
        onCancel={onCancel}
      />
    </form>
  );
}
