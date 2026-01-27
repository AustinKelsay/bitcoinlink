import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 border-t border-gray-700 fixed bottom-0 w-full py-3">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          {/* Built with Nostr badge */}
          <div className="flex items-center gap-2 text-gray-300">
            <i className="pi pi-bolt text-yellow-400" />
            <span>Built with Nostr</span>
          </div>

          {/* Open source message */}
          <div className="flex items-center gap-2 text-gray-300">
            <i className="pi pi-heart-fill text-red-400" />
            <span>Open Source</span>
          </div>

          {/* Social links */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/AustinKelsay/bitcoinlink"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-200"
            >
              <i className="pi pi-github text-lg" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
            <a
              href="https://nostr.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-300 hover:text-purple-400 transition-colors duration-200"
            >
              <i className="pi pi-bolt text-lg" />
              <span className="hidden sm:inline">Nostr</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
