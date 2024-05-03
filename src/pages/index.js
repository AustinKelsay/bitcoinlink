import { useState } from 'react';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { nwc } from '@getalby/sdk';
import { relayInit, nip04 } from 'nostr-tools';
import AlbyButton from '@/components/AlbyButton';
import MutinyButton from '@/components/MutinyButton';
import axios from 'axios';
import crypto from 'crypto';

export default function Home() {
  const [numberOfLinks, setNumberOfLinks] = useState(null);
  const [satsPerLink, setSatsPerLink] = useState(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState([]);

  const encryptNWCUrl = (url) => {
    const secret = crypto.randomBytes(32).toString('hex');
    const cipher = crypto.createCipher('aes-256-cbc', secret);
    let encryptedUrl = cipher.update(url, 'utf8', 'hex');
    encryptedUrl += cipher.final('hex');
    return { encryptedUrl, secret };
  };

  const handleAlbySubmit = async () => {
    console.log(`Generating ${numberOfLinks} links with ${satsPerLink} sats each.`);
    const newNwc = nwc.NWCClient.withNewSecret();
    const monthFromNow = new Date();
    monthFromNow.setMonth(monthFromNow.getMonth() + 1);
    const amount = numberOfLinks * satsPerLink;

    try {
      const initNwcOptions = {
        name: "bitcoinlink.app",
        requestMethods: ['pay_invoice'],
        maxAmount: amount,
        editable: false,
        budgetRenewal: 'never',
        expiresAt: monthFromNow,
      };
      await newNwc.initNWC(initNwcOptions);
      const newNWCUrl = newNwc.getNostrWalletConnectUrl();

      if (newNWCUrl) {
        const { encryptedUrl, secret } = encryptNWCUrl(newNWCUrl);

        axios.post('/api/nwc', {
          url: encryptedUrl,
          maxAmount: amount,
          numLinks: numberOfLinks,
          expiresAt: monthFromNow,
        })
          .then(async (response) => {
            if (response.status === 201 && response.data?.id) {
              console.log('NWC created', response.data);
              const generatedLinks = await generateLinks(response.data.id, secret);
              setGeneratedLinks(generatedLinks);
              setDialogVisible(true);
            }
          })
          .catch((error) => {
            console.error('Error creating NWC', error);
          });
      } else {
        throw new Error('No NWC url returned');
      }
    } catch (e) {
      console.warn('Prompt closed', e);
    }
  };

  const handleMutinySubmit = async () => {
    const appPublicKey = "f2cee06b62c2e57192bf3a344618695da2ad3bf590645b6764959840b62f7bfc";
    const appPrivKey = "2ed6c9e8b1840b584af2ee06afcf8527307f7b687301812ec438ccfbd0fbe7f6"
    const relayUrl = encodeURIComponent('wss://nostr.mutinywallet.com/');
    const secret = crypto.randomBytes(16).toString('hex');
    const requiredCommands = 'pay_invoice';
    const budget = `${numberOfLinks * satsPerLink}/year`;
    const identity = "8172b9205247ddfe99b783320782d0312fa305a199fb2be8a3e6563e20b4f0e2";
  
    const nwaUri = `nostr+walletauth://${appPublicKey}?relay=${relayUrl}&secret=${secret}&required_commands=${requiredCommands}&budget=${budget}&identity=${identity}`;
    const encodedNwaUri = encodeURIComponent(nwaUri);
    const mutinySettingsUrl = `https://app.mutinywallet.com/settings/connections?nwa=${encodedNwaUri}`;
  
    window.open(mutinySettingsUrl, 'mutinyWindow', 'width=600,height=700');
  
    const sub = relayInit('wss://nostr.mutinywallet.com/');
  
    sub.on('connect', () => {
      sub.sub([{ kinds: [33194], since: Math.round(Date.now() / 1000) }]);
    });
  
    sub.on('event', async (event) => {
      console.log('Event received', event);
      if (event.tags[0][1] === appPublicKey) {
        console.log('Event for this app', event);
        try {
          const decrypted = await nip04.decrypt(appPrivKey, event.pubkey, event.content);
          const decryptedSecret = JSON.parse(decrypted).secret;
          if (decryptedSecret === secret) {
            const nwcUri = `nostr+walletconnect://${event.pubkey}?relay=${relayUrl}&pubkey=${appPublicKey}&secret=${appPrivKey}`;
  
            axios.post('/api/nwc', {
              url: nwcUri,
              maxAmount: numberOfLinks * satsPerLink,
              numLinks: numberOfLinks,
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            })
              .then(async (response) => {
                if (response.status === 201 && response.data?.id) {
                  console.log('NWC created', response.data);
                  const generatedLinks = await generateLinks(response.data.id, secret);
                  setGeneratedLinks(generatedLinks);
                  setDialogVisible(true);
                  sub.unsub();
                }
              })
              .catch((error) => {
                console.error('Error creating NWC', error);
              });
          }
        } catch {
          return;
        }
      }
    });
  };

  const generateLinks = async (nwcId, secret) => {
    const links = [];
    for (let i = 0; i < numberOfLinks; i++) {
      const link = `bitcoinlink.app/claim/${nwcId}?secret=${secret}`;
      links.push(link);
    }
    return links;
  };

  return (
    <main className={'flex flex-col items-center justify-evenly p-8'}>
      <h1 className="text-4xl">NWC Reward Links</h1>
      <div className='flex flex-col items-center'>
        <div className='flex flex-col items-center my-8'>
          <label htmlFor='number'>Number of links</label>
          <InputNumber id='number' value={numberOfLinks} onValueChange={(e) => setNumberOfLinks(e.value)} />
        </div>
        <div className='flex flex-col items-center my-8'>
          <label htmlFor='sats'>Sats per link</label>
          <InputNumber id='sats' value={satsPerLink} onValueChange={(e) => setSatsPerLink(e.value)} />
        </div>
        <div className='flex flex-col justify-between h-[12vh] my-8'>
          <AlbyButton handleSubmit={handleAlbySubmit} />
          <MutinyButton handleSubmit={handleMutinySubmit} />
        </div>
      </div>

      <Dialog header="Generated Links" visible={dialogVisible} onHide={() => setDialogVisible(false)} style={{ width: '50vw' }}>
        <ul>
          {generatedLinks.map((link, index) => (
            <li key={index}>{link}</li>
          ))}
        </ul>
      </Dialog>
    </main>
  );
}