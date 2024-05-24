# bitcoinlink

An open source non-custodial payment service that allows you to send bitcoin using a simple link.

Made possible by Nostr Wallet Connect [(NWC)](https://nwc.dev)


## How it works
- Sender: generates an NWC with either Alby or Mutiny
- BitcoinLink: Generate a pseudorandom secret, encrypt the NWC with the secret, store the secret in the link, and store the encrypted NWC in our database. (the secret only ever lives in app state the server never sees it)
- Receiver: clicks the link, app detects and decrypts the nwc, sends the bitcoin to the receiver's wallet directly from the sender's wallet over lightning

## features:
- Generate NWC with Alby
- Generate NWC with Mutiny via [NWA](https://github.com/nostr-protocol/nips/pull/851)
- Create multiple links from one NWC
- Claim links 1 at a time non-custodially through api endpoint at `GET https://www.bitcoinlink.app/api/link/{nwcID}` providing the secret as your 'authorization' header
- Redeem links with bolt11, lud16 lightning address, or lud06 LNURL
