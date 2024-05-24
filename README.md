# bitcoinlink

An open source non-custodial payment service that allows you to send bitcoin using a simple link.

Made possible by Nostr Wallet Connect [(NWC)](https://nwc.dev)


## How it works
- Sender: generates an NWC with either Alby or Mutiny
- BitcoinLink: Generate a pseudorandom secret, encrypt the NWC with the secret, store the secret in the link, and store the encrypted NWC in our database. (the secret only ever lives in app state the server never sees it)
- Receiver: clicks the link, app detects and decrypts the nwc, sends the bitcoin to the receiver's wallet directly from the sender's wallet over lightning