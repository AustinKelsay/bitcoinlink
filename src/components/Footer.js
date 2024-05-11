import React from "react";

const Footer = () => {
    return (
        <footer className="bg-gray-800 p-0 fixed bottom-0 w-[100vw]">
            <div className="container mx-auto text-center text-white">
                <p className="text-base">
                    BitcoinLink is open source. View the source code <a href="https://github.com/AustinKelsay/bitcoinlink" target="_blank" rel="noopener noreferrer">here</a>.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
