import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Dialog } from 'primereact/dialog';
import MutinyButton from '@/components/mutiny/MutinyButton';
import { useToast } from '@/hooks/useToast';
import { QRCodeSVG } from 'qrcode.react';
import useSubscribeToEvents from '@/hooks/useSubscribeToEvents';
import type { Event } from 'nostr-tools';
import { generateLinksFromNWC } from '@/lib/nostr';
import { generateKeypair, decryptNIP04 } from 'snstr';

/** Relay URL for Mutiny Wallet NWC connections */
const MUTINY_RELAY_URL = 'wss://nostr.mutinywallet.com/';
const ENCODED_MUTINY_RELAY_URL = encodeURIComponent(MUTINY_RELAY_URL);

/** Mutiny Wallet app identity for NWA connections */
const MUTINY_APP_IDENTITY =
  '8172b9205247ddfe99b783320782d0312fa305a199fb2be8a3e6563e20b4f0e2';

interface MutinyModalProps {
  mutinyModalVisible: boolean;
  setMutinyModalVisible: (visible: boolean) => void;
  satsPerLink: number;
  numberOfLinks: number;
  setLinkModalVisible: (visible: boolean) => void;
  setGeneratedLinks: (links: string[]) => void;
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

  // Track processed event IDs to avoid duplicate processing
  const processedEventIds = useRef<Set<string>>(new Set());

  const { showToast } = useToast();
  const { subscribeToEvents, fetchedEvents } = useSubscribeToEvents();

  /**
   * Generate links from an NWC URL and update UI state.
   */
  const handleGenerateLinks = useCallback(async (nwcUrl: string): Promise<void> => {
    if (!nwcUrl) {
      throw new Error('No NWC url provided');
    }

    setGeneratingLinks(true);

    try {
      const links = await generateLinksFromNWC({
        nwcUrl,
        numberOfLinks,
        satsPerLink,
      });
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
  }, [setGeneratingLinks, setGeneratedLinks, setLinkModalVisible, showToast, numberOfLinks, satsPerLink]);

  /**
   * Process a single NWA response event from Mutiny Wallet.
   */
  const processNwaEvent = useCallback(async (event: Event): Promise<void> => {
    // Skip if already processed
    if (processedEventIds.current.has(event.id)) {
      return;
    }

    // Check if this event is for our app
    if (!event.tags[0] || event.tags[0][1] !== appPublicKey) {
      return;
    }

    // Mark as processed
    processedEventIds.current.add(event.id);

    try {
      const decrypted = decryptNIP04(appPrivKey, event.pubkey, event.content);
      const decryptedSecret = JSON.parse(decrypted).secret;

      if (decryptedSecret === secret) {
        const nwcUri = `nostr+walletconnect://${event.pubkey}?relay=${ENCODED_MUTINY_RELAY_URL}&pubkey=${appPublicKey}&secret=${appPrivKey}`;
        await handleGenerateLinks(nwcUri);
      }
    } catch (error) {
      console.error('Error decrypting event', error);
      showToast(
        'error',
        'Error Decrypting Event',
        'An error occurred while decrypting the event. Please try again.'
      );
    }
  }, [appPublicKey, appPrivKey, secret, showToast, handleGenerateLinks]);

  // Process fetched events properly (not with async forEach)
  useEffect(() => {
    if (fetchedEvents.length === 0 || !appPublicKey || !appPrivKey || !secret) {
      return;
    }

    // Process only unprocessed events
    const unprocessedEvents = fetchedEvents.filter(
      (event) => !processedEventIds.current.has(event.id)
    );

    if (unprocessedEvents.length > 0) {
      // Process events sequentially
      (async () => {
        for (const event of unprocessedEvents) {
          await processNwaEvent(event);
        }
      })();
    }
  }, [fetchedEvents, appPublicKey, appPrivKey, secret, processNwaEvent]);

  // Initialize keypair and NWA URI on mount
  useEffect(() => {
    const initKeypair = async () => {
      const keypair = await generateKeypair();
      setAppPublicKey(keypair.publicKey);
      setAppPrivKey(keypair.privateKey);

      // Generate random secret
      const randomBytes = new Uint8Array(16);
      const crypto = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
      crypto.getRandomValues(randomBytes);
      const newSecret = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      setSecret(newSecret);

      // Build NWA URI
      const budget = `${numberOfLinks * satsPerLink}/year`;
      const nwa = `nostr+walletauth://${keypair.publicKey}?relay=${ENCODED_MUTINY_RELAY_URL}&secret=${newSecret}&required_commands=pay_invoice&budget=${budget}&identity=${MUTINY_APP_IDENTITY}`;
      setNwaUri(nwa);

      // Build settings URL
      const encodedNwaUri = encodeURIComponent(nwa);
      const settingsUrl = `https://app.mutinywallet.com/settings/connections?nwa=${encodedNwaUri}`;
      setMutinySettingsUrl(settingsUrl);

      // Subscribe to NWA response events
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

  /**
   * Open Mutiny Wallet in a new browser window.
   */
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

    // Re-subscribe in case we need to catch new events
    subscribeToEvents([
      {
        kinds: [33194],
        since: Math.round(Date.now() / 1000),
        '#d': [appPublicKey],
      },
    ]);
  };

  /**
   * Copy text to clipboard with feedback.
   */
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
  );
};

export default MutinyModal;
