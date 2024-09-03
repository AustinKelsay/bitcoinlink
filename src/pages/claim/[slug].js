import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import StrikeInstructions from '@/components/strike/StrikeInstructions';
import CashAppInstructions from '@/components/cashapp/CashAppInstructions';
import MutinyInstructions from '@/components/mutiny/MutinyInstructions';
import { validateBolt11 } from '@/utils/bolt11';
import CashAppButton from '@/components/cashapp/CashAppButton';
import MutinyButton from '@/components/mutiny/MutinyButton';
import StrikeButton from '@/components/strike/StrikeButton';
import AlbyButton from '@/components/AlbyButton';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useToast } from '@/hooks/useToast';
import 'primeicons/primeicons.css';

export default function ClaimPage() {
    const [linkInfo, setLinkInfo] = useState({});
    const [claimed, setClaimed] = useState(false);
    const [exists, setExists] = useState(true);
    const [input, setInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isStrikeVisible, setIsStrikeVisible] = useState(false);
    const [isCashAppVisible, setIsCashAppVisible] = useState(false);
    const [isMutinyVisible, setIsMutinyVisible] = useState(false);
    const router = useRouter();

    const { slug, linkIndex, secret } = router.query;

    const { showToast } = useToast();

    useEffect(() => {
        const fetchLinkInfo = async () => {
            // Need to update this to use the correct API route
            axios.get(`/api/claim/${slug}?linkIndex=${linkIndex}`)
                .then((res) => {
                    setLinkInfo(res.data);
                    setClaimed(res.data.isClaimed);
                })
                .catch((err) => {
                    console.log("errrr", err)
                    if (err?.request?.status === 404) {
                        setExists(false);
                    }
                    console.error(err);
                });
        }

        if (slug && linkIndex) {
            fetchLinkInfo();
        }
    }, [slug, linkIndex]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        if (slug && linkIndex && secret && linkInfo) {
            try {
                if (input) {
                    const validInput = parseLightningAddress(input);
                    if (validInput) {
                        let invoice;
                        if (validInput.type === "lnurl") {
                            const response = await fetch(validInput.data);
                            const lnurlPayData = await response.json();

                            if (lnurlPayData.tag === "payRequest") {
                                const amount = linkInfo.amount * 1000;
                                if (
                                    amount >= lnurlPayData.minSendable &&
                                    amount <= lnurlPayData.maxSendable
                                ) {
                                    const invoiceResponse = await fetch(
                                        `${lnurlPayData.callback}?amount=${amount}`
                                    );
                                    const invoiceData = await invoiceResponse.json();
                                    console.log("Invoice data:", invoiceData);
                                    invoice = invoiceData.pr;

                                    // // Verify the metadata hash
                                    // const metadataHash = sha256(utf8ToBytes(lnurlPayData.metadata));
                                    // const invoiceDescription = getBolt11Descirption(invoice);
                                    // console.log('Metadata hash:', metadataHash);
                                    // console.log('Invoice description:', invoiceDescription);
                                    // if (invoiceDescription !== metadataHash) {
                                    //     console.error('Metadata hash mismatch');
                                    //     setIsSubmitting(false);
                                    //     showToast('error', 'Metadata Hash Mismatch', 'The metadata hash in the invoice does not match the expected hash.');
                                    //     return;
                                    // }
                                } else {
                                    console.error("Amount out of range");
                                    setIsSubmitting(false);
                                    showToast(
                                        "error",
                                        "Amount Out of Range",
                                        "The requested amount is not within the acceptable range for this LNURL-pay."
                                    );
                                    return;
                                }
                            } else {
                                console.error("Invalid LNURL-pay data");
                                setIsSubmitting(false);
                                showToast(
                                    "error",
                                    "Invalid LNURL-pay Data",
                                    "The LNURL-pay data returned from the server is invalid."
                                );
                                return;
                            }
                        } else if (validInput.type === "invoice") {
                            invoice = validInput.data;
                        } else if (validInput.type === "address") {
                            const callback = await getCallback(validInput.data);
                            if (callback) {
                                const amount = linkInfo?.amount * 1000;
                                invoice = await fetchInvoice({
                                    callback: callback,
                                    amount: amount,
                                });
                            }
                        }

                        if (invoice) {
                            try {
                                const claimresponse = await axios.post(`/api/claim/${slug}?linkIndex=${linkIndex}`, {
                                    invoice: invoice,
                                }, {
                                    headers: {
                                        authorization: secret,
                                    }
                                });

                                if (claimresponse.status === 200) {
                                    showToast(
                                        "success",
                                        "Payment Sent",
                                        "The payment has been successfully sent."
                                    );


                                    showToast(
                                        "success",
                                        "Link Claimed",
                                        "The link has been successfully claimed."
                                    );
                                    setTimeout(() => {
                                        setIsSubmitting(false);
                                        setClaimed(true);
                                    }, 2000);

                                } else if (claimresponse.status === 400 && claimresponse.data.error === "Invalid invoice amount") {
                                    console.error("Invalid Invoice Amount");
                                    setIsSubmitting(false);
                                    showToast(
                                        "warn",
                                        "Invalid Invoice Amount",
                                        "The invoice amount does not match the expected amount."
                                    );
                                    return;
                                } else {
                                    console.error("Error sending payment");
                                    setIsSubmitting(false);
                                    showToast(
                                        "error",
                                        "Error Sending Payment",
                                        "An error occurred while sending the payment. Please try again."
                                    );
                                    return;
                                }
                            } catch {
                                console.error("Error sending payment");
                                setIsSubmitting(false);
                                showToast(
                                    "error",
                                    "Error Sending Payment",
                                    "An error occurred while sending the payment. Please try again."
                                );
                                return;
                            }
                        } else {
                            console.error("Error fetching invoice");
                            setIsSubmitting(false);
                            showToast(
                                "error",
                                "Error Fetching Invoice",
                                "An error occurred while fetching the invoice. Please try again."
                            );
                            return;
                        }
                    } else {
                        console.error("Invalid Input");
                        setIsSubmitting(false);
                        showToast(
                            "warn",
                            "Invalid Input",
                            "The provided input is invalid."
                        );
                        return;
                    }
                }
            } catch {
                console.error("Error sending payment");
                setIsSubmitting(false);
                showToast(
                    "error",
                    "Error Sending Payment",
                    "An error occurred while sending the payment. Please try again."
                );
                return;
            }
        }
    };

    const decodeLnurl = (lnurl, name) => {
        try {
            let { prefix: hrp, words: dataPart } = bech32.decode(lnurl, 2000);
            let requestByteArray = bech32.fromWords(dataPart);

            const decoded = Buffer.from(requestByteArray).toString();
            return decoded;
        } catch (error) {
            console.error("There was a problem decoding the lnurl:", name, error);
            showToast(
                "error",
                "LNURL Decoding Error",
                "There was a problem decoding the LNURL."
            );
        }
    };

    const parseLightningAddress = (input) => {
        if (typeof input !== "string") return false;

        if (input.toLowerCase().startsWith("lnurl")) {
            const decoded = decodeLnurl(input);

            if (!decoded) {
                showToast("warn", "Invalid LNURL", "This is not a valid LNURL.");
                return false;
            } else {
                console.log("Decoded LNURL:", decoded);
                return { type: "lnurl", data: decoded };
            }
        } else if (input.toLowerCase().startsWith("lnbc")) {
            // Validate the invoice
            try {
                const valid = validateBolt11(input);
                console.log("Valid invoice:", valid, input);
                if (!valid) {
                    showToast("warn", "Invalid Invoice", "This is not a valid invoice.");
                    return false;
                }
                return { type: "invoice", data: input };
            } catch (error) {
                showToast("warn", "Invalid Invoice", "This is not a valid invoice.");
                return false;
            }
        } else {
            const [username, domain] = input.split("@");

            if (!!username && !!domain && domain.includes(".")) {
                return { type: "address", data: input };
            } else {
                showToast(
                    "warn",
                    "Invalid Lightning Address",
                    "This is not a valid lightning address."
                );
                return false;
            }
        }
    };

    const fetchInvoice = async ({ callback, amount }) => {
        const comment = "Reward";
        const encodedComment = encodeURIComponent(comment);

        // Check if the callback URL already has a query string
        const urlSeparator = callback.includes("?") ? "&" : "?";
        const url = `${callback}${urlSeparator}amount=${amount}&comment=${encodedComment}`;

        try {
            const response = await fetch(url, {
                method: "GET",
            });

            const data = await response.json();

            if (data.pr) {
                return data.pr;
            } else {
                throw new Error("No invoice returned");
            }
        } catch (error) {
            console.error("Error:", error);
            showToast(
                "error",
                "Error Fetching Invoice",
                "An error occurred while fetching the invoice. Please try again."
            );
        }
    };

    const getCallback = async (lnAddress) => {
        const lnurlpEndpoint = lnAddress.includes("/.well-known/lnurlp/")
            ? lnAddress
            : `https://${lnAddress.split("@")[1]}/.well-known/lnurlp/${lnAddress.split("@")[0]
            }`;

        try {
            const response = await fetch(lnurlpEndpoint);
            const data = await response.json();
            const { callback } = data;
            return callback;
        } catch (error) {
            console.error("There was a problem fetching the callback:", error);
            showToast(
                "error",
                "Error Fetching Callback",
                "There was a problem fetching the callback. Please try again."
            );
        }
    };

    const handleAlbySubmit = async () => {
        try {
            setIsSubmitting(true);
            if (window && window?.webln) {
                await window.webln.enable();
                const result = await window.webln.makeInvoice({
                    amount: linkInfo?.amount,
                    comment: "Reward",
                });
                if (result && result?.paymentRequest) {
                    try {
                        const claimresponse = await axios.post(`/api/claim/${slug}?linkIndex=${linkIndex}`, {
                            invoice: result.paymentRequest,
                        }, {
                            headers: {
                                authorization: secret,
                            }
                        });

                        if (claimresponse.status === 200) {
                            showToast(
                                "success",
                                "Payment Sent",
                                "The payment has been successfully sent."
                            );


                            showToast(
                                "success",
                                "Link Claimed",
                                "The link has been successfully claimed."
                            );
                            setTimeout(() => {
                                setIsSubmitting(false);
                                setClaimed(true);
                            }, 2000);

                        } else if (claimresponse.status === 400 && claimresponse.data.error === "Invalid invoice amount") {
                            console.error("Invalid Invoice Amount");
                            setIsSubmitting(false);
                            showToast(
                                "warn",
                                "Invalid Invoice Amount",
                                "The invoice amount does not match the expected amount."
                            );
                            return;
                        } else {
                            console.error("Error sending payment");
                            setIsSubmitting(false);
                            showToast(
                                "error",
                                "Error Sending Payment",
                                "An error occurred while sending the payment. Please try again."
                            );
                            return;
                        }
                    } catch {
                        console.error("Error sending payment");
                        setIsSubmitting(false);
                        showToast(
                            "error",
                            "Error Sending Payment",
                            "An error occurred while sending the payment. Please try again."
                        );
                        return;
                    }
                }
            }
        } catch {
            console.error("Error sending payment");
            setIsSubmitting(false);
            showToast(
                "error",
                "Error Sending Payment",
                "An error occurred while sending the payment. Please try again."
            );
            return;
        }
    }

    return (
        <main className="flex flex-col items-center justify-evenly p-8 sm:w-[80vw] md:w-[70vw] lg:w-[60vw] xl:w-[50vw] mx-auto">
            {!exists ? (
                <>
                    <h1 className="text-6xl mb-0">Link not found</h1>
                    <p className='text-2xl mt-0'>This means the link has either already been claimed or has expired</p>
                </>
            ) : (
                <>
                    <h1 className="text-6xl mb-0">
                        {claimed ? "Link Claimed" : "Claim Link"}
                    </h1>
                    <div className="flex flex-col items-center">
                        <p className="text-2xl mt-0">
                            <span className={`${claimed ? "text-green-500" : "text-yellow-500"}`}>{claimed ? "Claimed" : "Unclaimed"}</span>
                        </p>
                        {claimed || !linkInfo ? null : (
                            <p className="text-3xl mt-0">
                                {linkInfo?.amount} sats
                            </p>
                        )}
                        <form
                            onSubmit={handleSubmit}
                            className="flex flex-col items-center"
                        >
                            <div className="flex flex-col items-center my-8">
                                <label className="mb-2 text-3xl" htmlFor="lightning-address">
                                    Enter any Lightning Address, Bolt11 Invoice, or LNURL
                                </label>
                                <InputText
                                    className="w-full"
                                    id="lightning-address"
                                    placeholder="user@website.com... or lnbc1q or LNURL1..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                />
                            </div>
                            {isSubmitting ? (
                                <ProgressSpinner
                                    style={{ width: "50px", height: "50px" }}
                                    strokeWidth="8"
                                    animationDuration=".8s"
                                />
                            ) : (
                                <Button
                                    disabled={claimed}
                                    label="Claim"
                                    severity="success"
                                    type="submit"
                                />
                            )}
                        </form>
                        <div className="flex flex-col my-4">
                            <p className="text-2xl text-center my-0">OR</p>
                            <div className="flex flex-col w-[225px] justify-between mx-auto h-[25vh]">
                                <AlbyButton text="Claim with Alby" handleSubmit={handleAlbySubmit} />
                                <StrikeButton text="Claim with Strike" handleSubmit={() => setIsStrikeVisible(true)} />
                                <MutinyButton text="Claim with Mutiny" handleSubmit={() => setIsMutinyVisible(true)} />
                                <CashAppButton text="Claim with CashApp" handleSubmit={() => setIsCashAppVisible(true)} />
                            </div>
                        </div>
                    </div>
                </>
            )}
            <StrikeInstructions isVisible={isStrikeVisible} onHide={() => {
                setIsStrikeVisible(false);
            }} input={input} setInput={setInput} onSubmit={handleSubmit} />
            <CashAppInstructions isVisible={isCashAppVisible} onHide={() => {
                setIsCashAppVisible(false);
            }} input={input} setInput={setInput} onSubmit={handleSubmit} amount={linkInfo?.amount} />
            <MutinyInstructions isVisible={isMutinyVisible} onHide={() => {
                setIsMutinyVisible(false);
            }} input={input} setInput={setInput} onSubmit={handleSubmit} amount={linkInfo?.amount} />
        </main>
    )
}