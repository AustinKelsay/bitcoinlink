import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import crypto from 'crypto';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { webln } from "@getalby/sdk";
import { useToast } from '@/hooks/useToast';

export default function ClaimPage() {
    const router = useRouter();
    const { slug, linkIndex, secret } = router.query;
    const [nwc, setNwc] = useState(null);
    const [lightningAddress, setLightningAddress] = useState('');
    const [claimed, setClaimed] = useState(false);
    const [exists, setExists] = useState(true);

    const { showToast } = useToast();

    useEffect(() => {
        const fetchNWC = async () => {
            try {
                const response = await axios.get(`/api/nwc/${slug}`);
                setNwc(response.data);
            } catch (error) {
                console.error('Error fetching NWC', error);
                showToast('error', 'Error Fetching NWC', 'An error occurred while fetching the NWC. Please try again.');
            }
        };

        if (slug) {
            fetchNWC();
        }
    }, [slug]);

    useEffect(() => {
        const fetchLink = async () => {
            if (nwc && linkIndex !== undefined) {
                try {
                    const response = await axios.get(`/api/links/${nwc.id}?nwcId=${nwc.id}&linkIndex=${linkIndex}`);
                    console.log('Link:', response.data);
                    setClaimed(response.data.isClaimed);
                    if (response.data.isClaimed) {
                        console.error('Link already claimed');
                        showToast('warn', 'Link Already Claimed', 'This link has already been claimed.');
                    }
                } catch (error) {
                    if (error.response.status === 404) {
                        setExists(false);
                    }
                    console.error('Error fetching link', error);
                    showToast('error', 'Error Fetching Link', 'An error occurred while fetching the link. Please try again.');
                }
            }
        };

        if (nwc && linkIndex !== undefined) {
            fetchLink();
        }
    }, [nwc, linkIndex]);

    const decryptNWCUrl = (encryptedUrl, secret) => {
        const decipher = crypto.createDecipher('aes-256-cbc', secret);
        let decryptedUrl = decipher.update(encryptedUrl, 'hex', 'utf8');
        decryptedUrl += decipher.final('utf8');
        return decryptedUrl;
    };

    const decodeLnurl = (lnurl, name) => {
        try {
            let { prefix: hrp, words: dataPart } = bech32.decode(lnurl, 2000)
            let requestByteArray = bech32.fromWords(dataPart)

            const decoded = Buffer.from(requestByteArray).toString()
            return decoded;
        } catch (error) {
            console.error('There was a problem decoding the lnurl:', name, error);
            showToast('error', 'LNURL Decoding Error', 'There was a problem decoding the LNURL.');
        }
    }

    const parseLightningAddress = (address) => {
        if (typeof address !== 'string') return false;

        if (address.toLowerCase().startsWith('lnurl' || 'LNURL')) {
            const decoded = decodeLnurl(address);

            if (!decoded || !decoded.includes('/.well-known/')) {
                showToast('warn', 'Invalid Lightning Address', 'This is not a valid lightning address.');
                return false;
            } else {
                return decoded;
            }
        } else {
            const [username, domain] = address.split('@');

            if (!!username && !!domain && domain.includes('.')) {
                return address;
            } else {
                showToast('warn', 'Invalid Lightning Address', 'This is not a valid lightning address.');
                return false;
            }
        }
    }

    const fetchInvoice = async ({ callback, amount }) => {
        const comment = "Reward";
        const encodedComment = encodeURIComponent(comment);

        // Check if the callback URL already has a query string
        const urlSeparator = callback.includes('?') ? '&' : '?';
        const url = `${callback}${urlSeparator}amount=${amount}&comment=${encodedComment}`;
        console.log('URL:', url);

        try {
            const response = await fetch(url, {
                method: 'GET'
            });

            const data = await response.json();
            console.log('Data:', data);

            if (data.pr) {
                return data.pr;
            } else {
                throw new Error('No invoice returned');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('error', 'Error Fetching Invoice', 'An error occurred while fetching the invoice. Please try again.');
        }
    };

    const getCallback = async (lnAddress) => {
        const lnurlpEndpoint = lnAddress.includes('/.well-known/lnurlp/') ? lnAddress : `https://${lnAddress.split('@')[1]}/.well-known/lnurlp/${lnAddress.split('@')[0]}`;

        try {
            const response = await fetch(lnurlpEndpoint);
            const data = await response.json();
            const { callback } = data;
            return callback;
        } catch (error) {
            console.error('There was a problem fetching the callback:', error);
            showToast('error', 'Error Fetching Callback', 'There was a problem fetching the callback. Please try again.');
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (nwc && secret) {
            const decryptedUrl = decryptNWCUrl(nwc.url, secret);
            if (decryptedUrl) {
                try {
                    if (lightningAddress) {
                        const validLnAddress = parseLightningAddress(lightningAddress);
                        if (validLnAddress) {
                            const callback = await getCallback(validLnAddress);
                            if (callback) {
                                const amount = (nwc.maxAmount / nwc.numLinks) * 1000;
                                const invoice = await fetchInvoice({ callback: callback, amount: amount });
                                if (invoice) {
                                    const nwcInstance = new webln.NostrWebLNProvider({ nostrWalletConnectUrl: decryptedUrl });
                                    await nwcInstance.enable();
                                    const sendPaymentResponse = await nwcInstance.sendPayment(invoice);
                                    console.log('sendPaymentResponse', sendPaymentResponse);
                                    showToast('success', 'Payment Sent', 'The payment has been successfully sent.');

                                    // Update the link status to claimed
                                    console.log('Claiming link...', linkIndex);
                                    const response = await axios.put(`/api/links/${nwc.id}?nwcId=${nwc.id}&linkIndex=${linkIndex}`);
                                    console.log('Link claimed:', response.data);
                                    showToast('success', 'Link Claimed', 'The link has been successfully claimed.');
                                } else {
                                    showToast('error', 'Error Fetching Invoice', 'An error occurred while fetching the invoice. Please try again.');
                                    return;
                                }
                            }
                        } else {
                            console.error('Invalid Lightning Address');
                            showToast('warn', 'Invalid Lightning Address', 'The provided lightning address is invalid.');
                            return;
                        }
                    }
                } catch {
                    console.error('Error sending payment');
                    showToast('error', 'Error Sending Payment', 'An error occurred while sending the payment. Please try again.');
                    return;
                }
            }
        }
    };

    if (!nwc) {
        return <div>Loading...</div>;
    }

    return (
        <main className="flex flex-col items-center justify-evenly p-8">
            {!exists ? <h1 className="text-6xl">Link not found</h1> : (<>
                <h1 className="text-6xl">{claimed ? 'Link Claimed' : 'Claim Link'}</h1>
                <div className="flex flex-col items-center">
                    <p className='text-2xl'>Status: {claimed ? 'Claimed' : 'Unclaimed'}</p>
                    {claimed ? null : <p className='text-2xl'>Amount: {nwc.maxAmount / nwc.numLinks} sats</p>}
                    <form onSubmit={handleSubmit} className="flex flex-col items-center">
                        <div className="flex flex-col items-center my-8">
                            <label className='mb-2 text-2xl' htmlFor="lightning-address">Enter Lightning Address</label>
                            <InputText
                                id="lightning-address"
                                value={lightningAddress}
                                onChange={(e) => setLightningAddress(e.target.value)}
                            />
                        </div>
                        <Button disabled={claimed} label="Claim" severity="success" type="submit" />
                    </form>
                </div>
            </>)}
        </main>
    );
}