import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { InputNumber, InputNumberValueChangeEvent } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Button as PrimeButton } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Dialog } from 'primereact/dialog';
import { useToast } from '@/hooks/useToast';
import 'primeicons/primeicons.css';
import LinkModal from '@/components/LinkModal';
import { generateLinksFromNWC, isValidNWCUrl } from '@/lib/nostr';

// Dynamically import Bitcoin Connect components (required for NextJS)
const BCButton = dynamic(
  () => import('@getalby/bitcoin-connect-react').then((mod) => mod.Button),
  { ssr: false }
);

/**
 * Validate an NWC URL format using snstr's parseNWCURL.
 * This ensures consistency with the validation used at claim time.
 */
const isValidNwcUrl = isValidNWCUrl;

export default function Home(): React.ReactElement {
  // Form inputs
  const [numberOfLinks, setNumberOfLinks] = useState<number | null>(null);
  const [satsPerLink, setSatsPerLink] = useState<number | null>(null);
  
  // NWC state
  const [nwcUrl, setNwcUrl] = useState<string | null>(null);
  const [manualNwcInput, setManualNwcInput] = useState('');
  const [showNwcModal, setShowNwcModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
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
  const validateInputs = useCallback((): boolean => {
    if (!numberOfLinks || numberOfLinks < 1 || !Number.isInteger(numberOfLinks)) {
      showToast('warn', 'Invalid Input', 'Please enter a valid whole number of links.');
      return false;
    }
    if (!satsPerLink || satsPerLink < 1 || !Number.isInteger(satsPerLink)) {
      showToast('warn', 'Invalid Input', 'Please enter a valid whole number of sats per link.');
      return false;
    }
    return true;
  }, [numberOfLinks, satsPerLink, showToast]);

  /**
   * Generate links from an NWC URL.
   */
  const handleGenerateLinks = useCallback(async (url: string): Promise<void> => {
    if (!validateInputs()) {
      return;
    }
    
    setGeneratingLinks(true);
    setShowNwcModal(false);
    
    try {
      const links = await generateLinksFromNWC({
        nwcUrl: url,
        numberOfLinks: numberOfLinks!,
        satsPerLink: satsPerLink!,
      });
      
      setGeneratedLinks(links);
      setLinkModalVisible(true);
      showToast('success', 'Links Created', `${links.length} links have been created successfully.`);
    } catch (error) {
      console.error('Error generating links (details omitted to avoid leaking NWC credentials)');
      showToast(
        'error',
        'Error Creating Links',
        'An error occurred while creating the links. Please try again.'
      );
    } finally {
      setGeneratingLinks(false);
    }
  }, [validateInputs, numberOfLinks, satsPerLink, showToast]);

  /**
   * Handle wallet connection from Bitcoin Connect.
   */
  const handleConnected = useCallback(async () => {
    setIsConnected(true);
    
    try {
      // Try to get NWC URL from Bitcoin Connect's stored config
      const { getConnectorConfig } = await import('@getalby/bitcoin-connect-react');
      const config = getConnectorConfig();
      
      if (config?.nwcUrl) {
        setNwcUrl(config.nwcUrl);
        showToast('success', 'Connected', 'Wallet connected with NWC support!');
      } else {
        // Extension connection - doesn't provide NWC URL directly
        showToast('error', 'NWC URL Required', 'Could not retrieve NWC URL from wallet. Please try reconnecting or use a different wallet.');
      }
    } catch (error) {
      console.error('Error getting connector config');
    }
  }, [showToast]);

  /**
   * Handle disconnection
   */
  const handleDisconnected = useCallback(() => {
    setIsConnected(false);
    setNwcUrl(null);
  }, []);

  /**
   * Handle "Generate Links" button click
   */
  const handleGenerateClick = useCallback(() => {
    if (!validateInputs()) return;
    
    if (nwcUrl) {
      // We have an NWC URL from Bitcoin Connect, use it directly
      handleGenerateLinks(nwcUrl);
    } else {
      // No NWC URL - show modal to get one
      setShowNwcModal(true);
    }
  }, [validateInputs, nwcUrl, handleGenerateLinks]);

  /**
   * Handle manual NWC URL submission
   */
  const handleManualNwcSubmit = useCallback(() => {
    if (!validateInputs()) {
      return;
    }
    const trimmed = manualNwcInput.trim();
    if (!isValidNwcUrl(trimmed)) {
      showToast('error', 'Invalid NWC URL', 'Please enter a valid nostr+walletconnect:// URL');
      return;
    }
    handleGenerateLinks(trimmed);
    setManualNwcInput('');
  }, [manualNwcInput, handleGenerateLinks, showToast, validateInputs]);

  /**
   * Handle Alby Hub OAuth flow
   */
  const handleAlbyHubAuth = useCallback(async () => {
    if (!validateInputs()) return;
    
    try {
      const { nwc } = await import('@getalby/sdk');
      const client = nwc.NWCClient.withNewSecret();
      
      const yearFromNow = new Date();
      yearFromNow.setFullYear(yearFromNow.getFullYear() + 1);
      const totalAmount = (numberOfLinks ?? 0) * (satsPerLink ?? 0);
      
      showToast('info', 'Alby Hub', 'Opening Alby Hub authorization...');
      
      await client.initNWC({
        name: 'bitcoinlink.app',
        requestMethods: ['pay_invoice'],
        maxAmount: totalAmount,
        editable: false,
        budgetRenewal: 'never',
        expiresAt: yearFromNow,
      });
      
      const url = client.getNostrWalletConnectUrl();
      if (url) {
        await handleGenerateLinks(url);
      } else {
        throw new Error('No NWC URL returned');
      }
    } catch (error) {
      console.error('Alby Hub auth error');
      showToast('warn', 'Cancelled', 'Authorization was cancelled or failed.');
    }
  }, [validateInputs, numberOfLinks, satsPerLink, handleGenerateLinks, showToast]);

  const isLoading = generatingLinks;
  const totalBudget = (numberOfLinks ?? 0) * (satsPerLink ?? 0);
  const hasValidInputs = numberOfLinks && numberOfLinks >= 1 && Number.isInteger(numberOfLinks) && satsPerLink && satsPerLink >= 1 && Number.isInteger(satsPerLink);

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
          
          {hasValidInputs && (
            <div className="text-sm text-gray-400 mb-4">
              <p>
                <strong>Budget needed:</strong> {totalBudget} sats 
                ({numberOfLinks} links × {satsPerLink} sats each)
              </p>
            </div>
          )}
          
          <div className="flex flex-col justify-center items-center gap-4 my-4">
            {/* Bitcoin Connect for wallet status/balance display */}
            <BCButton 
              onConnected={handleConnected}
              onDisconnected={handleDisconnected}
            />
            
            {/* Generate Links button */}
            <PrimeButton
              label="Generate Links"
              icon="pi pi-bolt"
              severity="success"
              size="large"
              disabled={!hasValidInputs || isLoading}
              onClick={handleGenerateClick}
              className="mt-4"
            />
          </div>
        </div>
      )}

      {/* NWC URL Modal - shown when we don't have an NWC URL */}
      <Dialog
        header="Connect NWC Wallet"
        visible={showNwcModal}
        onHide={() => setShowNwcModal(false)}
        className="w-[90vw] sm:w-[70vw] md:w-[50vw] lg:w-[40vw]"
      >
        <div className="flex flex-col gap-6">
          {isConnected && (
            <div className="bg-blue-900/30 border border-blue-500 text-blue-200 p-3 rounded text-sm">
              <p className="m-0">
                ⚡ Your wallet is connected but uses WebLN (not NWC). 
                To generate links, paste your NWC URL below or create one via Alby Hub.
              </p>
            </div>
          )}
          
          {/* Option 1: Paste NWC URL */}
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold m-0">Option 1: Paste NWC URL</h3>
            <p className="text-sm text-gray-400 m-0">
              Get your NWC URL from Alby Hub, Umbrel, Start9, or any NWC-compatible wallet.
            </p>
            <InputText
              value={manualNwcInput}
              onChange={(e) => setManualNwcInput(e.target.value)}
              placeholder="nostr+walletconnect://..."
              className="w-full font-mono text-sm"
            />
            <PrimeButton
              label="Use This NWC URL"
              icon="pi pi-check"
              severity="success"
              onClick={handleManualNwcSubmit}
              disabled={!manualNwcInput.trim()}
            />
          </div>

          <div className="flex items-center gap-4">
            <hr className="flex-1 border-gray-600" />
            <span className="text-gray-500">OR</span>
            <hr className="flex-1 border-gray-600" />
          </div>

          {/* Option 2: Alby Hub OAuth */}
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold m-0">Option 2: Create via Alby Hub</h3>
            <p className="text-sm text-gray-400 m-0">
              Opens Alby Hub to create a new NWC connection with the right budget.
            </p>
            <PrimeButton
              label="Connect to Alby Hub"
              icon="pi pi-external-link"
              severity="info"
              onClick={handleAlbyHubAuth}
            />
          </div>

          <div className="bg-gray-800 p-3 rounded text-sm">
            <p className="m-0">
              <strong>Budget needed:</strong> {totalBudget} sats
            </p>
          </div>
        </div>
      </Dialog>

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
