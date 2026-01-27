import React, { useState, useEffect, FormEvent } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { bech32 } from 'bech32';
import StrikeInstructions from '@/components/strike/StrikeInstructions';
import CashAppInstructions from '@/components/cashapp/CashAppInstructions';
import MutinyInstructions from '@/components/mutiny/MutinyInstructions';
import { validateBolt11 } from '@/utils/bolt11';
import CashAppButton from '@/components/cashapp/CashAppButton';
import MutinyButton from '@/components/mutiny/MutinyButton';
import StrikeButton from '@/components/strike/StrikeButton';
import AlbyButton from '@/components/AlbyButton';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useToast } from '@/hooks/useToast';
import 'primeicons/primeicons.css';

interface LinkInfo {
  amount?: number;
  isClaimed?: boolean;
}

interface ParsedInput {
  type: 'lnurl' | 'invoice' | 'address';
  data: string;
}

interface WebLN {
  enable: () => Promise<void>;
  makeInvoice: (args: { amount: number; comment: string }) => Promise<{ paymentRequest: string }>;
}

declare global {
  interface Window {
    webln?: WebLN;
  }
}

export default function ClaimPage(): React.ReactElement {
  const [linkInfo, setLinkInfo] = useState<LinkInfo>({});
  const [claimed, setClaimed] = useState(false);
  const [exists, setExists] = useState(true);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStrikeVisible, setIsStrikeVisible] = useState(false);
  const [isCashAppVisible, setIsCashAppVisible] = useState(false);
  const [isMutinyVisible, setIsMutinyVisible] = useState(false);
  const router = useRouter();

  const { slug, linkIndex, secret } = router.query;

  const { showToast } = useToast();

  useEffect(() => {
    const fetchLinkInfo = async (): Promise<void> => {
      axios
        .get(`/api/claim/${slug}?linkIndex=${linkIndex}`)
        .then((res) => {
          setLinkInfo(res.data);
          setClaimed(res.data.isClaimed);
        })
        .catch((err) => {
          if (axios.isAxiosError(err) && err.response?.status === 404) {
            setExists(false);
          }
          console.error(err);
        });
    };

    if (slug && linkIndex) {
      fetchLinkInfo();
    }
  }, [slug, linkIndex]);

  const decodeLnurl = (lnurl: string, name?: string): string | undefined => {
    try {
      const { words: dataPart } = bech32.decode(lnurl, 2000);
      const requestByteArray = bech32.fromWords(dataPart);

      const decoded = new TextDecoder().decode(Uint8Array.from(requestByteArray));
      return decoded;
    } catch (error) {
      console.error('There was a problem decoding the lnurl:', name, error);
      showToast(
        'error',
        'LNURL Decoding Error',
        'There was a problem decoding the LNURL.'
      );
    }
  };

  const parseLightningAddress = (inputValue: string): ParsedInput | false => {
    if (typeof inputValue !== 'string') return false;

    if (inputValue.toLowerCase().startsWith('lnurl')) {
      const decoded = decodeLnurl(inputValue);

      if (!decoded) {
        showToast('warn', 'Invalid LNURL', 'This is not a valid LNURL.');
        return false;
      } else {
        console.log('Decoded LNURL:', decoded);
        return { type: 'lnurl', data: decoded };
      }
    } else if (inputValue.toLowerCase().startsWith('lnbc')) {
      try {
        const result = validateBolt11(inputValue);
        console.log('Valid invoice:', result, inputValue);
        if (!result.valid) {
          showToast('warn', 'Invalid Invoice', result.reason || 'This is not a valid invoice.');
          return false;
        }
        return { type: 'invoice', data: inputValue };
      } catch {
        showToast('warn', 'Invalid Invoice', 'This is not a valid invoice.');
        return false;
      }
    } else {
      const [username, domain] = inputValue.split('@');

      if (!!username && !!domain && domain.includes('.')) {
        return { type: 'address', data: inputValue };
      } else {
        showToast(
          'warn',
          'Invalid Lightning Address',
          'This is not a valid lightning address.'
        );
        return false;
      }
    }
  };

  const fetchInvoice = async ({
    callback,
    amount,
  }: {
    callback: string;
    amount: number;
  }): Promise<string | undefined> => {
    const comment = 'Reward';
    const encodedComment = encodeURIComponent(comment);

    const urlSeparator = callback.includes('?') ? '&' : '?';
    const url = `${callback}${urlSeparator}amount=${amount}&comment=${encodedComment}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
      });

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

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);
    if (slug && linkIndex && secret && linkInfo) {
      try {
        if (input) {
          const validInput = parseLightningAddress(input);
          if (validInput) {
            let invoice: string | undefined;
            if (validInput.type === 'lnurl') {
              const response = await fetch(validInput.data);
              const lnurlPayData = await response.json();

              if (lnurlPayData.tag === 'payRequest') {
                const amount = (linkInfo.amount ?? 0) * 1000;
                if (
                  amount >= lnurlPayData.minSendable &&
                  amount <= lnurlPayData.maxSendable
                ) {
                  const invoiceResponse = await fetch(
                    `${lnurlPayData.callback}?amount=${amount}`
                  );
                  const invoiceData = await invoiceResponse.json();
                  console.log('Invoice data:', invoiceData);
                  invoice = invoiceData.pr;
                } else {
                  console.error('Amount out of range');
                  setIsSubmitting(false);
                  showToast(
                    'error',
                    'Amount Out of Range',
                    'The requested amount is not within the acceptable range for this LNURL-pay.'
                  );
                  return;
                }
              } else {
                console.error('Invalid LNURL-pay data');
                setIsSubmitting(false);
                showToast(
                  'error',
                  'Invalid LNURL-pay Data',
                  'The LNURL-pay data returned from the server is invalid.'
                );
                return;
              }
            } else if (validInput.type === 'invoice') {
              invoice = validInput.data;
            } else if (validInput.type === 'address') {
              const callback = await getCallback(validInput.data);
              if (callback) {
                const amount = (linkInfo?.amount ?? 0) * 1000;
                invoice = await fetchInvoice({
                  callback: callback,
                  amount: amount,
                });
              }
            }

            if (invoice) {
              try {
                const claimresponse = await axios.post(
                  `/api/claim/${slug}?linkIndex=${linkIndex}`,
                  {
                    invoice: invoice,
                  },
                  {
                    headers: {
                      authorization: secret as string,
                    },
                  }
                );

                if (claimresponse.status === 200) {
                  showToast(
                    'success',
                    'Payment Sent',
                    'The payment has been successfully sent.'
                  );

                  showToast(
                    'success',
                    'Link Claimed',
                    'The link has been successfully claimed.'
                  );
                  setTimeout(() => {
                    setIsSubmitting(false);
                    setClaimed(true);
                  }, 2000);
                } else if (
                  claimresponse.status === 400 &&
                  claimresponse.data.error === 'Invalid invoice amount'
                ) {
                  console.error('Invalid Invoice Amount');
                  setIsSubmitting(false);
                  showToast(
                    'warn',
                    'Invalid Invoice Amount',
                    'The invoice amount does not match the expected amount.'
                  );
                  return;
                } else {
                  console.error('Error sending payment');
                  setIsSubmitting(false);
                  showToast(
                    'error',
                    'Error Sending Payment',
                    'An error occurred while sending the payment. Please try again.'
                  );
                  return;
                }
              } catch (error) {
                console.error('Error sending payment:', error);
                setIsSubmitting(false);
                if (
                  axios.isAxiosError(error) &&
                  error.response?.data?.error ===
                    'Insufficient budget remaining to make payment'
                ) {
                  showToast(
                    'error',
                    'Insufficient Budget',
                    'There is not enough budget remaining to make this payment.'
                  );
                } else if (
                  axios.isAxiosError(error) &&
                  error.response?.status === 400 &&
                  error.response?.data?.error === 'Invalid invoice amount'
                ) {
                  showToast(
                    'warn',
                    'Invalid Invoice Amount',
                    'The invoice amount does not match the expected amount.'
                  );
                } else {
                  showToast(
                    'error',
                    'Error Sending Payment',
                    'An error occurred while sending the payment. Please try again.'
                  );
                }
                return;
              }
            } else {
              console.error('Error fetching invoice');
              setIsSubmitting(false);
              showToast(
                'error',
                'Error Fetching Invoice',
                'An error occurred while fetching the invoice. Please try again.'
              );
              return;
            }
          } else {
            console.error('Invalid Input');
            setIsSubmitting(false);
            showToast('warn', 'Invalid Input', 'The provided input is invalid.');
            return;
          }
        } else {
          setIsSubmitting(false);
          showToast('warn', 'Empty Input', 'Please enter a lightning address, invoice, or LNURL.');
          return;
        }
      } catch {
        console.error('Error sending payment');
        setIsSubmitting(false);
        showToast(
          'error',
          'Error Sending Payment',
          'An error occurred while sending the payment. Please try again.'
        );
        return;
      }
    } else {
      setIsSubmitting(false);
    }
  };

  const handleAlbySubmit = async (): Promise<void> => {
    try {
      setIsSubmitting(true);
      if (window && window?.webln) {
        await window.webln.enable();
        const result = await window.webln.makeInvoice({
          amount: linkInfo?.amount ?? 0,
          comment: 'Reward',
        });
        if (result && result?.paymentRequest) {
          try {
            const claimresponse = await axios.post(
              `/api/claim/${slug}?linkIndex=${linkIndex}`,
              {
                invoice: result.paymentRequest,
              },
              {
                headers: {
                  authorization: secret as string,
                },
              }
            );

            if (claimresponse.status === 200) {
              showToast(
                'success',
                'Payment Sent',
                'The payment has been successfully sent.'
              );

              showToast(
                'success',
                'Link Claimed',
                'The link has been successfully claimed.'
              );
              setTimeout(() => {
                setIsSubmitting(false);
                setClaimed(true);
              }, 2000);
            } else if (
              claimresponse.status === 400 &&
              claimresponse.data.error === 'Invalid invoice amount'
            ) {
              console.error('Invalid Invoice Amount');
              setIsSubmitting(false);
              showToast(
                'warn',
                'Invalid Invoice Amount',
                'The invoice amount does not match the expected amount.'
              );
              return;
            } else {
              console.error('Error sending payment');
              setIsSubmitting(false);
              showToast(
                'error',
                'Error Sending Payment',
                'An error occurred while sending the payment. Please try again.'
              );
              return;
            }
          } catch {
            console.error('Error sending payment');
            setIsSubmitting(false);
            showToast(
              'error',
              'Error Sending Payment',
              'An error occurred while sending the payment. Please try again.'
            );
            return;
          }
        } else {
          setIsSubmitting(false);
          showToast(
            'error',
            'Invoice Creation Failed',
            'Failed to create invoice. Please try again.'
          );
          return;
        }
      } else {
        setIsSubmitting(false);
        showToast(
          'error',
          'WebLN Not Available',
          'WebLN extension not found. Please install Alby or another WebLN provider.'
        );
        return;
      }
    } catch {
      console.error('Error sending payment');
      setIsSubmitting(false);
      showToast(
        'error',
        'Error Sending Payment',
        'An error occurred while sending the payment. Please try again.'
      );
      return;
    }
  };

  return (
    <main className="flex flex-col items-center justify-evenly p-8 sm:w-[80vw] md:w-[70vw] lg:w-[60vw] xl:w-[50vw] mx-auto">
      {!exists ? (
        <>
          <h1 className="text-6xl mb-0">Link not found</h1>
          <p className="text-2xl mt-0">
            This means the link has either already been claimed or has expired
          </p>
        </>
      ) : (
        <>
          <h1 className="text-6xl mb-0">
            {claimed ? 'Link Claimed' : 'Claim Link'}
          </h1>
          <div className="flex flex-col items-center">
            <p className="text-2xl mt-0">
              <span
                className={`${claimed ? 'text-green-500' : 'text-yellow-500'}`}
              >
                {claimed ? 'Claimed' : 'Unclaimed'}
              </span>
            </p>
            {claimed || !linkInfo ? null : (
              <p className="text-3xl mt-0">{linkInfo?.amount} sats</p>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col items-center">
              <div className="flex flex-col items-center my-8">
                <label className="mb-2 text-3xl" htmlFor="lightning-address">
                  Enter any Lightning Address, Bolt11 Invoice, or LNURL
                </label>
                <InputText
                  className="w-full"
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
                  label="Claim"
                  severity="success"
                  type="submit"
                />
              )}
            </form>
            <div className="flex flex-col my-4">
              <p className="text-2xl text-center my-0">OR</p>
              <div className="flex flex-col w-[225px] justify-between mx-auto h-[30vh] mb-4">
                <AlbyButton text="Claim with Alby" handleSubmit={handleAlbySubmit} />
                <StrikeButton
                  text="Claim with Strike"
                  handleSubmit={() => setIsStrikeVisible(true)}
                />
                <MutinyButton
                  text="Claim with Mutiny"
                  handleSubmit={() => setIsMutinyVisible(true)}
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
      <MutinyInstructions
        isVisible={isMutinyVisible}
        onHide={() => {
          setIsMutinyVisible(false);
        }}
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        amount={linkInfo?.amount}
      />
    </main>
  );
}
