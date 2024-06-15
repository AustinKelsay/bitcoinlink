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

## BitcoinLink

During the Bitcoin++ hackathon I built [https://bitcoinlink.app](https://bitcoinlink.app) as a simple showcase of how you can use Nostr Wallet Connect (NWC) to create non-custodial one time use reward links redeemable via lightning. The service allows you to send lightning to anyone with a simple link. The sender generates an NWC with either Alby or Mutiny, chooses a total budget and the number of links to split that budget accross, the BitcoinLink service generates a pseudorandom secret, encrypts the NWC with the secret, stores the secret in one or many links, and stores the encrypted NWC in our database. The receiver clicks on of the links, the app detects and decrypts the NWC, and sends the bitcoin to the receiver's wallet directly from the sender's wallet over lightning.

I really like this scheme because it splits the encryption key and the encrypted nwc into two separate places, the server never saves the secret, and the sender can create multiple links from one NWC. Despite the fact that this simple scheme 'works' in theory I made a grave mistake in my implementation that allowed a hacker to get access to both the secret and the encrypted NWC and steal one of my users funds.

I'm going to walk you through the hack, how I fixed it, and what I learned from the experience.

## The Hackathon

I built the first implementation of BitcoinLink at the Bitcoin++ hackathon. As I was working through it, there were a few bad assumptions I made in how I could build my MVP, this required me to change the architecture a bit in the middle of my build. This is a normal occurence in a hackthon so I made my changes and continued on. I was able to get the MVP working and submitted it to the hackathon. I was really happy with the result and I was excited to see what people thought of it. Afterwards a few people approached me wanting to use it for various reasons and I was happy to see that people were interested in it.

Following the hackathon I made some basic improvments to the UI and flow and added the ability to generate links with Mutiny Wallet and also pull links that you generated programmatically through a simple API endpoint. It was during this time that I should have reveiwed my code more carefully and auditied the core flow of the app. I likely would have found this vulnerability before it was exploited but I was distracted by shiny new features and didn't take the time to look over what had already been built and clean it up.

## The Hack

A few days ago I woke up to a message from one of my users that their Alby wallet had been drained of some 200,000+ sats. I was shocked, I had built this service to be non-custodial and secure, how could this have happened? I quickly went to my logs and saw a trail of requests that appeared to be someone generating and claiming links and generally playing with the endpoints. My user had genenrated a large number of links with a fairly large budget on their NWC. The hacker got one of these links and was able to get the secret and decrypt it but how? I went to look over my code and saw pretty quickly that one of my most critical endpoints was left unprotected, allowing the attacker to pull down the encrypted NWC if they had the id. I was devestated, I had failed my users...

What happened? The hacker with a valid link someone else generated was able to grab the secret from the link, pull the encrypted NWC from my unprotected endpoint, decrypt it, and drain the it of it's full budget. Such a stupid mistake I couldnt believe I overlooked this critical vulnerability. Because the code was open source the hacker was able to play around with the service, discover the vulnerability, and exploit it all wihin a single night.

## The Fix

Upon understanding how the attack took place I immediately began working on some possible fixes. This started simple but quickly balooned into a full re-architecture of the service and the security model. I decided to move the decryption of the NWC and the payment into the execution context of my claim endpoint so that the encrypted NWC would never be exposed to the client and a payment could only be exectuted on the server side for the exact amount encoded in the link. I also now duplicate and re-encrypt the NWC across my db with different unique secrets for each link/nwc and unique NWC id's for each encrypted NWC effectively decorrelating all links and NWC's and making it to where even if a secret gets leaked an attacker will never have access to the encrypted NWC and vice versa.

## What I learned

I learned a lot from this experience. This was the first time a project of mine has been hacked, the first time I lost (someone else's) money due to my mistake, and the first time I've had to play cat and mouse with a hacker whose trying to pwn my users in real time. I'm honestly very disappointed in myself for letting this happen but I know it's important to share exactly what happened and take responsibility for it. I want to always be transparent with my work, everything I've ever worked on as a dev has been open source and done in the public. I would be a hypocrite if I didn't also share my failures.

Overall this was an important experience for me. I learned a lot about security, about the importance of code review, and about the importance of taking the time to audit your code and make sure it's secure. I have a newfound respect and understanding for the level of responsibility I have when I build in ship projects to end users, expecially if it involves payments. I hope others will heed my warning and always proceed with caution and an adversarial mindset when building and deploying software.

## Conclusion

With all of that out of the way let me put my money where my mouth is. 

Here is a bitcoinlink that correlates to a 250,000 sats NWC that I generated with Alby: 
Here is the bitcoinlink [source code](https://github.com/austinkelsay/bitcoinlink)

I invite anyone with the technical chops to take the information in this link and the source code and try to hack the updated version of bitcoinlink and drain my wallet.
I'm fairly confident that my updated version of bitcoinlink will make this immensly more difficult if not impossible but I would love to be proven wrong, and you can earn a decent bounty for doing so.
If you do, just please let me know how you did it so I can fix it and make it better for everyone else.

Onwards!