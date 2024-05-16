import React, { useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import MutinyButton from "@/components/MutinyButton";
import { useToast } from "@/hooks/useToast";
import { QRCodeSVG } from 'qrcode.react';
import useSubscribetoEvents from "@/hooks/useSubscribetoEvents";
import { generatePrivateKey, getPublicKey } from 'nostr-tools';
import crypto from 'crypto';
import axios from 'axios';

const MutinyModal = ({ mutinyModalVisible, setMutinyModalVisible, satsPerLink, numberOfLinks, setGeneratedLinks, setLinkModalVisible, generateLinks }) => {
    // Create a new random 32 byte hex public key and private key pair for NWA
    let sk = generatePrivateKey() // `sk` is a Uint8Array
    const appPublicKey = getPublicKey(sk) // `pk` is a hex string
    const appPrivKey = sk.toString('hex') // `sk` is a hex string
    const relayUrl = encodeURIComponent('wss://nostr.mutinywallet.com/');
    const secret = crypto.randomBytes(16).toString('hex');
    const requiredCommands = 'pay_invoice';
    const budget = `${numberOfLinks * satsPerLink}/year`;
    const identity = "8172b9205247ddfe99b783320782d0312fa305a199fb2be8a3e6563e20b4f0e2";
    const nwaUri = `nostr+walletauth://${appPublicKey}?relay=${relayUrl}&secret=${secret}&required_commands=${requiredCommands}&budget=${budget}&identity=${identity}`;
    const encodedNwaUri = encodeURIComponent(nwaUri);
    const mutinySettingsUrl = `https://app.mutinywallet.com/settings/connections?nwa=${encodedNwaUri}`;

    const { showToast } = useToast();
    const { subscribeToEvents, fetchedEvents } = useSubscribetoEvents();

    useEffect(() => {
        subscribeToEvents([{ kinds: [33194], since: Math.round(Date.now() / 1000), "#d": [appPublicKey] }]);
    }, [subscribeToEvents, appPublicKey]);

    useEffect(() => {
        fetchedEvents.forEach(async (event) => {
            if (event.tags[0][1] === appPublicKey) {
                try {
                    const decrypted = await nip04.decrypt(appPrivKey, event.pubkey, event.content);
                    const decryptedSecret = JSON.parse(decrypted).secret;
                    console.log('decryptedSecret', decryptedSecret);
                    console.log('secret', secret);
                    if (decryptedSecret === secret) {
                        console.log('we got it')
                        const nwcUri = `nostr+walletconnect://${event.pubkey}?relay=${relayUrl}&pubkey=${appPublicKey}&secret=${appPrivKey}`;

                        if (nwcUri) {
                            const { encryptedUrl, secret } = encryptNWCUrl(nwcUri);

                            const oneYearFromNow = new Date();
                            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

                            axios.post('/api/nwc', {
                                url: encryptedUrl,
                                maxAmount: numberOfLinks * satsPerLink,
                                numLinks: numberOfLinks,
                                expiresAt: oneYearFromNow,
                            })
                                .then(async (response) => {
                                    if (response.status === 201 && response.data?.id) {
                                        console.log('NWC created', response.data);
                                        showToast('success', 'NWC Created', 'The NWC has been successfully created.');

                                        const generatedLinks = await generateLinks(response.data.id, secret);
                                        setGeneratedLinks(generatedLinks);
                                        setMutinyModalVisible(false);
                                        setLinkModalVisible(true);
                                    }
                                })
                                .catch((error) => {
                                    console.error('Error creating NWC', error);
                                    showToast('error', 'Error Creating NWC', 'An error occurred while creating the NWC. Please try again.');
                                });
                        }
                    }
                } catch (error) {
                    console.error('Error decrypting event', error);
                    showToast('error', 'Error Decrypting Event', 'An error occurred while decrypting the event. Please try again.');
                }
            }
        });
    }, [fetchedEvents, secret]);

    const handleOpenInBrowser = async () => {
        window.open(mutinySettingsUrl, 'mutinyWindow', 'width=600,height=700');
        showToast('info', 'Mutiny Wallet', 'Mutiny Wallet connection window opened.');
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
            .then(() => {
                showToast('success', 'Copied', 'Mutiny Wallet connection link copied to clipboard.');
            })
            .catch((error) => {
                console.error('Error copying to clipboard', error);
                showToast('error', 'Error Copying', 'An error occurred while copying the Mutiny Wallet connection link to your clipboard.');
            });
    };

    return (
        <Dialog
            header="Mutiny Wallet Connection"
            visible={mutinyModalVisible}
            onHide={() => setMutinyModalVisible(false)}
            className="sm:w-[80vw] md:w-[70vw] lg:w-[60vw] xl:w-[50vw]"
        >
            <p>WARNING: Mutiny is required to be open in order for the receiver to redeem their link directly from your wallet</p>

            <p>Scan this QR if you have Mutiny Wallet on Mobile</p>

            <QRCodeSVG value={mutinySettingsUrl} onClick={() => copyToClipboard(mutinySettingsUrl)} />

            <p>Or click the button below to open Mutiny Wallet in your browser</p>

            <MutinyButton handleSubmit={handleOpenInBrowser} />
        </Dialog>
    )
}

export default MutinyModal;