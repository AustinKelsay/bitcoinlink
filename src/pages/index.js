import { useState, useEffect } from 'react';
import { InputNumber } from 'primereact/inputnumber';
import { nwc } from '@getalby/sdk';
import { ProgressSpinner } from 'primereact/progressspinner';
import AlbyButton from '@/components/AlbyButton';
import MutinyButton from '@/components/MutinyButton';
import MutinyModal from '@/components/MutinyModal';
import axios from 'axios';
import crypto from 'crypto';
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
  const [oneToManyNwcId, setOneToManyNwcId] = useState('');
  const [oneToManySecret, setOneToManySecret] = useState('');
  const [generatingLinks, setGeneratingLinks] = useState(false);
  const [secret, setSecret] = useState('');

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
    const yearFromNow = new Date();
    yearFromNow.setFullYear(yearFromNow.getFullYear() + 1);
    const amount = numberOfLinks * satsPerLink;

    try {
      const initNwcOptions = {
        name: "bitcoinlink.app",
        requestMethods: ['pay_invoice'],
        maxAmount: amount,
        editable: false,
        budgetRenewal: 'never',
        expiresAt: yearFromNow,
      };
      await newNwc.initNWC(initNwcOptions);
      showToast('info', 'Alby', 'Alby connection window opened.');
      const newNWCUrl = newNwc.getNostrWalletConnectUrl();


      if (newNWCUrl) {
        setGeneratingLinks(true);
        // first generate the one-to-many NWC with links for the API
        const { oneToManyNwcId, oneToManySecret } = await generateOneToManyNWC(newNWCUrl);
        setOneToManyNwcId(oneToManyNwcId);
        setOneToManySecret(oneToManySecret);

        // Then generate the one-to-one NWC and links for the user
        const links = [];
        for (let i = 0; i < numberOfLinks; i++) {
          const { encryptedUrl, secret } = encryptNWCUrl(newNWCUrl);

          const createdNwc = await axios.post('/api/nwc', {
            url: encryptedUrl,
            maxAmount: amount / numberOfLinks,
            numLinks: 1,
            expiresAt: yearFromNow,
          });

          if (createdNwc.status === 201 && createdNwc.data?.id) {
            const linkIndex = uuidv4();
            const link = `bitcoinlink.app/claim/${createdNwc.data?.id}?secret=${secret}&linkIndex=${linkIndex}`;
            links.push(link);
            const createdLink = await axios.post('/api/links', {
              nwcId: createdNwc.data.id,
              linkIndex: linkIndex,
            });

            if (createdLink.status === 201) {
              continue;
            } else {
              showToast('error', 'Error Creating Link', 'An error occurred while creating a link. Please try again.');
            }
          } else {
            showToast('error', 'Error Creating NWC', 'An error occurred while creating the NWC. Please try again.');
          }
        }
        setGeneratedLinks(links);
        setGeneratingLinks(false);
        setLinkModalVisible(true);
        showToast('success', 'Links Created', 'The links have been created successfully.');
      } else {
        throw new Error('No NWC url returned');
      }
    } catch (e) {
      console.warn('Prompt closed', e);
      showToast('warn', 'Prompt Closed', 'The prompt was closed without completing the action.');
    }
  };

  const generateOneToManyNWC = async (newNWCUrl) => {
    const { encryptedUrl, secret } = encryptNWCUrl(newNWCUrl);

    const yearFromNow = new Date();
    yearFromNow.setFullYear(yearFromNow.getFullYear() + 1);
    const amount = numberOfLinks * satsPerLink;

    const createdNwc = await axios.post('/api/nwc', {
      url: encryptedUrl,
      maxAmount: amount,
      numLinks: numberOfLinks,
      expiresAt: yearFromNow,
    });

    if (createdNwc.status === 201 && createdNwc.data?.id) {
      return { oneToManyNwcId: createdNwc.data.id, oneToManySecret: secret };
    }
  }

  return (
    <main className={'flex flex-col items-center justify-evenly p-8'}>
      <h1 className="text-6xl">BitcoinLink</h1>
      {generatingLinks ? (
        <>
          <p>Generating links...</p>
          <ProgressSpinner
            style={{ width: "50px", height: "50px" }}
            strokeWidth="8"
            animationDuration=".8s"
          />
        </>
      )
        : (

          <div className='flex flex-col items-center'>
            <div className='flex flex-col items-center my-8'>
              <label className='mb-2 text-2xl' htmlFor='number'>Number of links</label>
              <InputNumber id='number' value={numberOfLinks} onValueChange={(e) => setNumberOfLinks(e.value)} min={0} max={1000} />
            </div>
            <div className='flex flex-col items-center my-8'>
              <label className='mb-2 text-2xl' htmlFor='sats'>Sats per link</label>
              <InputNumber id='sats' value={satsPerLink} onValueChange={(e) => setSatsPerLink(e.value)} />
            </div>
            <div className='flex flex-col justify-between h-[12vh] my-8'>
              <AlbyButton handleSubmit={handleAlbySubmit} />
              <MutinyButton disabled={true} handleSubmit={() => setMutinyModalVisible(true)} />
            </div>
          </div>
        )}
      {mutinyModalVisible && (
        <MutinyModal
          mutinyModalVisible={mutinyModalVisible}
          setMutinyModalVisible={setMutinyModalVisible}
          setLinkModalVisible={setLinkModalVisible}
          setGeneratedLinks={setGeneratedLinks}
          generatingLinks={generatingLinks}
          setGeneratingLinks={setGeneratingLinks}
          encryptNWCUrl={encryptNWCUrl}
          numberOfLinks={numberOfLinks}
          satsPerLink={satsPerLink}
        />
      )}

      {linkModalVisible && generatedLinks.length > 0 && (
        <LinkModal
          generatedLinks={generatedLinks}
          linkModalVisible={linkModalVisible}
          setLinkModalVisible={setLinkModalVisible}
          secret={secret}
          oneToManyNwcId={oneToManyNwcId}
          oneToManySecret={oneToManySecret}
        />
      )}
    </main>
  );
}