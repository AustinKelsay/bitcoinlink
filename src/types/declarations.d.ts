// Type declarations for modules without TypeScript support

declare module 'light-bolt11-decoder' {
  interface DecodedSection {
    name?: string;
    tag?: string;
    value: string | number;
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
