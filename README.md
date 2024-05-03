# nwc-rewards-links

{
            const newNwc = await webln.NostrWebLNProvider.withNewSecret();

            const twoWeeksFromNow = new Date();
            twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

            try {
                const initNwcOptions = {
                  name: "",
                  maxAmount: amount,
                  editable: false,
                  budgetRenewal: "never",
                  expiresAt: twoWeeksFromNow,
                };
                await newNwc.initNWC(initNwcOptions);
                const newNWCUrl = newNwc.getNostrWalletConnectUrl();

                if (newNWCUrl) {
                    return newNWCUrl;
                } else {
                    throw new Error('No NWC url returned');
                }

            } catch (e) {
                console.warn("Prompt closed", e);
            }
        }