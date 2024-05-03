import React, {useState, useEffect} from "react";
import axios from "axios";
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { useRouter } from "next/router";
import { webln } from "@getalby/sdk";

const Claim = () => {
    const [invoice, setInvoice] = useState('');
    const [claimed, setClaimed] = useState(false);
    const [nwcId, setNwcId] = useState(null);
    const [amount, setAmount] = useState(null);

    const router = useRouter();

    const slug = router.query.slug;

    useEffect(() => {
        if (slug) {
            axios.get(`/api/links/${slug}`)
                .then(async (response) => {
                    if (response.data && response.data.used === false) {
                        setNwcId(response.data.nwcId);
                        setAmount(response.data.amount);
                    } else {
                        setClaimed(true);
                    }
                })
                .catch((error) => {
                    console.error('Error finding link', error);
                });
        }
    }, [slug]);

    const payout = async () => {
      axios.get(`/api/nwc/${nwcId}`)
      .then(async (response) => {
          if (response && response.data && response.data.url) {
            const url = response.data.url;
            if (url) {
                const nwcInstance = new webln.NostrWebLNProvider({ nostrWalletConnectUrl: url });

                await nwcInstance.enable();

                console.log('nwcInstance', nwcInstance);
                
                const sendPaymentResponse = await nwcInstance.sendPayment(invoice);
                
                console.log('sendPaymentResponse', sendPaymentResponse);
            }
          }
      })
        .catch((error) => {
            console.error('Error finding NWC', error);
        });
    }

    const handleSubmit = async () => {
        if (invoice && nwcId && amount && !claimed) {
            await payout(amount, nwcId);
        }
    }

    return (
        <div className={"flex flex-col items-center justify-evenly p-8"}>
            <h1 className="text-4xl">Put in a bolt11 invoice to claim your reward</h1>
            <div className="flex flex-col justify-between h-32">
                <InputText placeholder={"lnbc1..."} value={invoice} onChange={(e) => setInvoice(e.target.value)} />
                <Button className="w-fit mx-auto" label="Submit" severity="success" outlined onClick={handleSubmit} />
            </div>
        </div>
    );
}

export default Claim;