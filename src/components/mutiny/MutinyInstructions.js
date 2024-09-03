import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Steps } from 'primereact/steps';
import Image from 'next/image';

const MutinyInstructions = ({ isVisible, onHide, input, setInput, onSubmit, amount }) => {
    const [activeIndex, setActiveIndex] = useState(0);

    const handleSubmit = (e) => {
        onSubmit(e);
        onHide();
    }

    const items = [
        { label: 'Step 1' },
        { label: 'Step 2' },
        { label: 'Step 3' },
    ];

    const images = [
        '/mutiny0.jpeg',
        '/mutiny1.jpeg',
        '/mutiny2.jpeg',
        '/mutiny3.jpeg',
    ];

    return (
        <Dialog header='Mutiny Instructions' visible={isVisible} onHide={onHide}>
            <p className='text-xl font-bold'>Paste your Lightning Network Invoice into the field below.</p>
            <div className='flex flex-col gap-2 my-4 w-full mx-auto'>
                <InputText className='w-full' placeholder="Enter your Lightning Invoice" value={input} onChange={(e) => setInput(e.target.value)} />
                <Button severity='success' className='w-full' label="Submit" onClick={(e) => handleSubmit(e)} />
            </div>
            <Steps model={items} activeIndex={activeIndex} onSelect={(e) => setActiveIndex(e.index)} readOnly={false} />
            <div className='flex flex-col items-center mt-4'>
                {activeIndex === 0 && (
                    <p className='text-xl font-bold'>Open your Mutiny wallet and tap on the &quot;Receive&quot; button.</p>
                )}
                {activeIndex === 1 && (
                    <p className='text-xl font-bold'>Enter {amount} sats and tap &quot;Continue&quot;.</p>
                )}
                {activeIndex === 2 && (
                    <p className='text-xl font-bold'>Your invoice will be generated. Tap on the invoice to copy it.</p>
                )}
                <Image src={images[activeIndex]} alt={`Mutiny Instructions Step ${activeIndex + 1}`} width={300} height={650} />
            </div>
        </Dialog>
    );
}

export default MutinyInstructions;
