import type { AuthClientTypes } from '@walletconnect/auth-client';
import type { ErrorResponse } from '@walletconnect/jsonrpc-utils';

export const WALLET_CONNECT_PROJECT_ID = "230665275017e0cd1e9741c2eda1767a";

export const WALLET_CONNECT_METADATA: AuthClientTypes.Metadata = {
	name: "Demo",
	description: "Demo",
	url: "http://localhost:5173/",
	icons: [""]
};

export const SESSION_REQUEST_SEND_TRANSACTION = 'eth_sendTransaction';
export const SESSION_REQUEST_ETH_SIGN = 'eth_sign';
export const SESSION_REQUEST_PERSONAL_SIGN = 'personal_sign';
export const SESSION_REQUEST_ETH_SIGN_V4 = 'eth_signTypedData_v4';

export const UNEXPECTED_ERROR: ErrorResponse = {
	code: 20001,
	message: 'Unexpected error.'
};

export const CONTEXT_VALIDATION_ISSCAM = 'ISSCAM';
