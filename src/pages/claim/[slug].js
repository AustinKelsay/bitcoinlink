import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import crypto from 'crypto';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { webln } from "@getalby/sdk";

export default function ClaimPage() {
    const router = useRouter();
    const { slug, secret } = router.query;
    const [nwc, setNwc] = useState(null);
    const [invoice, setInvoice] = useState('');

    useEffect(() => {
        const fetchNWC = async () => {
            try {
                const response = await axios.get(`/api/nwc/${slug}`);
                setNwc(response.data);
            } catch (error) {
                console.error('Error fetching NWC', error);
            }
        };

        if (slug) {
            fetchNWC();
        }
    }, [slug]);

    const decryptNWCUrl = (encryptedUrl, secret) => {
        const decipher = crypto.createDecipher('aes-256-cbc', secret);
        let decryptedUrl = decipher.update(encryptedUrl, 'hex', 'utf8');
        decryptedUrl += decipher.final('utf8');
        return decryptedUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (nwc && secret) {
            const decryptedUrl = decryptNWCUrl(nwc.url, secret);
            console.log('Decrypted NWC URL:', decryptedUrl);
            if (decryptedUrl) {
                try {

                    const nwcInstance = new webln.NostrWebLNProvider({ nostrWalletConnectUrl: decryptedUrl });
                    
                    await nwcInstance.enable();
                    
                    console.log('nwcInstance', nwcInstance);
                    
                    const sendPaymentResponse = await nwcInstance.sendPayment(invoice);
                    
                    console.log('sendPaymentResponse', sendPaymentResponse);
                } catch {
                    console.error('Error sending payment');
                
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
            <h1 className="text-4xl">Claim Link</h1>
            <div className="flex flex-col items-center">
                <p>Status: {nwc.claimed ? 'Claimed' : 'Unclaimed'}</p>
                <p>Amount: {nwc.maxAmount / nwc.numLinks} sats</p>
                <form onSubmit={handleSubmit} className="flex flex-col items-center">
                    <div className="flex flex-col items-center my-8">
                        <label htmlFor="invoice">Enter Invoice</label>
                        <InputText
                            id="invoice"
                            value={invoice}
                            onChange={(e) => setInvoice(e.target.value)}
                        />
                    </div>
                    <Button label="Claim" severity="success" type="submit" />
                </form>
            </div>
        </main>
    );
}