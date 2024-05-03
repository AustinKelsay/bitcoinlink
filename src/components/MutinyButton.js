import React from 'react';
import { Button } from 'primereact/button';
import Image from 'next/image';

const MutinyButton = ({handleSubmit}) => {
  return (
    <Button className="p-button-danger hover:opacity-75" style={{ backgroundColor: 'black', borderColor: '#FF0050' }} onClick={handleSubmit}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Image
            src="/mutiny.png"
            alt="Mutiny Logo"
            width={21}
            height={22}
            />
        <span style={{ marginLeft: '10px', color: 'white' }}>Generate with Mutiny</span>
      </div>
    </Button>
  );
};

export default MutinyButton;

