import React, { useState } from 'react';
import { MessageSquare, Loader2, Send } from 'lucide-react';
import { DtmfKeypad } from './DtmfKeypad';

interface Props {
    session: any;
    onDtmf: (digit: number) => void;
    onGuess: (text: string) => void;
    loading: boolean;
}

export const GameBoard: React.FC<Props> = ({ session, onDtmf, onGuess, loading }) => {
    const [guessText, setGuessText] = useState('');
    const [guessError, setGuessError] = useState('');

    const validateGuess = (value: string) => {
        const normalized = value.trim().replace(/\s+/g, ' ');
        if (!normalized) return 'Enter a guess before submitting.';
        if (normalized.length > 80) return 'Guess must be 80 characters or less.';
        return null;
    };

    const handleGuessSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (loading) return;
        const normalized = guessText.trim().replace(/\s+/g, ' ');
        const validationError = validateGuess(normalized);
        if (validationError) {
            setGuessError(validationError);
            return;
        }

        onGuess(normalized);
        setGuessText('');
        setGuessError('');
    };

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem', alignItems: 'start' }}>
                {/* Main Interaction Area */}
                <div>
                    {/* AI Prompt Section */}
                    <div className="glass" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center' }}>
                            <MessageSquare size={24} style={{ marginRight: '0.75rem', color: 'var(--primary)' }} />
                            Genie Says:
                        </h2>
                        {session.answer && (
                            <div style={{ background: 'var(--glass)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
                                <p style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '0.5rem' }}>Answer:</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: 500 }}>{session.answer}</p>
                            </div>
                        )}
                        <p style={{ fontSize: '1.5rem', lineHeight: 1.4, color: '#fff', fontWeight: 500 }}>
                            {session.prompt}
                        </p>
                    </div>

                    {/* Control Panel */}
                    <div className="glass" style={{ padding: '2rem' }}>
                        {session.mode === 'GUESS_INPUT' ? (
                            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                                <h3 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.5rem' }}>Who is it?</h3>
                                <form onSubmit={handleGuessSubmit} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                                    <input
                                        type="text"
                                        value={guessText}
                                        onChange={(e) => {
                                            setGuessText(e.target.value.slice(0, 80));
                                            if (guessError) setGuessError('');
                                        }}
                                        placeholder="Type the personality's name..."
                                        style={{ flex: 1, padding: '1.25rem 1.5rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: '#fff', fontSize: '1.1rem' }}
                                        autoFocus
                                        disabled={loading}
                                        maxLength={80}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!guessText.trim() || loading}
                                        className="button"
                                        style={{ width: '64px', height: '64px', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : <Send size={24} />}
                                    </button>
                                </form>
                                {guessError && (
                                    <p style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
                                        {guessError}
                                    </p>
                                )}
                                <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                                    Press **9** on the keypad below if you want to exit.
                                </p>
                                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                                    <DtmfKeypad onPress={onDtmf} allowedDigits={session.allowed_digits} disabled={loading} />
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: 'var(--text-dim)' }}>Use the Keypad</h3>
                                <DtmfKeypad onPress={onDtmf} allowedDigits={session.allowed_digits} disabled={loading} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar: Status and History */}
                <div style={{ position: 'sticky', top: '2rem' }}>
                    <div className="glass" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Game Progress</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-dim)' }}>Hints</span>
                                    <span style={{ fontWeight: 600 }}>{session.counters?.hints_used} / {session.counters?.max_hints}</span>
                                </div>
                                <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', background: 'var(--primary)', width: `${((session.counters?.hints_used || 0) / (session.counters?.max_hints || 1)) * 100}%`, transition: 'width 0.3s ease' }} />
                                </div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-dim)' }}>Guess Attempts</span>
                                    <span style={{ fontWeight: 600 }}>{session.counters?.wrong_guesses} / {session.counters?.max_guesses}</span>
                                </div>
                                <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', background: 'var(--secondary)', width: `${((session.counters?.wrong_guesses || 0) / (session.counters?.max_guesses || 1)) * 100}%`, transition: 'width 0.3s ease' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Info - Restore "Available Hints" specifically for selection stage */}
                    {session.mode === 'HINT_SELECTION' && session.question_set && (
                        <div className="glass" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Choose a Question</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {session.question_set.map((q: any) => (
                                    <div
                                        key={q.dtmf}
                                        style={{ display: 'flex', alignItems: 'center', padding: '1rem', background: 'var(--glass)', borderRadius: '0.75rem', border: '1px solid var(--glass-border)', transition: 'transform 0.2s ease' }}
                                    >
                                        <div style={{ width: '32px', height: '32px', background: 'var(--accent-gradient)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1rem', fontSize: '0.9rem', fontWeight: 'bold', flexShrink: 0 }}>
                                            {q.dtmf}
                                        </div>
                                        <span style={{ fontSize: '0.95rem', lineHeight: 1.4, color: '#fff' }}>{q.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="glass" style={{ padding: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>QA History</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {session.summary && session.summary.length > 0 ? (
                                [...session.summary].reverse().map((item: any, idx: number) => (
                                    <div key={`${idx}-${item.q}`} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>Q: {item.q}</p>
                                        <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary)' }}>A: {item.a}</p>
                                    </div>
                                ))
                            ) : (
                                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No hints yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
