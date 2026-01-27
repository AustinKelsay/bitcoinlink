import { useState } from 'react';
import { InputNumber, InputNumberValueChangeEvent } from 'primereact/inputnumber';
import { nwc } from '@getalby/sdk';
import { ProgressSpinner } from 'primereact/progressspinner';
import AlbyButton from '@/components/AlbyButton';
import MutinyButton from '@/components/mutiny/MutinyButton';
import MutinyModal from '@/components/mutiny/MutinyModal';
import axios from 'axios';
import { encryptNWCUrl } from '@/utils/crypto-browser';
import { useToast } from '@/hooks/useToast';
import { v4 as uuidv4 } from 'uuid';
import 'primeicons/primeicons.css';
import LinkModal from '@/components/LinkModal';

interface OneToManyNWCResult {
  oneToManyNwcId: string;
  oneToManySecret: string;
}

export default function Home(): React.ReactElement {
  const [numberOfLinks, setNumberOfLinks] = useState<number | null>(null);
  const [satsPerLink, setSatsPerLink] = useState<number | null>(null);
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [mutinyModalVisible, setMutinyModalVisible] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<string[]>([]);
  const [oneToManyNwcId, setOneToManyNwcId] = useState('');
  const [oneToManySecret, setOneToManySecret] = useState('');
  const [generatingLinks, setGeneratingLinks] = useState(false);
  const [secret, setSecret] = useState('');

  const { showToast } = useToast();

  const generateOneToManyNWC = async (
    newNWCUrl: string
  ): Promise<OneToManyNWCResult | undefined> => {
    const { encryptedUrl, secret: newSecret } = await encryptNWCUrl(newNWCUrl);
    setSecret(newSecret);

    const yearFromNow = new Date();
    yearFromNow.setFullYear(yearFromNow.getFullYear() + 1);
    const amount = (numberOfLinks ?? 0) * (satsPerLink ?? 0);

    const createdNwc = await axios.post('/api/nwc', {
      url: encryptedUrl,
      maxAmount: amount,
      numLinks: numberOfLinks,
      expiresAt: yearFromNow,
    });

    if (createdNwc.status === 201 && createdNwc.data?.id) {
      return { oneToManyNwcId: createdNwc.data.id, oneToManySecret: newSecret };
    }
  };

  const handleAlbySubmit = async (): Promise<void> => {
    const newNwc = nwc.NWCClient.withNewSecret();
    const yearFromNow = new Date();
    yearFromNow.setFullYear(yearFromNow.getFullYear() + 1);
    const amount = (numberOfLinks ?? 0) * (satsPerLink ?? 0);

    try {
      await newNwc.initNWC({
        name: 'bitcoinlink.app',
        requestMethods: ['pay_invoice'],
        maxAmount: amount,
        editable: false,
        budgetRenewal: 'never',
        expiresAt: yearFromNow,
      });
      showToast('info', 'Alby', 'Alby connection window opened.');
      const newNWCUrl = newNwc.getNostrWalletConnectUrl();

      if (newNWCUrl) {
        setGeneratingLinks(true);
        // first generate the one-to-many NWC with links for the API
        const result = await generateOneToManyNWC(newNWCUrl);
        if (result) {
          setOneToManyNwcId(result.oneToManyNwcId);
          setOneToManySecret(result.oneToManySecret);
        }

        // Then generate the one-to-one NWC and links for the user
        const links: string[] = [];
        for (let i = 0; i < (numberOfLinks ?? 0); i++) {
          const { encryptedUrl, secret: linkSecret } = await encryptNWCUrl(newNWCUrl);

          const createdNwc = await axios.post('/api/nwc', {
            url: encryptedUrl,
            maxAmount: amount / (numberOfLinks ?? 1),
            numLinks: 1,
            expiresAt: yearFromNow,
          });

          if (createdNwc.status === 201 && createdNwc.data?.id) {
            const linkIndex = uuidv4();
            const link = `bitcoinlink.app/claim/${createdNwc.data?.id}?secret=${linkSecret}&linkIndex=${linkIndex}`;
            links.push(link);
            const createdLink = await axios.post('/api/links', {
              nwcId: createdNwc.data.id,
              linkIndex: linkIndex,
            });

            if (createdLink.status === 201) {
              continue;
            } else {
              showToast(
                'error',
                'Error Creating Link',
                'An error occurred while creating a link. Please try again.'
              );
            }
          } else {
            showToast(
              'error',
              'Error Creating NWC',
              'An error occurred while creating the NWC. Please try again.'
            );
          }
        }
        setGeneratedLinks(links);
        setGeneratingLinks(false);
        setLinkModalVisible(true);
        showToast(
          'success',
          'Links Created',
          'The links have been created successfully.'
        );
      } else {
        throw new Error('No NWC url returned');
      }
    } catch (e) {
      console.warn('Prompt closed', e);
      showToast(
        'warn',
        'Prompt Closed',
        'The prompt was closed without completing the action.'
      );
    }
  };

  return (
    <main className={'flex flex-col items-center justify-evenly p-8'}>
      <h1 className="text-6xl mb-0">BitcoinLink</h1>
      <p>Create single use non-custodial bitcoin links redeemable via Lightning</p>
      {generatingLinks ? (
        <>
          <p>Generating links...</p>
          <ProgressSpinner
            style={{ width: '50px', height: '50px' }}
            strokeWidth="8"
            animationDuration=".8s"
          />
        </>
      ) : (
        <div className="flex flex-col items-center">
          <div className="flex flex-col items-center my-8">
            <label className="mb-2 text-2xl" htmlFor="number">
              Number of links
            </label>
            <InputNumber
              id="number"
              value={numberOfLinks}
              onValueChange={(e: InputNumberValueChangeEvent) =>
                setNumberOfLinks(e.value ?? null)
              }
              min={1}
              max={1000}
            />
          </div>
          <div className="flex flex-col items-center my-8">
            <label className="mb-2 text-2xl" htmlFor="sats">
              Sats per link
            </label>
            <InputNumber
              id="sats"
              value={satsPerLink}
              onValueChange={(e: InputNumberValueChangeEvent) =>
                setSatsPerLink(e.value ?? null)
              }
            />
          </div>
          <div className="flex flex-col justify-between h-[12vh] my-8">
            <AlbyButton text="Generate with Alby" handleSubmit={handleAlbySubmit} />
            <MutinyButton
              text="Generate with Mutiny"
              disabled={false}
              handleSubmit={() => setMutinyModalVisible(true)}
            />
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
          numberOfLinks={numberOfLinks ?? 0}
          satsPerLink={satsPerLink ?? 0}
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
