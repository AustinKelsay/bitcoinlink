import { useState } from 'react';
import { InputNumber, InputNumberValueChangeEvent } from 'primereact/inputnumber';
import { nwc } from '@getalby/sdk';
import { ProgressSpinner } from 'primereact/progressspinner';
import AlbyButton from '@/components/AlbyButton';
import MutinyButton from '@/components/mutiny/MutinyButton';
import MutinyModal from '@/components/mutiny/MutinyModal';
import { useToast } from '@/hooks/useToast';
import 'primeicons/primeicons.css';
import LinkModal from '@/components/LinkModal';
import {
  createBitcoinLink,
  BitcoinLinkNostrClient,
  createClaimUrl,
} from '@/lib/nostr';
import type { BitcoinLinkPayload } from '@/lib/nostr';

export default function Home(): React.ReactElement {
  const [numberOfLinks, setNumberOfLinks] = useState<number | null>(null);
  const [satsPerLink, setSatsPerLink] = useState<number | null>(null);
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [mutinyModalVisible, setMutinyModalVisible] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<string[]>([]);
  const [generatingLinks, setGeneratingLinks] = useState(false);

  const { showToast } = useToast();

  const generateLinksFromNWC = async (nwcUrl: string): Promise<string[]> => {
    const client = new BitcoinLinkNostrClient();
    const links: string[] = [];

    try {
      await client.connect();

      for (let i = 0; i < (numberOfLinks ?? 0); i++) {
        const payload: BitcoinLinkPayload = {
          type: 'bitcoinlink',
          nwcUrl,
          amount: satsPerLink ?? 0,
        };

        const { giftWrap, receiverPrivateKey } = await createBitcoinLink(payload);
        await client.publish(giftWrap);

        const claimUrl = createClaimUrl(
          giftWrap.id,
          receiverPrivateKey,
          satsPerLink ?? 0,
          client.getRelays()
        );
        links.push(claimUrl);
      }

      return links;
    } finally {
      client.close();
    }
  };

  const handleAlbySubmit = async (): Promise<void> => {
    if (!numberOfLinks || numberOfLinks < 1) {
      showToast('warn', 'Invalid Input', 'Please enter a valid number of links.');
      return;
    }
    if (!satsPerLink || satsPerLink < 1) {
      showToast('warn', 'Invalid Input', 'Please enter a valid amount of sats per link.');
      return;
    }

    const newNwc = nwc.NWCClient.withNewSecret();
    const yearFromNow = new Date();
    yearFromNow.setFullYear(yearFromNow.getFullYear() + 1);
    const amount = numberOfLinks * satsPerLink;

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

        try {
          const links = await generateLinksFromNWC(newNWCUrl);
          setGeneratedLinks(links);
          setLinkModalVisible(true);
          showToast(
            'success',
            'Links Created',
            'The links have been created successfully.'
          );
        } catch (error) {
          console.error('Error generating links:', error);
          showToast(
            'error',
            'Error Creating Links',
            'An error occurred while creating the links. Please try again.'
          );
        } finally {
          setGeneratingLinks(false);
        }
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
        />
      )}
    </main>
  );
}
