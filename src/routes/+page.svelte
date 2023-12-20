<script lang="ts">
	import type { WalletConnectListener } from '$lib/types/wallet-connect';
	import { initWalletConnect } from '$lib/providers/wallet-connect.providers';
	import type { Web3WalletTypes } from '@walletconnect/web3wallet';

	let address = '0xA6e7B4456CCf8239C19DA31dBaf02A5910E4785A';
	let uri = '';

	let listener: WalletConnectListener | undefined | null;
	let proposal: Web3WalletTypes.SessionProposal | undefined | null;

	const resetListener = () => {
		listener = null;
		proposal = null;
	};

	const initListener = async (uri: string) => {
		try {
			await listener?.disconnect();

			listener = await initWalletConnect({ uri, address });

			listener.sessionProposal((sessionProposal) => {
				proposal = sessionProposal;
			});

			listener.sessionDelete(() => {
				console.log('Session ended.');
				console.log('DELETE', listener);
				resetListener();
			});

			listener.sessionRequest(async (sessionRequest: Web3WalletTypes.SessionRequest) =>
				console.log(sessionRequest)
			);

			await listener.pair();
		} catch (err: unknown) {
			console.error(err);

			resetListener();
		}
	};

	const connect = async () => {
		await initListener(uri);
	};

	const approve = async () => listener?.approveSession(proposal!);
</script>

<h1>Wallet Connect Bug #3913</h1>

<p>
	How to: Try to connect wallet connect and observe outputs in browser debugger on approving
	session.
</p>

<h2>1. Connect</h2>

<label for="address">ETH Address</label>
<input id="address" bind:value={address} />

<label for="uri">Wallet Connect URI</label>
<input id="uri" bind:value={uri} />

<button on:click={connect}> Connect </button>

<h2>2. Approve</h2>

<p>Proposal ID: {proposal?.id ?? ''}</p>

{#if proposal !== undefined && proposal !== null}
	<button on:click={approve}>Approve</button>
{/if}
