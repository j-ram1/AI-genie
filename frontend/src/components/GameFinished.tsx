import React from 'react';
import { Trophy, Home, BarChart2, LogOut, MessageSquare, Layout } from 'lucide-react';
import { DtmfKeypad } from './DtmfKeypad';

interface Props {
    session: any;
    onNavigate: (digit: number) => void;
    loading: boolean;
}

export const GameFinished: React.FC<Props> = ({ session, onNavigate, loading }) => {
    const isWin = session.status === 'WON';

    return (
        <div className="container" style={{ textAlign: 'center', paddingBottom: '4rem' }}>
            <div className="glass" style={{ padding: '3rem', maxWidth: '800px', margin: '0 auto', marginBottom: '2rem' }}>
                <div style={{ marginBottom: '2rem' }}>
                    {isWin ? (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <Trophy size={80} style={{ color: '#fbbf24', marginBottom: '1rem' }} />
                            <div className="animate-ping" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(251, 191, 36, 0.2)', borderRadius: '50%' }}></div>
                        </div>
                    ) : (
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⌛</div>
                    )}
                    <h1 style={{ fontSize: '3rem', marginBottom: '1rem', background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {isWin ? 'Victory!' : 'Game Over'}
                    </h1>
                    <p style={{ fontSize: '1.25rem', color: 'var(--text-dim)' }}>{session.prompt}</p>
                </div>

                {session.reveal && (
                    <div style={{ background: 'var(--glass)', padding: '2rem', borderRadius: '1.5rem', border: '1px solid var(--glass-border)', marginBottom: '2.5rem' }}>
                        <p style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>The Identity Was</p>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 800 }}>{session.reveal.name}</h2>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '2rem', alignItems: 'start', textAlign: 'left' }}>
                    {/* Summary */}
                    <div className="glass" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', fontSize: '1rem' }}>
                            <MessageSquare size={20} style={{ marginRight: '0.5rem', color: 'var(--primary)' }} />
                            Game Summary
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {session.summary && session.summary.length > 0 ? (
                                session.summary.map((item: any, idx: number) => (
                                    <div key={`${idx}-${item.q}`} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>Q: {item.q}</p>
                                        <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>A: {item.a}</p>
                                    </div>
                                ))
                            ) : (
                                <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '1rem' }}>No summary available.</p>
                            )}
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="glass" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', textAlign: 'center' }}>What's Next?</h3>
                        <DtmfKeypad onPress={onNavigate} allowedDigits={session.allowed_digits} disabled={loading} />

                        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                                <span style={{ width: '24px', fontWeight: 'bold', color: 'var(--primary)' }}>1</span>
                                <Home size={14} style={{ margin: '0 0.5rem' }} /> Play Again
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                                <span style={{ width: '24px', fontWeight: 'bold', color: 'var(--secondary)' }}>2</span>
                                <BarChart2 size={14} style={{ margin: '0 0.5rem' }} /> Leaderboard
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                                <span style={{ width: '24px', fontWeight: 'bold', color: 'var(--primary)' }}>3</span>
                                <Layout size={14} style={{ margin: '0 0.5rem' }} /> Change Theme
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                                <span style={{ width: '24px', fontWeight: 'bold' }}>9</span>
                                <LogOut size={14} style={{ margin: '0 0.5rem' }} /> Exit
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
