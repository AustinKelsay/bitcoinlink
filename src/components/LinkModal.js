import React, { useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { TabView, TabPanel } from 'primereact/tabview';
import { useToast } from "@/hooks/useToast";

const LinkModal = ({ generatedLinks, dialogVisible, setDialogVisible, secret }) => {
    const [nwcId, setNwcId] = useState('');
    const { showToast } = useToast();

    useEffect(() => {
        if (generatedLinks && generatedLinks.length > 0) {
            // Find the last occurrence of '/'
            const lastSlashIndex = generatedLinks[0].lastIndexOf('/');

            // Find the first occurrence of '?' after the last '/'
            const questionMarkIndex = generatedLinks[0].indexOf('?', lastSlashIndex);

            // Extract the substring between these indices
            const valueBetween = generatedLinks[0].substring(lastSlashIndex + 1, questionMarkIndex);

            setNwcId(valueBetween);
        }
    }
        , [generatedLinks])

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
            .then(() => {
                showToast('success', 'Link Copied', 'The link has been copied to your clipboard.');
            })
            .catch((error) => {
                console.error('Error copying to clipboard', error);
                showToast('error', 'Error Copying Link', 'An error occurred while copying the link to your clipboard.');
            });
    };

    if (!generatedLinks) {
        return null;
    }

    return (
        <Dialog
            header="Generated Links"
            visible={dialogVisible}
            onHide={() => setDialogVisible(false)}
            className="w-11/12 sm:w-3/4 md:w-1/2 lg:w-1/3 max-w-screen-sm"
        >
            <TabView>
                <TabPanel header="Links">

                    <div className="p-4 bg-gray-800 text-white">
                        <div className="space-y-4">
                            {generatedLinks?.map((link, index) => (
                                <div key={index} className="bg-gray-700 p-4 rounded-md shadow-md flex flex-col">
                                    <p className='break-words'>
                                        {link}
                                    </p>
                                    <Button className='flex self-end' icon="pi pi-copy" severity="success" aria-label="copy" onClick={() => copyToClipboard(link)} />
                                </div>
                            ))}
                        </div>
                    </div>
                </TabPanel>
                {generatedLinks && generatedLinks.length > 0 && nwcId && (
                    <TabPanel header="Links through API">
                        <p className="m-0">
                            Everything needed to generate links has been saved to the database except for the secret. The secret is only available once on this page. If you leave this page, you will need to generate new links.
                            <br />
                            <br />
                            API URL: https://bitcoinlink.app/api/link/{nwcId}
                            <br />
                            <br />
                            Secret: <p className="break-words">{secret}</p>
                            <br />
                            <br />
                            Make a GET request to the API URL with the secret in the Authorization header to get the link.
                        </p>
                    </TabPanel>
                )}
            </TabView>
        </Dialog>
    )
}

export default LinkModal;
