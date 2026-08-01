import { z } from 'zod';

export const adminUserSearchSchema = z.object({
	page: z.coerce.number().int().min(1).catch(1),
	pageSize: z.coerce
		.number()
		.pipe(z.union([z.literal(10), z.literal(25), z.literal(50)]))
		.catch(25),
	search: z.string().max(100).optional(),
	role: z.enum(['USER', 'ADMIN']).optional(),
	plan: z.enum(['FREE', 'TRIAL', 'PREMIUM']).optional(),
	status: z.enum(['ACTIVE', 'EXPIRED', 'CANCELLED']).optional(),
	accountStatus: z
		.enum(['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_DELETION', 'ANONYMIZED'])
		.optional(),
	activeFrom: z.string().datetime().optional(),
	activeTo: z.string().datetime().optional(),
	createdFrom: z.string().datetime().optional(),
	createdTo: z.string().datetime().optional(),
	sort: z.enum(['createdAt', 'email', 'lastName']).catch('createdAt'),
	order: z.enum(['asc', 'desc']).catch('desc'),
});
