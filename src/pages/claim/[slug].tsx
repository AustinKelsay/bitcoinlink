import React, { useState, useEffect, FormEvent, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { bech32 } from 'bech32';
import StrikeInstructions from '@/components/strike/StrikeInstructions';
import CashAppInstructions from '@/components/cashapp/CashAppInstructions';
import { validateBolt11 } from '@/utils/bolt11';
import CashAppButton from '@/components/cashapp/CashAppButton';
import StrikeButton from '@/components/strike/StrikeButton';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useToast } from '@/hooks/useToast';
import 'primeicons/primeicons.css';
import {
  decodeLink,
  decryptBitcoinLink,
  BitcoinLinkNostrClient,
  payInvoiceWithNWC,
  ensureLnurlPayResponse,
  extractInvoiceFromCallbackPayload,
} from '@/lib/nostr';
import type { EncodedLink, LinkInfo, ParsedInput, BitcoinLinkPayload } from '@/lib/nostr';
import { getPublicKey } from 'snstr';

export default function ClaimPage(): React.ReactElement {
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [linkData, setLinkData] = useState<EncodedLink | null>(null);
  const [payload, setPayload] = useState<BitcoinLinkPayload | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [exists, setExists] = useState(true);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const claimInFlightRef = useRef(false);
  const [isStrikeVisible, setIsStrikeVisible] = useState(false);
  const [isCashAppVisible, setIsCashAppVisible] = useState(false);
  const router = useRouter();

  const { slug } = router.query;
  const { showToast } = useToast();

  /**
   * Fetch and decrypt the Bitcoin Link data from Nostr relays.
   * Checks if the link has been claimed and retrieves the encrypted payload.
   *
   * @param encoded - The base64url-encoded link data from the URL slug
   */
  const fetchLinkData = useCallback(async (encoded: string) => {
    try {
      // Decode the link URL
      const decoded = decodeLink(encoded);
      setLinkData(decoded);
      setLinkInfo({ amount: decoded.amountSats, isClaimed: false });

      // Create client with the relays from the link
      const client = new BitcoinLinkNostrClient(decoded.relays);

      try {
        await client.connect();

        // Check if a deletion event exists (link already claimed)
        const receiverPubkey = getPublicKey(decoded.receiverPrivateKey);
        const isDeletion = await client.hasDeletionEvent(decoded.eventId, receiverPubkey);

        if (isDeletion) {
          setClaimed(true);
          setLinkInfo((prev) => prev ? { ...prev, isClaimed: true } : null);
          setLoading(false);
          return;
        }

        // Fetch the gift wrap event with bounded retries for relay flakiness
        let event = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          event = await client.fetchEvent(decoded.eventId);
          if (event) break;
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
          }
        }

        if (!event) {
          setExists(false);
          setLoading(false);
          return;
        }

        // Decrypt the payload
        const decryptedPayload = decryptBitcoinLink(event, decoded.receiverPrivateKey);
        setPayload(decryptedPayload);
        setLinkInfo({ amount: decryptedPayload.amount, isClaimed: false });
      } finally {
        client.close();
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching link data:', error);
      setExists(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (slug && typeof slug === 'string') {
      fetchLinkData(slug);
    }
  }, [slug, fetchLinkData]);

  /**
   * Decode a bech32-encoded LNURL to its original URL.
   * @param lnurl - The bech32-encoded LNURL string
   * @returns The decoded URL string, or undefined if decoding fails
   */
  const decodeLnurl = (lnurl: string): string | undefined => {
    try {
      const { words: dataPart } = bech32.decode(lnurl, 2000);
      const requestByteArray = bech32.fromWords(dataPart);
      const decoded = new TextDecoder().decode(Uint8Array.from(requestByteArray));
      return decoded;
    } catch (error) {
      console.error('There was a problem decoding the lnurl:', error);
      showToast(
        'error',
        'LNURL Decoding Error',
        'There was a problem decoding the LNURL.'
      );
    }
  };

  /**
   * Parse and validate user input as a Lightning payment destination.
   * Supports LNURL, BOLT11 invoices, and Lightning addresses.
   *
   * @param inputValue - The user input to parse
   * @returns Parsed input with type and data, or null if invalid
   */
  const parseLightningAddress = (inputValue: string): ParsedInput | null => {
    if (typeof inputValue !== 'string') return null;
    const normalizedInput = inputValue.trim();
    if (!normalizedInput) return null;

    if (normalizedInput.toLowerCase().startsWith('lnurl')) {
      const decoded = decodeLnurl(normalizedInput);

      if (!decoded) {
        showToast('warn', 'Invalid LNURL', 'This is not a valid LNURL.');
        return null;
      }
      return { type: 'lnurl', data: decoded };
    }

    // Check for BOLT11 invoice: lnbc (mainnet), lntb (testnet), lnbcrt (regtest)
    if (/^ln(bc|tb|bcrt)/i.test(normalizedInput)) {
      try {
        const result = validateBolt11(normalizedInput);
        if (!result.valid) {
          showToast('warn', 'Invalid Invoice', result.reason || 'This is not a valid invoice.');
          return null;
        }
        return { type: 'invoice', data: normalizedInput };
      } catch {
        showToast('warn', 'Invalid Invoice', 'This is not a valid invoice.');
        return null;
      }
    }

    // Try to parse as Lightning address (user@domain.com)
    const [username, domain] = normalizedInput.split('@');
    if (username && domain && domain.includes('.')) {
      return { type: 'address', data: normalizedInput };
    }

    showToast(
      'warn',
      'Invalid Lightning Address',
      'This is not a valid lightning address.'
    );
    return null;
  };

  /**
   * Fetch a Lightning invoice from an LNURL-pay callback endpoint.
   *
   * @param params - Object containing callback URL and amount in millisatoshis
   * @returns The BOLT11 invoice string, or undefined if fetching fails
   */
  const fetchInvoice = async ({
    callback,
    amount,
  }: {
    callback: string;
    amount: number;
  }): Promise<string | undefined> => {
    const comment = 'BitcoinLink Reward';
    const encodedComment = encodeURIComponent(comment);

    const urlSeparator = callback.includes('?') ? '&' : '?';
    const url = `${callback}${urlSeparator}amount=${amount}&comment=${encodedComment}`;

    try {
      const response = await fetch(url, { method: 'GET' });
      const data = await response.json();

      if (data.pr) {
        return data.pr;
      } else {
        throw new Error('No invoice returned');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast(
        'error',
        'Error Fetching Invoice',
        'An error occurred while fetching the invoice. Please try again.'
      );
    }
  };

  /**
   * Retrieve the LNURL-pay callback URL from a Lightning address.
   * Converts user@domain.com format to the LNURL-pay endpoint.
   *
   * @param lnAddress - Lightning address (user@domain.com) or full LNURL endpoint
   * @returns The callback URL for generating invoices, or undefined if fetching fails
   */
  const getCallback = async (lnAddress: string): Promise<string | undefined> => {
    const lnurlpEndpoint = lnAddress.includes('/.well-known/lnurlp/')
      ? lnAddress
      : `https://${lnAddress.split('@')[1]}/.well-known/lnurlp/${
          lnAddress.split('@')[0]
        }`;

    try {
      const response = await fetch(lnurlpEndpoint);
      const data = await response.json();
      const { callback } = data;
      return callback;
    } catch (error) {
      console.error('There was a problem fetching the callback:', error);
      showToast(
        'error',
        'Error Fetching Callback',
        'There was a problem fetching the callback. Please try again.'
      );
    }
  };

  /**
   * Pay a Lightning invoice using the link's NWC URL and mark the link as claimed.
   * Payment is the critical operation; marking as claimed is best-effort.
   *
   * @param invoice - The BOLT11 invoice to pay
   * @returns True if payment succeeded (regardless of deletion event status)
   * @throws If payment fails
   */
  const payInvoiceAndMarkClaimed = async (invoice: string): Promise<boolean> => {
    if (!payload || !linkData) {
      showToast('error', 'Error', 'Link data not available');
      return false;
    }

    // Pay the invoice using NWC - this is the critical operation
    await payInvoiceWithNWC(payload.nwcUrl, invoice);

    // Publish deletion event to mark as claimed
    // This is non-fatal - if it fails, the payment already succeeded
    // User could retry and risk double-payment if we threw here
    try {
      const client = new BitcoinLinkNostrClient(linkData.relays);
      try {
        await client.connect();
        await client.publishDeletion(linkData.eventId, linkData.receiverPrivateKey);
      } finally {
        client.close();
      }
    } catch (deletionError) {
      console.warn('Failed to publish deletion event (payment succeeded):', deletionError);
    }

    return true;
  };

  /**
   * Handle form submission to claim the Bitcoin Link.
   * Processes Lightning addresses, BOLT11 invoices, and LNURL inputs.
   *
   * @param e - Form submission event
   */
  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (claimInFlightRef.current) {
      return;
    }
    claimInFlightRef.current = true;
    setIsSubmitting(true);

    if (!linkData || !payload) {
      setIsSubmitting(false);
      showToast('error', 'Error', 'Link data not loaded yet.');
      return;
    }

    try {
      if (!input) {
        setIsSubmitting(false);
        showToast('warn', 'Empty Input', 'Please enter a lightning address, invoice, or LNURL.');
        return;
      }

      const validInput = parseLightningAddress(input);
      if (!validInput) {
        setIsSubmitting(false);
        return;
      }

      let invoice: string | undefined;

      if (validInput.type === 'lnurl') {
        const response = await fetch(validInput.data);
        const lnurlPayData = await response.json();
        const amount = (linkInfo?.amount ?? 0) * 1000;

        try {
          const callback = ensureLnurlPayResponse(lnurlPayData, amount);
          const invoiceResponse = await fetch(`${callback}?amount=${amount}`);
          const invoiceData = await invoiceResponse.json();
          invoice = extractInvoiceFromCallbackPayload(invoiceData);
        } catch (lnurlError) {
          const message = lnurlError instanceof Error ? lnurlError.message : 'Invalid LNURL-pay flow';
          setIsSubmitting(false);
          showToast('error', 'Invalid LNURL-pay Data', message);
          return;
        }
      } else if (validInput.type === 'invoice') {
        invoice = validInput.data;
      } else if (validInput.type === 'address') {
        const callback = await getCallback(validInput.data);
        if (callback) {
          const amount = (linkInfo?.amount ?? 0) * 1000;
          invoice = await fetchInvoice({ callback, amount });
        }
      }

      if (!invoice) {
        setIsSubmitting(false);
        showToast(
          'error',
          'Error Fetching Invoice',
          'An error occurred while fetching the invoice. Please try again.'
        );
        return;
      }

      try {
        await payInvoiceAndMarkClaimed(invoice);

        showToast('success', 'Payment Sent', 'The payment has been successfully sent.');
        showToast('success', 'Link Claimed', 'The link has been successfully claimed.');

        setTimeout(() => {
          setIsSubmitting(false);
          setClaimed(true);
        }, 2000);
      } catch (error) {
        console.error('Error sending payment:', error);
        setIsSubmitting(false);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('INSUFFICIENT_BALANCE')) {
          showToast(
            'error',
            'Insufficient Budget',
            'There is not enough budget remaining to make this payment.'
          );
        } else {
          showToast(
            'error',
            'Error Sending Payment',
            'An error occurred while sending the payment. Please try again.'
          );
        }
      }
    } catch (error) {
      console.error('Error in claim flow:', error);
      setIsSubmitting(false);
      showToast(
        'error',
        'Error',
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      claimInFlightRef.current = false;
    }
  };

  /**
   * Handle claim submission using WebLN (Alby extension).
   * Generates an invoice via WebLN and pays it using the link's NWC URL.
   */
  const handleAlbySubmit = async (): Promise<void> => {
    if (claimInFlightRef.current) {
      return;
    }

    try {
      claimInFlightRef.current = true;
      setIsSubmitting(true);

      if (!linkData || !payload) {
        setIsSubmitting(false);
        showToast('error', 'Error', 'Link data not loaded yet.');
        return;
      }

      if (window && window?.webln) {
        await window.webln.enable();
        const result = await window.webln.makeInvoice({
          amount: linkInfo?.amount ?? 0,
          comment: 'BitcoinLink Reward',
        });

        if (result && result?.paymentRequest) {
          try {
            await payInvoiceAndMarkClaimed(result.paymentRequest);

            showToast('success', 'Payment Sent', 'The payment has been successfully sent.');
            showToast('success', 'Link Claimed', 'The link has been successfully claimed.');

            setTimeout(() => {
              setIsSubmitting(false);
              setClaimed(true);
            }, 2000);
          } catch (error) {
            console.error('Error sending payment:', error);
            setIsSubmitting(false);
            showToast(
              'error',
              'Error Sending Payment',
              'An error occurred while sending the payment. Please try again.'
            );
          }
        } else {
          setIsSubmitting(false);
          showToast(
            'error',
            'Invoice Creation Failed',
            'Failed to create invoice. Please try again.'
          );
        }
      } else {
        setIsSubmitting(false);
        showToast(
          'error',
          'WebLN Not Available',
          'WebLN extension not found. Please install Alby or another WebLN provider.'
        );
      }
    } catch (error) {
      console.error('Error sending payment:', error);
      setIsSubmitting(false);
      showToast(
        'error',
        'Error Sending Payment',
        'An error occurred while sending the payment. Please try again.'
      );
    } finally {
      claimInFlightRef.current = false;
    }
  };

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 p-6 md:p-10">
        <h1 className="text-4xl mb-4">Loading...</h1>
        <ProgressSpinner
          style={{ width: '50px', height: '50px' }}
          strokeWidth="8"
          animationDuration=".8s"
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 p-6 md:p-10">
      {!exists ? (
        <>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Link not found</h1>
          <p className="mt-1 text-lg text-gray-300">
            This means the link has either already been claimed or has expired
          </p>
        </>
      ) : (
        <>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            {claimed ? 'Link Claimed' : 'Claim Link'}
          </h1>
          <div className="mt-4 w-full rounded-xl border border-gray-700 bg-gray-900/40 p-6 md:p-8">
            <p className="mt-1 text-lg text-gray-300">
              <span className={`${claimed ? 'text-green-500' : 'text-yellow-500'}`}>
                {claimed ? 'Claimed' : 'Unclaimed'}
              </span>
            </p>
            {claimed || !linkInfo ? null : (
              <p className="mt-1 text-3xl font-semibold">{linkInfo?.amount} sats</p>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col items-center">
              <div className="mb-6 flex flex-col">
                <label className="mb-2 text-base font-medium" htmlFor="lightning-address">
                  Enter any Lightning Address, Bolt11 Invoice, or LNURL
                </label>
                <InputText
                  className="w-full rounded-md"
                  id="lightning-address"
                  placeholder="user@website.com... or lnbc1q or LNURL1..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </div>
              {isSubmitting ? (
                <ProgressSpinner
                  style={{ width: '50px', height: '50px' }}
                  strokeWidth="8"
                  animationDuration=".8s"
                />
              ) : (
                <Button
                  disabled={claimed}
                  label="Claim Link"
                  severity="success"
                  type="submit"
                />
              )}
            </form>
            <div className="flex flex-col my-4">
              <p className="text-2xl text-center my-0">OR</p>
              <div className="flex flex-col w-[225px] justify-between mx-auto h-[24vh] mb-4">
                <button
                  onClick={handleAlbySubmit}
                  disabled={claimed || isSubmitting}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-[#FFDF6F] hover:bg-[#FFE88C] text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>⚡</span>
                  <span>Claim with Alby</span>
                </button>
                <StrikeButton
                  text="Claim with Strike"
                  handleSubmit={() => setIsStrikeVisible(true)}
                />
                <CashAppButton
                  text="Claim with CashApp"
                  handleSubmit={() => setIsCashAppVisible(true)}
                />
              </div>
            </div>
          </div>
        </>
      )}
      <StrikeInstructions
        isVisible={isStrikeVisible}
        onHide={() => {
          setIsStrikeVisible(false);
        }}
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
      />
      <CashAppInstructions
        isVisible={isCashAppVisible}
        onHide={() => {
          setIsCashAppVisible(false);
        }}
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        amount={linkInfo?.amount}
      />
    </main>
  );
}
