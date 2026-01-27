/**
 * React hook for Alby NWC (Nostr Wallet Connect) integration.
 * Handles connection state, authorization, and proper cleanup.
 */

import { useState, useCallback, useRef } from 'react';
import { nwc } from '@getalby/sdk';

/**
 * Connection states for the Alby NWC flow.
 */
export type AlbyConnectionState =
  | 'idle'           // Initial state, ready to connect
  | 'initializing'   // Creating NWC client
  | 'authorizing'    // Alby popup open, waiting for user
  | 'authorized'     // User approved, NWC URL ready
  | 'error';         // Something went wrong

/**
 * Error types for better error handling and UX.
 */
export type AlbyErrorType =
  | 'user_cancelled'    // User closed popup or denied
  | 'connection_failed' // Could not connect to Alby
  | 'timeout'           // Auth took too long
  | 'unknown';          // Unexpected error

export interface AlbyError {
  type: AlbyErrorType;
  message: string;
  originalError?: unknown;
}

export interface AlbyAuthOptions {
  /** App name shown in Alby */
  appName?: string;
  /** Requested permissions */
  requestMethods?: string[];
  /** Max amount in sats */
  maxAmount: number;
  /** Expiration date */
  expiresAt?: Date;
  /** Allow user to edit budget */
  editable?: boolean;
  /** Budget renewal period */
  budgetRenewal?: 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface UseAlbyNWCReturn {
  /** Current connection state */
  connectionState: AlbyConnectionState;
  /** Error details if state is 'error' */
  error: AlbyError | null;
  /** The NWC URL after successful authorization */
  nwcUrl: string | null;
  /** Start the Alby authorization flow */
  authorize: (options: AlbyAuthOptions) => Promise<string | null>;
  /** Reset to idle state */
  reset: () => void;
  /** Check if currently in a loading state */
  isLoading: boolean;
}

/**
 * Hook for managing Alby NWC authorization flow.
 * 
 * @example
 * ```tsx
 * const { connectionState, authorize, nwcUrl, error, isLoading, reset } = useAlbyNWC();
 * 
 * const handleConnect = async () => {
 *   const url = await authorize({ maxAmount: 1000 });
 *   if (url) {
 *     // Use the NWC URL
 *   }
 * };
 * ```
 */
export function useAlbyNWC(): UseAlbyNWCReturn {
  const [connectionState, setConnectionState] = useState<AlbyConnectionState>('idle');
  const [error, setError] = useState<AlbyError | null>(null);
  const [nwcUrl, setNwcUrl] = useState<string | null>(null);
  
  // Keep reference to current client for cleanup
  const clientRef = useRef<nwc.NWCClient | null>(null);

  /**
   * Clean up existing client if any.
   */
  const cleanup = useCallback(() => {
    if (clientRef.current) {
      // NWCClient doesn't have explicit close, but clear reference
      clientRef.current = null;
    }
  }, []);

  /**
   * Reset to initial state.
   */
  const reset = useCallback(() => {
    cleanup();
    setConnectionState('idle');
    setError(null);
    setNwcUrl(null);
  }, [cleanup]);

  /**
   * Determine error type from exception.
   */
  const parseError = (e: unknown): AlbyError => {
    const errorMessage = e instanceof Error ? e.message : String(e);
    
    // User closed popup or denied permission
    if (
      errorMessage.toLowerCase().includes('closed') ||
      errorMessage.toLowerCase().includes('cancelled') ||
      errorMessage.toLowerCase().includes('canceled') ||
      errorMessage.toLowerCase().includes('denied') ||
      errorMessage.toLowerCase().includes('rejected')
    ) {
      return {
        type: 'user_cancelled',
        message: 'Authorization was cancelled.',
        originalError: e,
      };
    }
    
    // Connection issues
    if (
      errorMessage.toLowerCase().includes('network') ||
      errorMessage.toLowerCase().includes('connection') ||
      errorMessage.toLowerCase().includes('failed to fetch')
    ) {
      return {
        type: 'connection_failed',
        message: 'Could not connect to Alby. Please check your internet connection.',
        originalError: e,
      };
    }
    
    // Timeout
    if (errorMessage.toLowerCase().includes('timeout')) {
      return {
        type: 'timeout',
        message: 'Authorization timed out. Please try again.',
        originalError: e,
      };
    }
    
    // Unknown error
    return {
      type: 'unknown',
      message: errorMessage || 'An unexpected error occurred.',
      originalError: e,
    };
  };

  /**
   * Start the Alby authorization flow.
   * Opens Alby popup for user to approve the connection.
   * 
   * @returns The NWC URL on success, null on failure
   */
  const authorize = useCallback(async (options: AlbyAuthOptions): Promise<string | null> => {
    // Reset any previous state
    setError(null);
    setNwcUrl(null);
    cleanup();

    try {
      // Initialize
      setConnectionState('initializing');
      
      const client = nwc.NWCClient.withNewSecret();
      clientRef.current = client;

      // Default expiration: 1 year from now
      const defaultExpiry = new Date();
      defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);

      // Authorizing - popup opens here
      setConnectionState('authorizing');
      
      await client.initNWC({
        name: options.appName ?? 'bitcoinlink.app',
        requestMethods: options.requestMethods ?? ['pay_invoice'],
        maxAmount: options.maxAmount,
        editable: options.editable ?? false,
        budgetRenewal: options.budgetRenewal ?? 'never',
        expiresAt: options.expiresAt ?? defaultExpiry,
      });

      // Get the NWC URL
      const url = client.getNostrWalletConnectUrl();
      
      if (!url) {
        throw new Error('No NWC URL returned from Alby');
      }

      setNwcUrl(url);
      setConnectionState('authorized');
      
      return url;
    } catch (e) {
      const albyError = parseError(e);
      setError(albyError);
      setConnectionState('error');
      
      // Log for debugging but don't expose internals
      // Log for debugging but don't expose raw error (may contain NWC URLs)
      console.error('[useAlbyNWC] Authorization failed:', albyError.type, albyError.message);
      
      return null;
    }
  }, [cleanup]);

  const isLoading = connectionState === 'initializing' || connectionState === 'authorizing';

  return {
    connectionState,
    error,
    nwcUrl,
    authorize,
    reset,
    isLoading,
  };
}
