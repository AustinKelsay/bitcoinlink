import React from 'react';
import { Button } from 'primereact/button';
import Image from 'next/image';

const MutinyButton = ({handleSubmit, disabled}) => {
  return (
    <Button disabled={disabled ? true : false} className="p-button-danger hover:opacity-75" style={{ backgroundColor: 'black', borderColor: '#FF0050' }} onClick={handleSubmit}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Image
            src="/mutiny.png"
            alt="Mutiny Logo"
            width={21}
            height={22}
            />
        <span style={{ marginLeft: '10px', color: 'white' }}>{!disabled ? "Generate with Mutiny" : "Mutiny"}</span>
      </div>
    </Button>
  );
};

export default MutinyButton;

