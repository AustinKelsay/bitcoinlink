import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Steps } from 'primereact/steps';
import Image from 'next/image';

const CashAppInstructions = ({ isVisible, onHide, input, setInput, onSubmit, amount }) => {
    const [activeIndex, setActiveIndex] = useState(0);

    const handleSubmit = (e) => {
        onSubmit(e);
        onHide();
    }

    const items = [
        { label: 'Step 1' },
        { label: 'Step 2' },
        { label: 'Step 3' },
        { label: 'Step 4' },
        { label: 'Step 5' },
    ];

    const images = [
        '/cashapp0.jpeg',
        '/cashapp1.jpeg',
        '/cashapp2.jpeg',
        '/cashapp3.jpeg',
        '/cashapp4.jpeg',
    ];

    return (
        <Dialog className='w-full' header='CashApp Instructions' visible={isVisible} onHide={onHide}>
            <p className='text-xl font-bold'>Paste your Lightning Network Invoice into the field below.</p>
            <div className='flex flex-col gap-2 my-4 w-full mx-auto'>
                <InputText className='w-fit' placeholder="Enter your Lightning Invoice" value={input} onChange={(e) => setInput(e.target.value)} />
                <Button severity='success' className='w-full' label="Submit" onClick={(e) => handleSubmit(e)} />
            </div>
            <Steps model={items} activeIndex={activeIndex} onSelect={(e) => setActiveIndex(e.index)} readOnly={false} />
            <div className='flex flex-col items-center mt-4'>
                {activeIndex === 0 && (
                    <p className='text-xl font-bold'>Open your CashApp, go to the Bitcoin tab.</p>
                )}
                {activeIndex === 1 && (
                    <p className='text-xl font-bold'>Tap on the &quot;Receive&quot; button and select &quot;Receive bitcoin&quot;.</p>
                )}
                {activeIndex === 2 && (
                    <p className='text-xl font-bold'>Click &quot;Add amount&quot;.</p>
                )}
                {activeIndex === 3 && (
                    <p className='text-xl font-bold'>Enter {amount} sats and tap &quot;Next&quot;.</p>
                )}
                {activeIndex === 4 && (
                    <p className='text-xl font-bold'>Click on the QR code icon and then copy the Lightning Network Invoice.</p>
                )}
                <Image src={images[activeIndex]} alt={`CashApp Instructions Step ${activeIndex + 1}`} width={300} height={650} />
            </div>
        </Dialog>
    );
}

export default CashAppInstructions;
