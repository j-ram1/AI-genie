import React, { useState } from 'react';
import { Phone, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import { validatePhoneNumberLength } from 'libphonenumber-js';
import 'react-phone-number-input/style.css';

interface Props {
    onLogin: (user: { id: string; phone: string }) => void;
}

export const Login: React.FC<Props> = ({ onLogin }) => {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const validatePhone = (value: string) => {
        if (!value) return 'Phone number is required.';
        const lengthValidation = validatePhoneNumberLength(value);
        if (lengthValidation === 'TOO_SHORT') {
            return 'Phone number is too short for the selected country.';
        }
        if (lengthValidation === 'TOO_LONG') {
            return 'Phone number is too long for the selected country.';
        }
        if (!isValidPhoneNumber(value)) {
            return 'Enter a valid phone number with country code.';
        }
        return null;
    };

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        const normalizedPhone = phone.trim();
        const validationError = validatePhone(normalizedPhone);
        if (validationError) {
            setError(validationError);
            console.warn('Login validation failed:', validationError);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await api.login(normalizedPhone);
            onLogin({ id: res.user_id, phone: res.phone });
        } catch (err: any) {
            setError(err.message);
            console.error('Login API error:', err);
        } finally {
            setLoading(false);
        }
    };

    const normalizedPhone = phone.trim();
    const liveValidationError = normalizedPhone ? validatePhone(normalizedPhone) : null;
    const displayError = error || liveValidationError;

    return (
        <div className="container" style={{ minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div className="glass" style={{ width: '100%', maxWidth: '450px', padding: '3rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ background: 'var(--glass)', width: '64px', height: '64px', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid var(--glass-border)' }}>
                        <Phone style={{ color: 'var(--primary)' }} size={32} />
                    </div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Identify Yourself</h2>
                    <p style={{ color: 'var(--text-dim)' }}>Enter your phone number to track your progress and scores.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="phone-input" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-dim)' }}>Phone Number</label>
                        <PhoneInput
                            id="phone-input"
                            international
                            defaultCountry="MA"
                            countryCallingCodeEditable={false}
                            limitMaxLength
                            placeholder="Enter phone number"
                            value={phone || undefined}
                            onChange={(value) => {
                                setPhone(value || '');
                                if (error) setError('');
                            }}
                            onCountryChange={() => {
                                if (error) setError('');
                            }}
                            disabled={loading}
                            className="phone-input"
                        />
                    </div>

                    {displayError && (
                        <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            {displayError}
                        </div>
                    )}

                    <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading || !normalizedPhone}>
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>Continue <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} /></>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
