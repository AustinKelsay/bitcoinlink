import React from 'react';
import { Button } from 'primereact/button';
import Image from 'next/image';

const MutinyButton = ({text, handleSubmit, disabled}) => {
  return (
    <Button disabled={disabled ? true : false} className="p-button-danger hover:opacity-75 w-[235px] mx-auto" style={{ backgroundColor: 'black', borderColor: '#FF0050' }} onClick={handleSubmit}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Image
            src="/mutiny.png"
            alt="Mutiny Logo"
            width={21}
            height={22}
            />
        <span style={{ marginLeft: '10px', color: 'white' }}>{text}</span>
      </div>
    </Button>
  );
};

export default MutinyButton;

