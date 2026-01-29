/**
 * Modal dialog component for displaying and copying generated Bitcoin Links.
 * Provides individual and bulk copy functionality for claim URLs.
 */

import React from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { useToast } from '@/hooks/useToast';

/** Props for the LinkModal component */
interface LinkModalProps {
  /** Array of generated claim URLs to display */
  generatedLinks: string[] | null;
  /** Whether the modal is currently visible */
  linkModalVisible: boolean;
  /** Callback to control modal visibility */
  setLinkModalVisible: (visible: boolean) => void;
}

/**
 * Modal component that displays generated Bitcoin Link claim URLs.
 * Users can copy individual links or all links at once to their clipboard.
 *
 * @param props - Component props
 */
const LinkModal: React.FC<LinkModalProps> = ({
  generatedLinks,
  linkModalVisible,
  setLinkModalVisible,
}) => {
  const { showToast } = useToast();

  /**
   * Copy a single link to the clipboard.
   *
   * @param text - The link text to copy
   */
  const copyToClipboard = (text: string): void => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast(
          'success',
          'Link Copied',
          'The link has been copied to your clipboard.'
        );
      })
      .catch((error) => {
        console.error('Error copying to clipboard', error);
        showToast(
          'error',
          'Error Copying Link',
          'An error occurred while copying the link to your clipboard.'
        );
      });
  };

  /**
   * Copy all generated links to the clipboard as a newline-separated list.
   */
  const copyAllLinks = (): void => {
    if (!generatedLinks) return;
    const allLinks = generatedLinks.join('\n');
    navigator.clipboard
      .writeText(allLinks)
      .then(() => {
        showToast(
          'success',
          'All Links Copied',
          'All links have been copied to your clipboard.'
        );
      })
      .catch((error) => {
        console.error('Error copying to clipboard', error);
        showToast(
          'error',
          'Error Copying Links',
          'An error occurred while copying the links to your clipboard.'
        );
      });
  };

  if (!generatedLinks) {
    return null;
  }

  return (
    <Dialog
      header="Generated Links"
      visible={linkModalVisible}
      onHide={() => setLinkModalVisible(false)}
      className="sm:w-[80vw] md:w-[70vw] lg:w-[60vw] xl:w-[50vw]"
    >
      <div className="p-4 bg-gray-800 text-white">
        <div className="flex justify-end mb-4">
          <Button
            label="Copy All"
            icon="pi pi-copy"
            severity="info"
            onClick={copyAllLinks}
          />
        </div>
        <div className="space-y-4">
          {generatedLinks?.map((link, index) => (
            <div
              key={index}
              className="bg-gray-700 p-4 rounded-md shadow-md flex flex-col"
            >
              <div className="overflow-x-auto">
                <a
                  className="break-words text-blue-400 hover:text-blue-300"
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link}
                </a>
              </div>
              <Button
                className="flex self-end mt-2"
                icon="pi pi-copy"
                severity="success"
                aria-label="copy"
                onClick={() => copyToClipboard(link)}
              />
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
};

export default LinkModal;
