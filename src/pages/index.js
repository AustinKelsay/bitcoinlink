import { useState, useEffect } from 'react';
import { InputNumber } from 'primereact/inputnumber';
import { nwc } from '@getalby/sdk';
import { nip04 } from 'nostr-tools';
import AlbyButton from '@/components/AlbyButton';
import MutinyButton from '@/components/MutinyButton';
import axios from 'axios';
import crypto from 'crypto';
import useSubscribeToEvents from "@/hooks/useSubscribetoEvents";
import { useToast } from '@/hooks/useToast';
import { v4 as uuidv4 } from 'uuid';
import 'primeicons/primeicons.css';
import LinkModal from '@/components/linkModal';

const appPublicKey = "f2cee06b62c2e57192bf3a344618695da2ad3bf590645b6764959840b62f7bfc";
const appPrivKey = "2ed6c9e8b1840b584af2ee06afcf8527307f7b687301812ec438ccfbd0fbe7f6";
const relayUrl = encodeURIComponent('wss://nostr.mutinywallet.com/');

export default function Home() {
  const [numberOfLinks, setNumberOfLinks] = useState(null);
  const [satsPerLink, setSatsPerLink] = useState(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState([]);
  const [secret, setSecret] = useState('');

  const { subscribeToEvents, fetchedEvents } = useSubscribeToEvents();
  const { showToast } = useToast();

  useEffect(() => {
    fetchedEvents.forEach(async (event) => {
      if (event.tags[0][1] === appPublicKey) {
        try {
          const decrypted = await nip04.decrypt(appPrivKey, event.pubkey, event.content);
          const decryptedSecret = JSON.parse(decrypted).secret;
          if (decryptedSecret === secret) {
            const nwcUri = `nostr+walletconnect://${event.pubkey}?relay=${relayUrl}&pubkey=${appPublicKey}&secret=${appPrivKey}`;

            if (nwcUri) {
              const { encryptedUrl, secret } = encryptNWCUrl(nwcUri);

              const oneYearFromNow = new Date();
              oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

              axios.post('/api/nwc', {
                url: encryptedUrl,
                maxAmount: numberOfLinks * satsPerLink,
                numLinks: numberOfLinks,
                expiresAt: oneYearFromNow,
              })
                .then(async (response) => {
                  if (response.status === 201 && response.data?.id) {
                    console.log('NWC created', response.data);
                    showToast('success', 'NWC Created', 'The NWC has been successfully created.');

                    const generatedLinks = await generateLinks(response.data.id, secret);
                    setGeneratedLinks(generatedLinks);
                    setDialogVisible(true);
                  }
                })
                .catch((error) => {
                  console.error('Error creating NWC', error);
                  showToast('error', 'Error Creating NWC', 'An error occurred while creating the NWC. Please try again.');
                });
            }
          }
        } catch (error) {
          console.error('Error decrypting event', error);
          showToast('error', 'Error Decrypting Event', 'An error occurred while decrypting the event. Please try again.');
        }
      }
    });
  }, [fetchedEvents, secret]);

  const encryptNWCUrl = (url) => {
    const secret = crypto.randomBytes(32).toString('hex');
    setSecret(secret);
    const cipher = crypto.createCipher('aes-256-cbc', secret);
    let encryptedUrl = cipher.update(url, 'utf8', 'hex');
    encryptedUrl += cipher.final('hex');
    return { encryptedUrl, secret };
  };

  const handleMutinySubmit = async () => {
    const newSecret = crypto.randomBytes(16).toString('hex');
    setSecret(newSecret);
    const requiredCommands = 'pay_invoice';
    const budget = `${numberOfLinks * satsPerLink}/year`;
    const identity = "8172b9205247ddfe99b783320782d0312fa305a199fb2be8a3e6563e20b4f0e2";

    const nwaUri = `nostr+walletauth://${appPublicKey}?relay=${relayUrl}&secret=${newSecret}&required_commands=${requiredCommands}&budget=${budget}&identity=${identity}`;
    const encodedNwaUri = encodeURIComponent(nwaUri);
    const mutinySettingsUrl = `https://app.mutinywallet.com/settings/connections?nwa=${encodedNwaUri}`;

    window.open(mutinySettingsUrl, 'mutinyWindow', 'width=600,height=700');
    showToast('info', 'Mutiny Wallet', 'Mutiny Wallet connection window opened.');

    subscribeToEvents([{ kinds: [33194], since: Math.round(Date.now() / 1000) }]);
  };

  const handleAlbySubmit = async () => {
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
      showToast('info', 'Alby', 'Alby connection window opened.');
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
              showToast('success', 'NWC Created', 'The NWC has been successfully created.');

              const generatedLinks = await generateLinks(response.data.id, secret);
              setGeneratedLinks(generatedLinks);
              setDialogVisible(true);
            }
          })
          .catch((error) => {
            console.error('Error creating NWC', error);
            showToast('error', 'Error Creating NWC', 'An error occurred while creating the NWC. Please try again.');
          });
      } else {
        throw new Error('No NWC url returned');
      }
    } catch (e) {
      console.warn('Prompt closed', e);
      showToast('warn', 'Prompt Closed', 'The prompt was closed without completing the action.');
    }
  };

  const generateLinks = async (nwcId, secret) => {
    const links = [];
    for (let i = 0; i < numberOfLinks; i++) {
      const linkIndex = uuidv4();
      const link = `bitcoinlink.app/claim/${nwcId}?secret=${secret}&linkIndex=${linkIndex}`;
      links.push(link);
      axios.post('/api/links', {
        nwcId,
        linkIndex: linkIndex,
      })
        .then((response) => {
          console.log('Link created', response.data);
        })
        .catch((error) => {
          console.error('Error creating link', error);
          showToast('error', 'Error Creating Link', 'An error occurred while creating a link. Please try again.');
        });
    }
    return links;
  };

  return (
    <main className={'flex flex-col items-center justify-evenly p-8'}>
      <h1 className="text-6xl">BitcoinLink</h1>
      <div className='flex flex-col items-center'>
        <div className='flex flex-col items-center my-8'>
          <label className='mb-2 text-2xl' htmlFor='number'>Number of links</label>
          <InputNumber id='number' value={numberOfLinks} onValueChange={(e) => setNumberOfLinks(e.value)} />
        </div>
        <div className='flex flex-col items-center my-8'>
          <label className='mb-2 text-2xl' htmlFor='sats'>Sats per link</label>
          <InputNumber id='sats' value={satsPerLink} onValueChange={(e) => setSatsPerLink(e.value)} />
        </div>
        <div className='flex flex-col justify-between h-[12vh] my-8'>
          <AlbyButton handleSubmit={handleAlbySubmit} />
          <MutinyButton handleSubmit={handleMutinySubmit} disabled={true} />
        </div>
      </div>
      {secret && generatedLinks && generatedLinks.length > 0 && dialogVisible && (
          <LinkModal generatedLinks={generatedLinks} dialogVisible={dialogVisible} setDialogVisible={setDialogVisible} secret={secret} />
        )
      }
    </main>
  );
}