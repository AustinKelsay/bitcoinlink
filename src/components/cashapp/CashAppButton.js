import React from 'react';
import { Button } from 'primereact/button';
import Image from 'next/image';

const CashAppButton = ({text, handleSubmit, disabled}) => {
  return (
    <Button disabled={disabled ? true : false} className="p-button-success hover:opacity-75 w-[235px] mx-auto" style={{backgroundColor: "#00D64F"}} onClick={handleSubmit}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Image
            src="/cashapp.png"
            alt="Mutiny Logo"
            width={21}
            height={22}
            />
        <span style={{ marginLeft: '10px', color: 'white'}}>{text}</span>
      </div>
    </Button>
  );
};

export default CashAppButton;

