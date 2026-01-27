// Type declarations for modules without TypeScript support

declare module 'light-bolt11-decoder' {
  interface RouteHint {
    pubkey: string;
    short_channel_id: string;
    fee_base_msat: number;
    fee_proportional_millionths: number;
    cltv_expiry_delta: number;
  }

  interface DecodedSection {
    name: string;
    tag?: string;
    letters?: string;
    value?: string | number | RouteHint[][] | Record<string, string>;
  }

  interface DecodedBolt11 {
    sections: DecodedSection[];
    expiry: number;
    paymentRequest: string;
  }

  interface Bolt11Decoder {
    decode(paymentRequest: string): DecodedBolt11;
  }

  const decoder: Bolt11Decoder;
  export default decoder;
}
