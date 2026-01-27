import { useState, useCallback, useEffect } from 'react';
import { InputNumber, InputNumberValueChangeEvent } from 'primereact/inputnumber';
import { ProgressSpinner } from 'primereact/progressspinner';
import AlbyButton from '@/components/AlbyButton';
import MutinyButton from '@/components/mutiny/MutinyButton';
import MutinyModal from '@/components/mutiny/MutinyModal';
import { useToast } from '@/hooks/useToast';
import { useAlbyNWC } from '@/hooks/useAlbyNWC';
import 'primeicons/primeicons.css';
import LinkModal from '@/components/LinkModal';
import { generateLinksFromNWC } from '@/lib/nostr';

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
  const [mutinyModalVisible, setMutinyModalVisible] = useState(false);
  
  // Link generation state
  const [generatedLinks, setGeneratedLinks] = useState<string[]>([]);
  const [generatingLinks, setGeneratingLinks] = useState(false);

  // Hooks
  const { showToast } = useToast();
  const { 
    connectionState: albyConnectionState, 
    authorize: albyAuthorize, 
    error: albyError,
    reset: resetAlby,
  } = useAlbyNWC();

  // Handle Alby errors via useEffect to avoid stale state issues
  useEffect(() => {
    if (!albyError) return;
    
    switch (albyError.type) {
      case 'user_cancelled':
        showToast('info', 'Cancelled', 'Authorization was cancelled. You can try again when ready.');
        break;
      case 'connection_failed':
        showToast('error', 'Connection Failed', 'Could not connect to Alby. Please check your internet connection and try again.');
        break;
      case 'timeout':
        showToast('warn', 'Timeout', 'Authorization timed out. Please try again.');
        break;
      default:
        showToast('error', 'Error', albyError.message || 'An unexpected error occurred. Please try again.');
    }
    resetAlby();
  }, [albyError, showToast, resetAlby]);

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
   * Shared logic used after successful wallet authorization.
   */
  const handleGenerateLinks = useCallback(async (
    nwcUrl: string,
    linkCount: number,
    satsAmount: number
  ): Promise<void> => {
    setGeneratingLinks(true);
    
    try {
      const links = await generateLinksFromNWC({
        nwcUrl,
        numberOfLinks: linkCount,
        satsPerLink: satsAmount,
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
  }, [showToast]);

  /**
   * Handle Alby authorization and link generation flow.
   */
  const handleAlbySubmit = useCallback(async (): Promise<void> => {
    // Validate inputs first
    const validation = validateInputs();
    if (!validation) return;
    
    const { numberOfLinks: linkCount, satsPerLink: satsAmount } = validation;
    const totalAmount = linkCount * satsAmount;

    // Show info that we're opening Alby
    showToast('info', 'Alby', 'Opening Alby authorization...');

    // Start Alby authorization
    const nwcUrl = await albyAuthorize({
      appName: 'bitcoinlink.app',
      maxAmount: totalAmount,
    });

    if (nwcUrl) {
      // Authorization successful - generate links
      await handleGenerateLinks(nwcUrl, linkCount, satsAmount);
      // Reset Alby state for next use
      resetAlby();
    }
    // Error handling moved to useEffect to avoid stale state issues
  }, [validateInputs, showToast, albyAuthorize, handleGenerateLinks, resetAlby]);

  /**
   * Open Mutiny modal with validation.
   */
  const handleMutinyClick = useCallback((): void => {
    const validation = validateInputs();
    if (validation) {
      setMutinyModalVisible(true);
    }
  }, [validateInputs]);

  // Determine if we're in any loading state
  const isAlbyConnecting = albyConnectionState === 'initializing' || albyConnectionState === 'authorizing';
  const isLoading = generatingLinks || isAlbyConnecting;

  // Get appropriate loading text for Alby button
  const getAlbyLoadingText = (): string => {
    if (albyConnectionState === 'initializing') return 'Initializing...';
    if (albyConnectionState === 'authorizing') return 'Waiting for approval...';
    return 'Connecting...';
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
          
          <div className="flex flex-col justify-between h-[12vh] my-8">
            <AlbyButton 
              text="Generate with Alby" 
              handleSubmit={handleAlbySubmit}
              loading={isAlbyConnecting}
              loadingText={getAlbyLoadingText()}
              disabled={generatingLinks}
            />
            <MutinyButton
              text="Generate with Mutiny"
              disabled={isLoading}
              handleSubmit={handleMutinyClick}
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
