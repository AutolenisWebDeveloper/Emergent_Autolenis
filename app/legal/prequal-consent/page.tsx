"use client";

import React from 'react';

const PrequalConsentPage = () => {
    return (
        <div>
            <h1>Prequalification Consent Terms</h1>
            <p>Please read and accept the terms below to proceed with the prequalification process.</p>
            <h2>Terms and Conditions</h2>
            <ul>
                <li>By proceeding, you consent to sharing your information for assessment.</li>
                <li>You acknowledge that the information provided is accurate.</li>
                <li>Further actions may be taken based on the provided information.</li>
            </ul>
            <button onClick={() => alert('Consent Accepted')}>Accept</button>
        </div>
    );
};

export default PrequalConsentPage;