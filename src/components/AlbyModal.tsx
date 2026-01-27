import React, { useState, useEffect, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import AlbyButton from '@/components/AlbyButton';
import { useToast } from '@/hooks/useToast';
import { useAlbyNWC } from '@/hooks/useAlbyNWC';

interface AlbyModalProps {
  visible: boolean;
  onHide: () => void;
  satsPerLink: number;
  numberOfLinks: number;
  onNwcUrlReady: (nwcUrl: string) => Promise<void>;
}

/**
 * Check if the Alby browser extension (or any WebLN provider) is available.
 */
const hasWeblnExtension = (): boolean => {
  return typeof window !== 'undefined' && !!window.webln;
};

/**
 * Validate an NWC URL format.
 * Valid formats: nostr+walletconnect://pubkey?relay=...&secret=...
 */
const isValidNwcUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    // Must start with nostr+walletconnect://
    if (!url.startsWith('nostr+walletconnect://')) {
      return false;
    }
    // Extract the part after the protocol
    const withoutProtocol = url.slice('nostr+walletconnect://'.length);
    const [pubkey, queryString] = withoutProtocol.split('?');
    
    // Pubkey should be 64 hex characters
    if (!pubkey || !/^[a-f0-9]{64}$/i.test(pubkey)) {
      return false;
    }
    
    // Must have relay parameter
    const params = new URLSearchParams(queryString);
    const relay = params.get('relay');
    if (!relay || !relay.startsWith('wss://')) {
      return false;
    }
    
    // Must have secret parameter
    const secret = params.get('secret');
    if (!secret || secret.length < 32) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
};

/**
 * AlbyModal - Provides multiple ways to connect with NWC:
 * 1. Manual NWC URL paste (for users with existing NWC from any source)
 * 2. Alby Hub OAuth flow (opens albyhub.com authorization)
 * 
 * If Alby extension is detected, shows additional guidance.
 */
const AlbyModal: React.FC<AlbyModalProps> = ({
  visible,
  onHide,
  satsPerLink,
  numberOfLinks,
  onNwcUrlReady,
}) => {
  const [manualNwcUrl, setManualNwcUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasExtension, setHasExtension] = useState(false);
  
  const { showToast } = useToast();
  const {
    connectionState: albyConnectionState,
    authorize: albyAuthorize,
    error: albyError,
    reset: resetAlby,
  } = useAlbyNWC();

  // Check for WebLN extension on mount
  useEffect(() => {
    setHasExtension(hasWeblnExtension());
  }, []);

  // Handle Alby SDK errors
  useEffect(() => {
    if (!albyError) return;
    
    switch (albyError.type) {
      case 'user_cancelled':
        showToast('info', 'Cancelled', 'Authorization was cancelled.');
        break;
      case 'connection_failed':
        showToast('error', 'Connection Failed', 'Could not connect to Alby Hub.');
        break;
      case 'timeout':
        showToast('warn', 'Timeout', 'Authorization timed out.');
        break;
      default:
        showToast('error', 'Error', albyError.message);
    }
    resetAlby();
  }, [albyError, showToast, resetAlby]);

  /**
   * Handle manual NWC URL submission.
   */
  const handleManualSubmit = useCallback(async () => {
    const trimmedUrl = manualNwcUrl.trim();
    
    if (!trimmedUrl) {
      showToast('warn', 'Empty URL', 'Please enter an NWC URL.');
      return;
    }
    
    if (!isValidNwcUrl(trimmedUrl)) {
      showToast(
        'error',
        'Invalid NWC URL',
        'Please enter a valid nostr+walletconnect:// URL with pubkey, relay, and secret.'
      );
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onNwcUrlReady(trimmedUrl);
      setManualNwcUrl('');
      onHide();
    } catch (error) {
      console.error('Error processing NWC URL');
      showToast('error', 'Error', 'Failed to process the NWC connection.');
    } finally {
      setIsSubmitting(false);
    }
  }, [manualNwcUrl, onNwcUrlReady, onHide, showToast]);

  /**
   * Handle Alby Hub OAuth flow.
   */
  const handleAlbyHubAuth = useCallback(async () => {
    const totalAmount = numberOfLinks * satsPerLink;
    
    showToast('info', 'Alby Hub', 'Opening Alby Hub authorization...');
    
    const nwcUrl = await albyAuthorize({
      appName: 'bitcoinlink.app',
      maxAmount: totalAmount,
    });
    
    if (nwcUrl) {
      try {
        await onNwcUrlReady(nwcUrl);
        resetAlby();
        onHide();
      } catch (error) {
        console.error('Error processing Alby Hub NWC URL');
        showToast('error', 'Error', 'Failed to process the NWC connection.');
        resetAlby();
      }
    }
  }, [numberOfLinks, satsPerLink, albyAuthorize, onNwcUrlReady, onHide, resetAlby, showToast]);

  const isAlbyConnecting = albyConnectionState === 'initializing' || albyConnectionState === 'authorizing';
  const isLoading = isSubmitting || isAlbyConnecting;

  const getAlbyButtonText = (): string => {
    if (albyConnectionState === 'initializing') return 'Initializing...';
    if (albyConnectionState === 'authorizing') return 'Waiting for approval...';
    return 'Connect via Alby Hub';
  };

  return (
    <Dialog
      header="Connect Lightning Wallet"
      visible={visible}
      onHide={onHide}
      className="w-[90vw] sm:w-[80vw] md:w-[60vw] lg:w-[50vw] xl:w-[40vw]"
      closable={!isLoading}
    >
      <div className="flex flex-col gap-6">
        {/* Extension detection notice */}
        {hasExtension && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 p-3 rounded">
            <p className="font-bold mb-1">⚡ Lightning Extension Detected</p>
            <p className="text-sm">
              You have a WebLN extension installed. If you already have an NWC URL from 
              your node (Umbrel, Start9, Alby Hub, etc.), paste it below. Otherwise, 
              use the Alby Hub option to create a new connection.
            </p>
          </div>
        )}

        {/* Manual NWC URL input section */}
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold m-0">Option 1: Paste NWC URL</h3>
          <p className="text-sm text-gray-600 m-0">
            If you have an NWC connection string from your Lightning node or wallet, 
            paste it here. Works with Alby Hub, Umbrel, Start9, and any NWC-compatible wallet.
          </p>
          
          <InputText
            value={manualNwcUrl}
            onChange={(e) => setManualNwcUrl(e.target.value)}
            placeholder="nostr+walletconnect://..."
            className="w-full font-mono text-sm"
            disabled={isLoading}
          />
          
          <Button
            label={isSubmitting ? 'Connecting...' : 'Use This NWC URL'}
            icon={isSubmitting ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
            onClick={handleManualSubmit}
            disabled={isLoading || !manualNwcUrl.trim()}
            severity="success"
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-4">
          <hr className="flex-1 border-gray-300" />
          <span className="text-gray-500">OR</span>
          <hr className="flex-1 border-gray-300" />
        </div>

        {/* Alby Hub OAuth section */}
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold m-0">Option 2: Connect to Alby Hub</h3>
          <p className="text-sm text-gray-600 m-0">
            If you use Alby Hub, click below to authorize a connection. This will 
            open Alby Hub where you can approve the spending budget.
          </p>
          
          <div className="flex justify-center">
            <AlbyButton
              text={getAlbyButtonText()}
              handleSubmit={handleAlbyHubAuth}
              loading={isAlbyConnecting}
              loadingText={getAlbyButtonText()}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Budget info */}
        <div className="bg-gray-100 p-3 rounded text-sm">
          <p className="m-0">
            <strong>Budget needed:</strong> {numberOfLinks * satsPerLink} sats 
            ({numberOfLinks} links × {satsPerLink} sats each)
          </p>
        </div>

        {/* Help text */}
        <div className="text-xs text-gray-500">
          <p className="m-0">
            <strong>What is NWC?</strong> Nostr Wallet Connect allows apps to send 
            payments from your Lightning wallet without giving full access. 
            <a 
              href="https://nwc.dev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 ml-1"
            >
              Learn more →
            </a>
          </p>
        </div>
      </div>
    </Dialog>
  );
};

export default AlbyModal;
