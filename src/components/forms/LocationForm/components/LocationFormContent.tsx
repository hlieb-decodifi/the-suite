'use client';

import { UseFormReturn } from 'react-hook-form';
import { Separator } from '@/components/ui/separator';
import {
  FormInput,
  FormField,
  FormButtons,
} from '@/components/forms/components';
import { AddressAutocompleteInput } from '@/components/forms/AddressAutocompleteInput';
import { addressDataToLegacyFormat } from '@/utils/addressUtils';
import type { AddressData, Place } from '@/api/places/types';
import { LocationFormValues } from '../schema';
import { useRef, forwardRef } from 'react';

// Component to render all form fields
function LocationFields({
  register,
  errors,
  selectedAddress,
  onAddressChange,
  formValues,
  onFieldChange,
}: {
  register: UseFormReturn<LocationFormValues>['register'];
  errors: UseFormReturn<LocationFormValues>['formState']['errors'];
  selectedAddress: AddressData | null;
  onAddressChange: (address: AddressData | null) => void;
  formValues: LocationFormValues;
  onFieldChange: (field: string, value: string) => void;
}) {
  // Check if a Google Place has been selected
  const hasSelectedPlace = !!formValues.googlePlaceId;

  // Check if any fields have been manually modified after Google Places selection
  const hasManualEdits =
    hasSelectedPlace &&
    (!formValues.latitude ||
      !formValues.longitude ||
      formValues.googlePlaceId === 'MANUAL_EDIT');

  return (
    <>
      <FormField
        id="address-search"
        label="Address Search *"
        error={errors.address?.message}
      >
        <AddressAutocompleteInput
          value={selectedAddress}
          onChange={onAddressChange}
          placeholder="Enter your address..."
          className="border-[#ECECEC] focus:border-[#DEA85B] focus:ring-[#DEA85B]"
        />
      </FormField>

      {hasManualEdits && (
        <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
          <div className="text-sm text-orange-800">
            <strong>⚠️ Manual edits detected.</strong> You've modified the
            address fields manually. Coordinates and location accuracy may no
            longer be valid. Please select a new address from the search
            dropdown above to ensure accuracy.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormInput
          id="country"
          label="Country *"
          {...register('country', {
            onChange: (e) => onFieldChange('country', e.target.value),
          })}
          hasError={!!errors.country}
          error={errors.country?.message}
          disabled={!hasSelectedPlace}
          className={`border-[#ECECEC] focus:border-[#DEA85B] focus:ring-[#DEA85B] ${
            !hasSelectedPlace ? 'bg-gray-50 text-gray-500' : ''
          } ${hasManualEdits ? 'border-orange-300 bg-orange-50' : ''}`}
          placeholder={!hasSelectedPlace ? 'Select an address first' : ''}
        />

        <FormInput
          id="state"
          label="State/Province *"
          {...register('state', {
            onChange: (e) => onFieldChange('state', e.target.value),
          })}
          hasError={!!errors.state}
          error={errors.state?.message}
          disabled={!hasSelectedPlace}
          className={`border-[#ECECEC] focus:border-[#DEA85B] focus:ring-[#DEA85B] ${
            !hasSelectedPlace ? 'bg-gray-50 text-gray-500' : ''
          } ${hasManualEdits ? 'border-orange-300 bg-orange-50' : ''}`}
          placeholder={!hasSelectedPlace ? 'Select an address first' : ''}
        />

        <FormInput
          id="city"
          label="City *"
          {...register('city', {
            onChange: (e) => onFieldChange('city', e.target.value),
          })}
          hasError={!!errors.city}
          error={errors.city?.message}
          disabled={!hasSelectedPlace}
          className={`border-[#ECECEC] focus:border-[#DEA85B] focus:ring-[#DEA85B] ${
            !hasSelectedPlace ? 'bg-gray-50 text-gray-500' : ''
          } ${hasManualEdits ? 'border-orange-300 bg-orange-50' : ''}`}
          placeholder={!hasSelectedPlace ? 'Select an address first' : ''}
        />

        <FormInput
          id="streetAddress"
          label="Street Address *"
          {...register('streetAddress', {
            onChange: (e) => onFieldChange('streetAddress', e.target.value),
          })}
          hasError={!!errors.streetAddress}
          error={errors.streetAddress?.message}
          disabled={!hasSelectedPlace}
          className={`border-[#ECECEC] focus:border-[#DEA85B] focus:ring-[#DEA85B] ${
            !hasSelectedPlace ? 'bg-gray-50 text-gray-500' : ''
          } ${hasManualEdits ? 'border-orange-300 bg-orange-50' : ''}`}
          placeholder={!hasSelectedPlace ? 'Select an address first' : ''}
        />
      </div>

      <FormInput
        id="apartment"
        label="Apartment/Unit (optional)"
        {...register('apartment')}
        hasError={!!errors.apartment}
        error={errors.apartment?.message}
        placeholder="Apt, Suite, Unit, etc."
        className="border-[#ECECEC] focus:border-[#DEA85B] focus:ring-[#DEA85B]"
      />

      {!hasSelectedPlace && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <div className="text-sm text-yellow-800">
            <strong>Please select an address from the dropdown above.</strong>{' '}
            This ensures accurate location data and coordinates are saved.
          </div>
        </div>
      )}
    </>
  );
}

type LocationFormContentProps = {
  form: UseFormReturn<LocationFormValues>;
  isPending: boolean;
  saveSuccess: boolean;
  onSubmit: (data: LocationFormValues) => void;
  onCancel: () => void;
  hideButtons?: boolean;
};

export const LocationFormContent = forwardRef<
  HTMLFormElement,
  LocationFormContentProps
>(function LocationFormContent(
  { form, isPending, saveSuccess, onSubmit, onCancel, hideButtons = false },
  ref,
) {
  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors },
  } = form;

  // Watch form values for address validation
  const currentFormValues = form.watch();

  // Store the original Google Places data for validation
  const originalGoogleDataRef = useRef<{
    country: string;
    state: string;
    city: string;
    streetAddress: string;
    googlePlaceId: string;
  } | null>(null);

  // Convert current form values to AddressData format for display
  // Show as selected if we have a valid Google Place ID or if we have existing address data
  const selectedAddress: AddressData | null =
    currentFormValues.googlePlaceId &&
    currentFormValues.googlePlaceId !== 'MANUAL_EDIT'
      ? {
          google_place_id: currentFormValues.googlePlaceId,
          formatted_address:
            currentFormValues.address ||
            `${currentFormValues.streetAddress || ''}, ${currentFormValues.city || ''}, ${currentFormValues.state || ''}, ${currentFormValues.country || ''}`
              .replace(/^,\s*|,\s*$|(?:,\s*){2,}/g, '')
              .trim(),
          country: currentFormValues.country || '',
          city: currentFormValues.city || '',
          state: currentFormValues.state || '',
          street_address: currentFormValues.streetAddress || '',
          latitude: currentFormValues.latitude || 0,
          longitude: currentFormValues.longitude || 0,
          place_types: [],
          google_data_raw: {} as Place,
        }
      : null;

  const handleAddressChange = async (addressData: AddressData | null) => {
    console.log('LocationForm: handleAddressChange called with:', addressData);

    if (addressData) {
      // Convert Google Places data to form format
      const legacyFormat = addressDataToLegacyFormat(addressData);

      console.log('LocationForm: Legacy format conversion:', legacyFormat);
      console.log('LocationForm: Original lat/lng from AddressData:', {
        latitude: addressData.latitude,
        longitude: addressData.longitude,
        google_place_id: addressData.google_place_id,
      });

      setValue('address', addressData.formatted_address);
      setValue('country', legacyFormat.country);
      setValue('state', legacyFormat.state);
      setValue('city', legacyFormat.city);
      setValue('streetAddress', legacyFormat.street_address);
      // Don't overwrite apartment field when selecting from Google Places
      // User can manually add apartment after selecting address

      // Store enhanced Google Places data
      setValue('googlePlaceId', addressData.google_place_id);
      setValue('latitude', addressData.latitude);
      setValue('longitude', addressData.longitude);

      // Store original data for validation
      originalGoogleDataRef.current = {
        country: legacyFormat.country,
        state: legacyFormat.state,
        city: legacyFormat.city,
        streetAddress: legacyFormat.street_address,
        googlePlaceId: addressData.google_place_id,
      };

      console.log('LocationForm: Form fields updated');
      console.log('LocationForm: Set latitude to:', addressData.latitude);
      console.log('LocationForm: Set longitude to:', addressData.longitude);

      // Trigger validation to clear any errors
      await trigger(['address', 'country', 'state', 'city', 'streetAddress']);

      console.log('LocationForm: Validation triggered');

      // Check the form values after setting
      const updatedValues = form.getValues();
      console.log('LocationForm: Form values after update:', updatedValues);
    } else {
      console.log('LocationForm: Clearing all fields');
      // Clear all fields except apartment (user might want to keep it)
      setValue('address', '');
      setValue('country', '');
      setValue('state', '');
      setValue('city', '');
      setValue('streetAddress', '');
      setValue('googlePlaceId', '');
      setValue('latitude', undefined);
      setValue('longitude', undefined);
      originalGoogleDataRef.current = null;
      // Note: Not clearing apartment field intentionally
    }
  };

  // Handle manual field changes that invalidate Google Places data
  const handleFieldChange = (field: string, value: string) => {
    if (!originalGoogleDataRef.current) {
      // If we don't have original Google data stored, but the form has a valid Google Place ID
      // (meaning we're editing existing data), create the reference from current form values
      if (
        currentFormValues.googlePlaceId &&
        currentFormValues.googlePlaceId !== 'MANUAL_EDIT'
      ) {
        originalGoogleDataRef.current = {
          country: currentFormValues.country || '',
          state: currentFormValues.state || '',
          city: currentFormValues.city || '',
          streetAddress: currentFormValues.streetAddress || '',
          googlePlaceId: currentFormValues.googlePlaceId,
        };
      } else {
        // No original data and no valid Google Place ID, so any edit is fine
        return;
      }
    }

    // Check if the new value differs from the original Google Places data
    const originalValue =
      originalGoogleDataRef.current[
        field as keyof typeof originalGoogleDataRef.current
      ];

    if (originalValue && value !== originalValue) {
      console.log(`Manual edit detected in ${field}:`, {
        original: originalValue,
        new: value,
      });

      // Mark as manually edited by setting a special flag
      setValue('googlePlaceId', 'MANUAL_EDIT');
      setValue('latitude', undefined);
      setValue('longitude', undefined);

      console.log('Cleared coordinates due to manual edit');
    }
  };

  return (
    <form ref={ref} onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <LocationFields
        register={register}
        errors={errors}
        selectedAddress={selectedAddress}
        onAddressChange={handleAddressChange}
        formValues={currentFormValues}
        onFieldChange={handleFieldChange}
      />

      {!hideButtons && (
        <>
          <Separator className="my-4" />
          <FormButtons
            isPending={isPending}
            saveSuccess={saveSuccess}
            onCancel={onCancel}
          />
        </>
      )}
    </form>
  );
});
