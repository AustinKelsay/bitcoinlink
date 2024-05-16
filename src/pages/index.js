import { useState, useEffect } from 'react';
import { InputNumber } from 'primereact/inputnumber';
import { nwc } from '@getalby/sdk';
import { nip04, generatePrivateKey, getPublicKey } from 'nostr-tools';
import AlbyButton from '@/components/AlbyButton';
import MutinyButton from '@/components/MutinyButton';
import MutinyModal from '@/components/MutinyModal';
import axios from 'axios';
import crypto from 'crypto';
import useSubscribetoEvents from "@/hooks/useSubscribetoEvents.js";
import { useToast } from '@/hooks/useToast';
import { v4 as uuidv4 } from 'uuid';
import 'primeicons/primeicons.css';
import LinkModal from '@/components/LinkModal';

export default function Home() {
  const [numberOfLinks, setNumberOfLinks] = useState(null);
  const [satsPerLink, setSatsPerLink] = useState(null);
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [mutinyModalVisible, setMutinyModalVisible] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState([]);
  const [secret, setSecret] = useState('');

  const { subscribeToEvents, fetchedEvents } = useSubscribetoEvents();
  const { showToast } = useToast();

  const encryptNWCUrl = (url) => {
    const secret = crypto.randomBytes(32).toString('hex');
    setSecret(secret);
    const cipher = crypto.createCipher('aes-256-cbc', secret);
    let encryptedUrl = cipher.update(url, 'utf8', 'hex');
    encryptedUrl += cipher.final('hex');
    return { encryptedUrl, secret };
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
              setLinkModalVisible(true);
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
          <MutinyButton handleSubmit={() => setMutinyModalVisible(true)} disabled={true} />
        </div>
      </div>
      {secret && generatedLinks && generatedLinks.length > 0 && linkModalVisible && (
        <LinkModal generatedLinks={generatedLinks} linkModalVisible={linkModalVisible} setLinkModalVisible={setLinkModalVisible} secret={secret} />
      )
      }
      {
        satsPerLink && numberOfLinks && mutinyModalVisible && (
          <MutinyModal 
            mutinyModalVisible={mutinyModalVisible} 
            setMutinyModalVisible={setMutinyModalVisible} 
            setLinkModalVisible={setLinkModalVisible} 
            setGeneratedLinks={setGeneratedLinks} 
            generateLinks={generateLinks} 
            encryptNWCUrl={encryptNWCUrl} 
            numberOfLinks={numberOfLinks} 
            satsPerLink={satsPerLink} 
          />
        )
      }
    </main>
  );
}