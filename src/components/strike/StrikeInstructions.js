import React from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import Image from 'next/image';

const StrikeInstructions = ({ isVisible, onHide, input, setInput, onSubmit }) => {

    const handleSubmit = (e) => {
        onSubmit(e);
        onHide();
    }

    return (
        <Dialog header="Strike Instructions" visible={isVisible} onHide={onHide} maximizable>
            <p>Locate your Lightning address (found in the top right corner of the app) and input it into the field below.</p>
            <div className="flex flex-row justify-evenly gap-2">
                <Image src="/strike0.png" alt="Strike Instructions" width={300} height={650} />
                <div className='flex flex-col gap-2'>
                    <InputText className='h-fit w-full' placeholder="Enter your Lightning Address" value={input} onChange={(e) => setInput(e.target.value)} />
                    <Button severity='success' className='h-fit w-full' label="Submit" onClick={(e) => handleSubmit(e)} />
                </div>
            </div>
        </Dialog>
    );
}

export default StrikeInstructions;
