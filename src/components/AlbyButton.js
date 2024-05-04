import React from 'react';
import { Button } from 'primereact/button';

const AlbySVG = () => (
    <svg width="21" height="22" viewBox="0 0 21 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="1.575" cy="1.575" r="1.575" transform="matrix(-1 0 0 1 5.61743 4.85748)" fill="black"/>
    <path d="M3.77997 6.19623L6.71997 9.13623" stroke="black" strokeWidth="0.7875"/>
    <circle cx="16.9051" cy="6.43248" r="1.575" fill="black"/>
    <path d="M17.1938 6.19623L14.2538 9.13623" stroke="black" strokeWidth="0.7875"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M4.48959 15.8309C3.64071 15.4268 3.14668 14.5193 3.31217 13.5938C4.02245 9.62169 6.98253 6.64246 10.5263 6.64246C14.0786 6.64246 17.0444 9.63614 17.7455 13.6227C17.9085 14.5499 17.4105 15.457 16.5587 15.8578C14.7361 16.7155 12.7003 17.195 10.5525 17.195C8.38243 17.195 6.32666 16.7055 4.48959 15.8309Z" fill="#FFDF6F"/>
    <path d="M16.5587 15.8578L16.3911 15.5015L16.5587 15.8578ZM4.48959 15.8309L4.32034 16.1865L4.48959 15.8309ZM3.69977 13.6632C4.38609 9.82499 7.2231 7.03621 10.5263 7.03621V6.24871C6.74195 6.24871 3.65881 9.41839 2.92457 13.5245L3.69977 13.6632ZM10.5263 7.03621C13.8374 7.03621 16.6802 9.83861 17.3577 13.6909L18.1333 13.5545C17.4086 9.43368 14.3198 6.24871 10.5263 6.24871V7.03621ZM16.3911 15.5015C14.6198 16.3351 12.6411 16.8012 10.5525 16.8012V17.5887C12.7595 17.5887 14.8524 17.0959 16.7264 16.2141L16.3911 15.5015ZM10.5525 16.8012C8.44222 16.8012 6.44416 16.3253 4.65883 15.4754L4.32034 16.1865C6.20916 17.0856 8.32265 17.5887 10.5525 17.5887V16.8012ZM17.3577 13.6909C17.4884 14.4343 17.0904 15.1724 16.3911 15.5015L16.7264 16.2141C17.7306 15.7415 18.3287 14.6655 18.1333 13.5545L17.3577 13.6909ZM2.92457 13.5245C2.72626 14.6335 3.31958 15.71 4.32034 16.1865L4.65883 15.4754C3.96184 15.1436 3.5671 14.4051 3.69977 13.6632L2.92457 13.5245Z" fill="black"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M6.00417 14.8434C5.32087 14.5651 4.91555 13.8381 5.15231 13.1393C5.88248 10.9844 8.01244 9.42493 10.5263 9.42493C13.0401 9.42493 15.17 10.9844 15.9002 13.1393C16.137 13.8381 15.7317 14.5651 15.0484 14.8434C13.6528 15.4118 12.1261 15.7249 10.5263 15.7249C8.92644 15.7249 7.39975 15.4118 6.00417 14.8434Z" fill="black"/>
    <ellipse cx="12.3375" cy="12.785" rx="1.3125" ry="1.05" fill="white"/>
    <ellipse cx="8.5802" cy="12.7856" rx="1.3125" ry="1.05" fill="white"/>
    </svg>
    
);

const AlbyButton = ({ handleSubmit, disabled }) => {
  return (
    <Button disabled={disabled ? true : false} className="p-button-success hover:opacity-75" style={{ backgroundColor: '#FFDE6E', borderColor: '#FFDE6E', padding: '10px 20px' }} onClick={handleSubmit}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
        <AlbySVG style={{ width: '21px', height: '22px' }} />
        <span style={{ color: 'black' }}>{!disabled ? "Generate with Alby" : "Alby"}</span>
      </div>
    </Button>
  );
};

export default AlbyButton;

