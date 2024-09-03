import React from 'react';
import { Button } from 'primereact/button';
import Image from 'next/image';

const StrikeButton = ({text, handleSubmit, disabled}) => {
  return (
    <Button disabled={disabled ? true : false} className="p-button-secondary hover:opacity-75 w-[235px] mx-auto" style={{backgroundColor: "#000000"}} onClick={handleSubmit}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Image
            src="/strike-icon.png"
            alt="Strike Logo"
            width={21}
            height={22}
            />
        <span style={{ marginLeft: '10px', color: 'white' }}>{text}</span>
      </div>
    </Button>
  );
};

export default StrikeButton;

