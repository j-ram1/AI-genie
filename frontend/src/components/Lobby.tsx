import React, { useEffect, useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { api } from '../services/api';
import { DtmfKeypad } from './DtmfKeypad';

interface Props {
    userId: string;
    onGameStart: (session: any) => void;
    externalState?: any;
    onAction?: (digit: number) => void;
    loading?: boolean;
}

export const Lobby: React.FC<Props> = ({ userId, onGameStart, externalState, onAction, loading: externalLoading }) => {
    const [localData, setLocalData] = useState<any>(null);
    const [localLoading, setLocalLoading] = useState(false);
    const [localError, setLocalError] = useState('');

    const data = externalState || localData;
    const loading = externalLoading || localLoading;

    useEffect(() => {
        const isStateEmpty = !externalState || Object.keys(externalState).length === 0;
        if (isStateEmpty) {
            const fetchMenu = async () => {
                setLocalLoading(true);
                try {
                    const res = await api.getLobbyMenu(userId);
                    setLocalData(res);
                } catch (err: any) {
                    setLocalError(err.message);
                } finally {
                    setLocalLoading(false);
                }
            };
            fetchMenu();
        }
    }, [userId, externalState]);

    const handleAction = async (digit: number) => {
        if (onAction) {
            onAction(digit);
            return;
        }

        setLocalLoading(true);
        setLocalError('');
        try {
            const res = await api.lobbyInput(userId, digit);
            if (res.session_id) {
                onGameStart(res);
            } else {
                setLocalData(res);
            }
        } catch (err: any) {
            setLocalError(err.message);
        } finally {
            setLocalLoading(false);
        }
    };

    if (loading && !data) return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <Loader2 className="animate-spin" style={{ color: 'var(--primary)' }} size={48} />
            <p style={{ color: 'var(--text-dim)' }}>Connecting to the Genie...</p>
        </div>
    );

    return (
        <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 400px', gap: '3rem', alignItems: 'start' }}>
                {/* Interaction Panel */}
                <div>
                    <div className="glass" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center' }}>
                            <MessageSquare size={24} style={{ marginRight: '0.75rem', color: 'var(--primary)' }} />
                            Genie Says:
                        </h2>
                        <p style={{ fontSize: '1.5rem', lineHeight: 1.4, color: '#fff', fontWeight: 500 }}>
                            {data?.prompt}
                        </p>
                    </div>

                    {localError && (
                        <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '1rem', marginBottom: '2rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            {localError}
                        </div>
                    )}

                    <div className="glass" style={{ padding: '2rem' }}>
                        <DtmfKeypad
                            onPress={handleAction}
                            allowedDigits={data?.allowed_digits}
                            disabled={loading}
                        />
                    </div>
                </div>

                {/* Info/Themes List Panel */}
                <div className="glass" style={{ padding: '2rem', minHeight: '400px' }}>
                    <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-dim)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {data?.mode === 'THEME_MENU' ? 'Available Themes' : 'Theme Details'}
                    </h3>

                    {data?.mode === 'THEME_MENU' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {Object.entries(data?.digit_map || {}).map(([digit, theme]: [string, any]) => (
                                <div key={digit} style={{ display: 'flex', alignItems: 'center', padding: '1rem', background: 'var(--glass)', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ width: '32px', height: '32px', background: 'var(--accent-gradient)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                        {digit}
                                    </div>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 500 }}>{theme.label}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {data?.mode === 'THEME_SELECTED' && (
                        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
                            <h4 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>{data.selected?.label}</h4>
                            <p style={{ color: 'var(--text-dim)', lineHeight: 1.6 }}>
                                Selection confirmed. Press 1 on the keypad to begin your challenge!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
