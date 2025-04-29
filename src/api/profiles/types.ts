import { Database } from "../../../supabase/types";

export type Address = Database["public"]["Tables"]["addresses"]["Row"];
export type ClientProfile = Database["public"]["Tables"]["client_profiles"]["Row"];

export type AddressFormData = {
  country: string;
  state: string;
  city: string;
  streetAddress: string;
};

export type DetailFormData = {
  firstName: string;
  lastName: string;
  phone: string;
};

export type ClientProfileWithAddress = ClientProfile & {
  address: Address | null;
  user: {
    first_name: string;
    last_name: string;
  };
};

// Fix for Form Values
export type LocationFormData = {
  address: string;
  country: string;
  state: string;
  city: string;
  streetAddress: string;
}; 