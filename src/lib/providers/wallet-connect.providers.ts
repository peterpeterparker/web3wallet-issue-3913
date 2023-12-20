import { ETH_CHAIN_ID } from '$lib/constants/eth.constants';
import {
	SESSION_REQUEST_ETH_SIGN,
	SESSION_REQUEST_ETH_SIGN_V4,
	SESSION_REQUEST_PERSONAL_SIGN,
	SESSION_REQUEST_SEND_TRANSACTION,
	WALLET_CONNECT_METADATA, WALLET_CONNECT_PROJECT_ID
} from '$lib/constants/wallet-connect.constants';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import { Core } from '@walletconnect/core';
import type { JsonRpcResponse } from '@walletconnect/jsonrpc-utils';
import { formatJsonRpcResult, type ErrorResponse } from '@walletconnect/jsonrpc-utils';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import { Web3Wallet, type Web3WalletTypes } from '@walletconnect/web3wallet';
import type { PairingTypes } from '@walletconnect/types';

export const initWalletConnect = async ({
	uri,
	address
}: {
	uri: string;
	address: ETH_ADDRESS;
}): Promise<WalletConnectListener> => {
	const clearLocalStorage = () => {
		const keys = Object.keys(localStorage).filter((key) => key.startsWith('wc@'));
		keys.forEach((key) => localStorage.removeItem(key));
	};

	// During testing, we frequently encountered session approval failures with Uniswap due to the following reason:
	// Unexpected error while communicating with WalletConnect. / No matching key. pairing: 12345c....
	// The issue appears to be linked to incorrect cached information used by the WalletConnect library.
	// To address this, we clear the local storage of any WalletConnect keys to ensure the proper instantiation of a new Wec3Wallet object.
	clearLocalStorage();

	const web3wallet = await Web3Wallet.init({
		core: new Core({
			projectId: WALLET_CONNECT_PROJECT_ID
		}),
		metadata: WALLET_CONNECT_METADATA
	});

	console.log('INIt', web3wallet);

	const disconnectActiveSessions = async () => {
		console.log('disconnectActiveSessions');
		const disconnectExistingSessions = async ([_key, session]: [string, { topic: string }]) => {
			const { topic } = session;

			await web3wallet.disconnectSession({
				topic,
				reason: getSdkError('USER_DISCONNECTED')
			});
		};

		const promises = Object.entries(web3wallet.getActiveSessions()).map(disconnectExistingSessions);
		await Promise.all(promises);
	};

	// Some previous sessions might have not been properly closed, so we disconnect those to have a clean state.
	await disconnectActiveSessions();

	const sessionProposal = (callback: (proposal: Web3WalletTypes.SessionProposal) => void) => {
		console.log('sessionProposal');
		web3wallet.on('session_proposal', callback);
	};

	const sessionDelete = (callback: () => void) => {
		console.log('sessionDelete');
		web3wallet.on('session_delete', callback);
	};

	const sessionRequest = (callback: (request: Web3WalletTypes.SessionRequest) => Promise<void>) => {
		console.log('sessionRequest');
		web3wallet.on('session_request', callback);
	};

	const approveSession = async (proposal: Web3WalletTypes.SessionProposal) => {
		console.log('approveSession');
		const { params } = proposal;

		const namespaces = buildApprovedNamespaces({
			proposal: params,
			supportedNamespaces: {
				eip155: {
					chains: [`eip155:1`, `eip155:${ETH_CHAIN_ID}`],
					methods: [
						SESSION_REQUEST_SEND_TRANSACTION,
						SESSION_REQUEST_ETH_SIGN,
						SESSION_REQUEST_PERSONAL_SIGN,
						SESSION_REQUEST_ETH_SIGN_V4
					],
					events: ['accountsChanged', 'chainChanged'],
					accounts: [
						`eip155:1:${address}`,
						`eip155:${ETH_CHAIN_ID}:${address}`
					]
				}
			}
		});

		await web3wallet.approveSession({
			id: proposal.id,
			namespaces
		});
	};

	const rejectSession = async (proposal: Web3WalletTypes.SessionProposal) => {
		console.log('rejectSession');
		const { id } = proposal;

		await web3wallet.rejectSession({
			id,
			reason: getSdkError('USER_REJECTED_METHODS')
		});
	};

	const respond = async ({ topic, response }: { topic: string; response: JsonRpcResponse }) => {
		console.log('respond');
		await web3wallet.respondSessionRequest({ topic, response });
	}

	const rejectRequest = async ({
		id,
		topic,
		error
	}: {
		id: number;
		topic: string;
		error: ErrorResponse;
	}) => {
		console.log('rejectRequest');
		await respond({
			topic,
			response: {
				id,
				jsonrpc: '2.0',
				error
			}
		});
	}

	const approveRequest = async ({
		id,
		topic,
		message
	}: {
		id: number;
		topic: string;
		message: string;
	}) => {
		console.log('approveRequest');
		await respond({
			topic,
			response: formatJsonRpcResult(id, message)
		});
	}

	return {
		pair: async (): Promise<PairingTypes.Struct | undefined> => {
			console.log('PAIR');
			try {
				const result = await web3wallet.core.pairing.pair({ uri });
				return result;
			} catch (err) {
				console.error('--->', err);
			}
		},
		approveSession,
		rejectSession,
		rejectRequest,
		approveRequest,
		sessionProposal,
		sessionDelete,
		sessionRequest,
		disconnect: async () => {
			const disconnectPairings = async () => {
				const pairings = web3wallet.engine.signClient.core.pairing.pairings.values;

				for (const pairing of pairings) {
					const { topic } = pairing;

					await web3wallet.disconnectSession({
						topic,
						reason: getSdkError('USER_DISCONNECTED')
					});
				}
			};

			await disconnectActiveSessions();

			// Clean-up in case other pairings are still open.
			await disconnectPairings();
		}
	};
};
