import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { InputNumber, InputNumberValueChangeEvent } from 'primereact/inputnumber';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useToast } from '@/hooks/useToast';
import 'primeicons/primeicons.css';
import LinkModal from '@/components/LinkModal';
import { generateLinksFromNWC } from '@/lib/nostr';

// Dynamically import Bitcoin Connect components (required for NextJS)
const Button = dynamic(
  () => import('@getalby/bitcoin-connect-react').then((mod) => mod.Button),
  { ssr: false }
);

/**
 * Validation result for link generation inputs.
 */
interface ValidationResult {
  isValid: boolean;
  numberOfLinks: number;
  satsPerLink: number;
}

export default function Home(): React.ReactElement {
  // Form inputs
  const [numberOfLinks, setNumberOfLinks] = useState<number | null>(null);
  const [satsPerLink, setSatsPerLink] = useState<number | null>(null);
  
  // Modal visibility
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  
  // Link generation state
  const [generatedLinks, setGeneratedLinks] = useState<string[]>([]);
  const [generatingLinks, setGeneratingLinks] = useState(false);

  // Hooks
  const { showToast } = useToast();

  // Initialize Bitcoin Connect on mount
  useEffect(() => {
    const initBitcoinConnect = async () => {
      const { init } = await import('@getalby/bitcoin-connect-react');
      init({ appName: 'bitcoinlink.app' });
    };
    initBitcoinConnect();
  }, []);

  /**
   * Validate the form inputs for link generation.
   */
  const validateInputs = useCallback((): ValidationResult | null => {
    if (!numberOfLinks || numberOfLinks < 1 || !Number.isInteger(numberOfLinks)) {
      showToast('warn', 'Invalid Input', 'Please enter a valid whole number of links.');
      return null;
    }
    if (!satsPerLink || satsPerLink < 1 || !Number.isInteger(satsPerLink)) {
      showToast('warn', 'Invalid Input', 'Please enter a valid whole number of sats per link.');
      return null;
    }
    return { isValid: true, numberOfLinks, satsPerLink };
  }, [numberOfLinks, satsPerLink, showToast]);

  /**
   * Generate links from an NWC URL.
   */
  const handleGenerateLinks = useCallback(async (nwcUrl: string): Promise<void> => {
    if (!numberOfLinks || !satsPerLink) {
      showToast('error', 'Error', 'Invalid link configuration.');
      return;
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
      // Don't log raw error - may contain NWC credentials
      console.error('Error generating links (details omitted to avoid leaking NWC credentials)');
      showToast(
        'error',
        'Error Creating Links',
        'An error occurred while creating the links. Please try again.'
      );
    } finally {
      setGeneratingLinks(false);
    }
  }, [numberOfLinks, satsPerLink, showToast]);

  /**
   * Handle wallet connection from Bitcoin Connect.
   * Extracts the NWC URL and generates links.
   */
  const handleConnected = useCallback(async () => {
    const validation = validateInputs();
    if (!validation) {
      return;
    }

    try {
      // Get the NWC URL from Bitcoin Connect's stored connection config
      const { getConnectorConfig } = await import('@getalby/bitcoin-connect-react');
      const config = getConnectorConfig();
      
      if (!config?.nwcUrl) {
        showToast('error', 'Connection Error', 'Could not retrieve NWC URL from wallet. Please try a different wallet or paste your NWC URL manually.');
        return;
      }
      
      await handleGenerateLinks(config.nwcUrl);
    } catch (error) {
      console.error('Error handling wallet connection');
      showToast('error', 'Connection Error', 'Failed to process wallet connection.');
    }
  }, [validateInputs, handleGenerateLinks, showToast]);

  // Determine if we're in any loading state
  const isLoading = generatingLinks;

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
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>
          
          <div className="flex flex-col justify-center items-center my-8">
            <p className="text-sm text-gray-400 mb-4">
              Connect your Lightning wallet to generate links
            </p>
            <Button onConnected={handleConnected} />
          </div>
          
          {numberOfLinks && satsPerLink && (
            <div className="text-sm text-gray-400 mt-4">
              <p>
                <strong>Budget needed:</strong> {numberOfLinks * satsPerLink} sats 
                ({numberOfLinks} links × {satsPerLink} sats each)
              </p>
            </div>
          )}
        </div>
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
