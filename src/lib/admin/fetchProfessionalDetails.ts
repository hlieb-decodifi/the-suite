import { createAdminClient } from '@/lib/supabase/server';
import { ServiceUI } from '@/types/services';
import { Appointment } from '@/types/appointments';


export type ProfessionalDetails = {
	id: string;
	email: string;
	fullName?: string;
	createdAt?: string | undefined;
	professionalProfileId: string | null;
	services: ServiceUI[];
	appointments: Appointment[];
	maxServices?: number | null;
};

/**
 * Fetch all details for a professional by userId for admin modal
 */
export async function fetchProfessionalDetails(userId: string): Promise<ProfessionalDetails | null> {
	const supabase = await createAdminClient();

	// 1. Get user email from auth.users
	const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
	if (authError || !authUser?.user) return null;

	// 2. Get professional profile
	let professionalProfileId: string | null = null;
	let maxServices: number | null = null;
	const { data: profile, error: profileError } = await supabase
		.from('professional_profiles')
		.select('id, is_published, max_services, created_at')
		.eq('user_id', userId)
		.single();
	let createdAt: string | undefined = undefined;
	if (!profileError && profile) {
		professionalProfileId = profile.id;
		maxServices = profile.max_services ?? null;
		createdAt = profile.created_at ?? undefined;
	}

		// 3. Get services for this professional
		let services: ServiceUI[] = [];
		if (professionalProfileId) {
			const { data: servicesData } = await supabase
				.from('services')
				.select('id, name, price, duration, description')
				.eq('professional_profile_id', professionalProfileId);
			services = (servicesData || []).map((s: {
				id: string;
				name: string;
				price: number;
				duration: number | string;
				description?: string | null;
			}): ServiceUI => ({
				id: s.id,
				name: s.name,
				price: s.price,
				duration: typeof s.duration === 'number' ? `${s.duration} min` : String(s.duration),
				description: s.description ?? '',
			}));
		}

		// 4. Get appointments for this professional
		let appointments: Appointment[] = [];
		if (professionalProfileId) {
			const { data: appointmentsData } = await supabase
				.from('appointments')
				.select('id, start_time, end_time, status')
				.eq('professional_profile_id', professionalProfileId);
			if (Array.isArray(appointmentsData)) {
				appointments = appointmentsData
					.filter(a =>
						a && typeof a.id === 'string' && typeof a.start_time === 'string' && typeof a.end_time === 'string' && typeof a.status === 'string'
					)
					.map(a => ({
						id: a.id,
						startTime: a.start_time,
						endTime: a.end_time,
						client: '', // Not available
						professional: '', // Not available
						service: '', // Not available
						status: a.status,
					}));
			}
		}

		return {
			id: userId,
			email: authUser.user.email ?? '',
			professionalProfileId,
			services,
			appointments,
			maxServices,
			createdAt,
		};
	}
