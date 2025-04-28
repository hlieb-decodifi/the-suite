'use client';

import { UseFormReturn } from 'react-hook-form';
import { Separator } from '@/components/ui/separator';
import {
  FormInput,
  FormField,
  FormButtons,
  AddressSearchField,
} from '@/components/forms/components';
import { LocationFormValues } from '../schema';

// Component to render all form fields
function LocationFields({
  register,
  errors,
  address,
  onAddressChange,
  onAddressSelect,
}: {
  register: UseFormReturn<LocationFormValues>['register'];
  errors: UseFormReturn<LocationFormValues>['formState']['errors'];
  address: string | undefined;
  onAddressChange: (value: string) => void;
  onAddressSelect: (
    address: string,
    country: string,
    state: string,
    city: string,
    streetAddress: string,
  ) => void;
}) {
  return (
    <>
      <FormField
        id="address-search"
        label="Address Search"
        error={errors.address?.message}
      >
        <AddressSearchField
          value={address || ''}
          onChange={onAddressChange}
          onAddressSelect={onAddressSelect}
        />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <FormInput
          id="country"
          label="Country"
          {...register('country')}
          hasError={!!errors.country}
          error={errors.country?.message}
          className="border-[#ECECEC] focus:border-[#DEA85B] focus:ring-[#DEA85B]"
        />

        <FormInput
          id="state"
          label="State/Province"
          {...register('state')}
          hasError={!!errors.state}
          error={errors.state?.message}
          className="border-[#ECECEC] focus:border-[#DEA85B] focus:ring-[#DEA85B]"
        />

        <FormInput
          id="city"
          label="City"
          {...register('city')}
          hasError={!!errors.city}
          error={errors.city?.message}
          className="border-[#ECECEC] focus:border-[#DEA85B] focus:ring-[#DEA85B]"
        />

        <FormInput
          id="streetAddress"
          label="Street Address"
          {...register('streetAddress')}
          hasError={!!errors.streetAddress}
          error={errors.streetAddress?.message}
          className="border-[#ECECEC] focus:border-[#DEA85B] focus:ring-[#DEA85B]"
        />
      </div>
    </>
  );
}

type LocationFormContentProps = {
  form: UseFormReturn<LocationFormValues>;
  isPending: boolean;
  saveSuccess: boolean;
  onSubmit: (data: LocationFormValues) => void;
  onCancel: () => void;
};

export function LocationFormContent({
  form,
  isPending,
  saveSuccess,
  onSubmit,
  onCancel,
}: LocationFormContentProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const address = watch('address');

  const handleAddressSelect = (
    fullAddress: string,
    country: string,
    state: string,
    city: string,
    streetAddress: string,
  ) => {
    setValue('address', fullAddress);
    setValue('country', country);
    setValue('state', state);
    setValue('city', city);
    setValue('streetAddress', streetAddress);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <LocationFields
        register={register}
        errors={errors}
        address={address}
        onAddressChange={(value) => setValue('address', value)}
        onAddressSelect={handleAddressSelect}
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
