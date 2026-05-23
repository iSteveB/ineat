import { ApiRequestError } from '@/lib/api-client';

const SENSITIVE_ERROR_PATTERNS = [
	/api[_ -]?key/i,
	/api[_ -]?secret/i,
	/secret/i,
	/token/i,
	/password/i,
	/invalid signature/i,
	/signature/i,
	/cloudinary/i,
	/CLOUDINARY_/i,
	/stack/i,
	/prisma/i,
	/postgres/i,
	/redis/i,
	/trace/i,
	/exception/i,
];

const isSensitiveErrorMessage = (message: string): boolean =>
	SENSITIVE_ERROR_PATTERNS.some((pattern) => pattern.test(message));

export const getUserFacingErrorMessage = (
	error: unknown,
	fallbackMessage: string
): string => {
	if (error instanceof ApiRequestError) {
		return error.message || fallbackMessage;
	}

	if (error instanceof Error && !isSensitiveErrorMessage(error.message)) {
		return error.message || fallbackMessage;
	}

	return fallbackMessage;
};
