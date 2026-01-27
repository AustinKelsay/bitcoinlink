import React, { useEffect, useState, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import MutinyButton from '@/components/mutiny/MutinyButton';
import { useToast } from '@/hooks/useToast';
import { QRCodeSVG } from 'qrcode.react';
import useSubscribeToEvents from '@/hooks/useSubscribeToEvents';
import type { Event } from 'nostr-tools';
import {
  createBitcoinLink,
  BitcoinLinkNostrClient,
  createClaimUrl,
} from '@/lib/nostr';
import type { BitcoinLinkPayload } from '@/lib/nostr';
import { generateKeypair, decryptNIP04 } from 'snstr';

interface MutinyModalProps {
  mutinyModalVisible: boolean;
  setMutinyModalVisible: (visible: boolean) => void;
  satsPerLink: number;
  numberOfLinks: number;
  setLinkModalVisible: (visible: boolean) => void;
  setGeneratedLinks: (links: string[]) => void;
  generatingLinks: boolean;
  setGeneratingLinks: (generating: boolean) => void;
}

const MutinyModal: React.FC<MutinyModalProps> = ({
  mutinyModalVisible,
  setMutinyModalVisible,
  satsPerLink,
  numberOfLinks,
  setLinkModalVisible,
  setGeneratedLinks,
  setGeneratingLinks,
}) => {
  const [secret, setSecret] = useState('');
  const [appPublicKey, setAppPublicKey] = useState('');
  const [appPrivKey, setAppPrivKey] = useState('');
  const [mutinySettingsUrl, setMutinySettingsUrl] = useState('');
  const [nwaUri, setNwaUri] = useState('');
  const relayUrl = encodeURIComponent('wss://nostr.mutinywallet.com/');

  const { showToast } = useToast();
  const { subscribeToEvents, fetchedEvents } = useSubscribeToEvents();

  const generateLinksFromNWC = useCallback(async (nwcUrl: string): Promise<string[]> => {
    const client = new BitcoinLinkNostrClient();
    const links: string[] = [];

    try {
      await client.connect();

      for (let i = 0; i < numberOfLinks; i++) {
        const payload: BitcoinLinkPayload = {
          type: 'bitcoinlink',
          nwcUrl,
          amount: satsPerLink,
        };

        const { giftWrap, receiverPrivateKey } = await createBitcoinLink(payload);
        await client.publish(giftWrap);

        const claimUrl = createClaimUrl(
          giftWrap.id,
          receiverPrivateKey,
          satsPerLink,
          client.getRelays()
        );
        links.push(claimUrl);
      }

      return links;
    } finally {
      client.close();
    }
  }, [numberOfLinks, satsPerLink]);

  const generateLinks = useCallback(async (nwcUrl: string): Promise<void> => {
    if (nwcUrl) {
      setGeneratingLinks(true);

      try {
        const links = await generateLinksFromNWC(nwcUrl);
        setGeneratedLinks(links);
        setLinkModalVisible(true);
        showToast('success', 'Links Created', 'The links have been created successfully.');
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
  }, [setGeneratingLinks, setGeneratedLinks, setLinkModalVisible, showToast, generateLinksFromNWC]);

  useEffect(() => {
    fetchedEvents.forEach(async (event: Event) => {
      if (event.tags[0][1] === appPublicKey) {
        try {
          const decrypted = decryptNIP04(
            appPrivKey,
            event.pubkey,
            event.content
          );
          const decryptedSecret = JSON.parse(decrypted).secret;
          if (decryptedSecret === secret) {
            const nwcUri = `nostr+walletconnect://${event.pubkey}?relay=${relayUrl}&pubkey=${appPublicKey}&secret=${appPrivKey}`;

            if (nwcUri) {
              await generateLinks(nwcUri);
            }
          }
        } catch (error) {
          console.error('Error decrypting event', error);
          showToast(
            'error',
            'Error Decrypting Event',
            'An error occurred while decrypting the event. Please try again.'
          );
        }
      }
    });
  }, [fetchedEvents, secret, appPublicKey, appPrivKey, relayUrl, showToast, generateLinks]);

  useEffect(() => {
    const initKeypair = async () => {
      const keypair = await generateKeypair();
      setAppPublicKey(keypair.publicKey);
      setAppPrivKey(keypair.privateKey);

      const encodedRelayUrl = encodeURIComponent('wss://nostr.mutinywallet.com/');
      const randomBytes = new Uint8Array(16);
      const crypto = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
      crypto.getRandomValues(randomBytes);
      const newSecret = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      setSecret(newSecret);
      const requiredCommands = 'pay_invoice';
      const budget = `${numberOfLinks * satsPerLink}/year`;
      const identity =
        '8172b9205247ddfe99b783320782d0312fa305a199fb2be8a3e6563e20b4f0e2';
      const nwa = `nostr+walletauth://${keypair.publicKey}?relay=${encodedRelayUrl}&secret=${newSecret}&required_commands=${requiredCommands}&budget=${budget}&identity=${identity}`;
      const encodedNwaUri = encodeURIComponent(nwa);
      setNwaUri(nwa);
      const settingsUrl = `https://app.mutinywallet.com/settings/connections?nwa=${encodedNwaUri}`;
      setMutinySettingsUrl(settingsUrl);

      subscribeToEvents([
        {
          kinds: [33194],
          since: Math.round(Date.now() / 1000),
          '#d': [keypair.publicKey],
        },
      ]);
    };

    initKeypair();
  }, [numberOfLinks, satsPerLink, subscribeToEvents]);

  const handleOpenInBrowser = async (): Promise<void> => {
    if (!mutinySettingsUrl) {
      showToast(
        'error',
        'Mutiny Wallet',
        'An error occurred while generating the Mutiny Wallet connection link. Please try again.'
      );
      return;
    }

    window.open(mutinySettingsUrl, 'mutinyWindow', 'width=600,height=700');
    showToast('info', 'Mutiny Wallet', 'Mutiny Wallet connection window opened.');

    subscribeToEvents([
      {
        kinds: [33194],
        since: Math.round(Date.now() / 1000),
        '#d': [appPublicKey],
      },
    ]);
  };

  const copyToClipboard = (text: string): void => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast(
          'success',
          'Copied',
          'Mutiny Wallet connection link copied to clipboard.'
        );
      })
      .catch((error) => {
        console.error('Error copying to clipboard', error);
        showToast(
          'error',
          'Error Copying',
          'An error occurred while copying the Mutiny Wallet connection link to your clipboard.'
        );
      });
  };

  return (
    <>
      <Dialog
        header="Mutiny Wallet Connection"
        visible={mutinyModalVisible}
        onHide={() => setMutinyModalVisible(false)}
        className="sm:w-[80vw] md:w-[70vw] lg:w-[60vw] xl:w-[50vw]"
      >
        <p>
          WARNING: Mutiny is required to be open in order for the receiver to
          redeem their link directly from your wallet
        </p>

        <p>Scan this QR if you have Mutiny Wallet on Mobile</p>
        {nwaUri && (
          <QRCodeSVG
            value={nwaUri}
            onClick={() => copyToClipboard(nwaUri)}
            size={400}
            style={{
              cursor: 'pointer',
              borderRadius: '25px',
              backgroundColor: 'white',
              padding: '10px',
            }}
          />
        )}

        <p>Or click the button below to open Mutiny Wallet in your browser</p>

        <MutinyButton text="Open Mutiny Wallet" handleSubmit={handleOpenInBrowser} />
      </Dialog>
    </>
  );
};

export default MutinyModal;
