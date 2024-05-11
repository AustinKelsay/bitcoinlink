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
  }, [generatedLinks])

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
      className="sm:w-[80vw] md:w-[70vw] lg:w-[60vw] xl:w-[50vw]"
    >
      <TabView>
        <TabPanel header="Links">
          <div className="p-4 bg-gray-800 text-white">
            <div className="space-y-4">
              {generatedLinks?.map((link, index) => (
                <div key={index} className="bg-gray-700 p-4 rounded-md shadow-md flex flex-col">
                  <div className="overflow-x-auto">
                    <a className="break-words" href={`https://www.${link}`} target="_blank" rel="noopener noreferrer">
                      {link}
                    </a>
                  </div>
                  <Button className="flex self-end" icon="pi pi-copy" severity="success" aria-label="copy" onClick={() => copyToClipboard(link)} />
                </div>
              ))}
            </div>
          </div>
        </TabPanel>
        {generatedLinks && generatedLinks.length > 0 && nwcId && (
          <TabPanel header="API Integration">
          <div className="p-4 bg-gray-800 text-white">
            <p className="mb-4">
              To generate links programmatically, use the API endpoint below with the provided secret. Please note that the secret is only available on this page and will not be shown again. If you leave this page, you will need to generate new links to obtain a new secret.
            </p>
            <div className="bg-gray-700 p-4 rounded-md shadow-md">
              <p className="text-lg font-bold mb-2">API Endpoint:</p>
              <div className="overflow-x-auto mb-4">
                <pre className="bg-gray-900 text-white p-2 rounded-md">
                  <code className="bg-gray-900 text-white p-2 rounded-md">GET https://bitcoinlink.app/api/link/{nwcId}</code>
                </pre>
              </div>
              <p className="text-lg font-bold mb-2">Secret:</p>
              <div className="overflow-x-auto mb-4">
                <pre className="bg-gray-900 text-white p-2 rounded-md break-all">
                  <code className="bg-gray-900 text-white p-2 rounded-md">{secret}</code>
                </pre>
              </div>
              <p>
                To get a link, make a GET request to the API URL with the secret included in the Authorization header.
              </p>
            </div>
          </div>
        </TabPanel>
        )}
      </TabView>
    </Dialog>
  )
}

export default LinkModal;