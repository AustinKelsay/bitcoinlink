import { useState } from 'react';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { nwc } from '@getalby/sdk';
import axios from 'axios';

export default function Home() {
  const [name, setName] = useState('');
  const [numberOfLinks, setNumberOfLinks] = useState(null);
  const [satsPerLink, setSatsPerLink] = useState(null);

  const handleGenerate = async () => {
    console.log(`Generating ${numberOfLinks} links for ${name} with ${satsPerLink} sats each.`);
    const newNwc = nwc.NWCClient.withNewSecret();

    const monthFromNow = new Date();
    monthFromNow.setMonth(monthFromNow.getMonth() + 1);
    console.log('monthFromNow', monthFromNow);

    const amount = numberOfLinks * satsPerLink;

    try {
      const initNwcOptions = {
        name: name,
        requstMethods: ["pay_invoice"],
        maxAmount: amount,
        editable: false,
        budgetRenewal: "never",
        expiresAt: monthFromNow,
      };

      await newNwc.initNWC(initNwcOptions);

      const newNWCUrl = newNwc.getNostrWalletConnectUrl();

      if (newNWCUrl) {
        axios.post('/api/nwc', {
          name: name,
          url: newNWCUrl,
          maxAmount: amount,
          expiresAt: monthFromNow,
        })
          .then(async (response) => {
            if (response.status === 201 && response.data?.id) {
              console.log('NWC created', response.data);
              const generatedLinks = await generateLinks(response.data.id);
              console.log('generatedLinks', generatedLinks);
            }
          })
          .catch((error) => {
            console.error('Error creating NWC', error);
          });
      } else {
        throw new Error('No NWC url returned');
      }

    } catch (e) {
      console.warn("Prompt closed", e);
    }
  };

  const generateLinks = async (nwcId) => {
    const links = [];
    for (let i = 0; i < numberOfLinks; i++) {
      const link = {
        nwcId: nwcId,
        amount: satsPerLink,
      }
      links.push(link);
    }


    if (links.length === numberOfLinks) {
      axios.post(`/api/links/nwc/${nwcId}`, links)
        .then((response) => {
          console.log('Links created', response.data);
          return response.data;
        })
        .catch((error) => {
          console.error('Error creating links', error);
        });
    }
  }

  return (
    <main
    className={"flex flex-col items-center justify-evenly p-8"}>
      <h1 className="text-4xl">NWC Reward Links</h1>
      <div className='flex flex-col items-center'>
        <div className='flex flex-col items-center my-8'>
          <label htmlFor='name'>Name for your NWC</label>
          <InputText id='name' value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className='flex flex-col items-center my-8'>
          <label htmlFor='number'>Number of links</label>
          <InputNumber id='number' value={numberOfLinks} onValueChange={(e) => setNumberOfLinks(e.value)} />
        </div>
        <div className='flex flex-col items-center my-8'>
          <label htmlFor='sats'>Sats per link</label>
          <InputNumber id='sats' value={satsPerLink} onValueChange={(e) => setSatsPerLink(e.value)} />
        </div>
        <Button label="Generate" severity="success" outlined onClick={handleGenerate} />
      </div>
    </main>
  );
}
