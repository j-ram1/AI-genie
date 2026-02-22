import React from 'react';
import { Sparkles, Brain, Trophy, ChevronRight } from 'lucide-react';

interface Props {
    onStart: () => void;
}

export const LandingPage: React.FC<Props> = ({ onStart }) => {
    return (
        <div className="container" style={{ minHeight: '90vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ marginBottom: '2rem', display: 'inline-flex', padding: '1rem', background: 'var(--glass)', borderRadius: '2rem', border: '1px solid var(--glass-border)' }}>
                <Sparkles style={{ color: 'var(--secondary)', marginRight: '0.5rem' }} size={24} />
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>AI-Powered Personality Quiz</span>
            </div>

            <h1 style={{ fontSize: '4rem', marginBottom: '1.5rem', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                AI-Genie
            </h1>

            <p style={{ color: 'var(--text-dim)', fontSize: '1.25rem', maxWidth: '600px', marginBottom: '3rem', lineHeight: 1.6 }}>
                The ultimate test of knowledge. I've picked a hidden personality—can you guess who it is using dynamic hints and logic?
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', marginBottom: '4rem', width: '100%', maxWidth: '900px' }}>
                <div className="glass" style={{ padding: '2rem' }}>
                    <Brain style={{ color: 'var(--primary)', marginBottom: '1rem' }} size={32} />
                    <h3 style={{ marginBottom: '0.5rem' }}>Dynamic AI</h3>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Hints generated in real-time by advanced AI.</p>
                </div>
                <div className="glass" style={{ padding: '2rem' }}>
                    <Sparkles style={{ color: 'var(--secondary)', marginBottom: '1rem' }} size={32} />
                    <h3 style={{ marginBottom: '0.5rem' }}>Multiple Themes</h3>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Sports, Movies, History, and more.</p>
                </div>
                <div className="glass" style={{ padding: '2rem' }}>
                    <Trophy style={{ color: '#fbbf24', marginBottom: '1rem' }} size={32} />
                    <h3 style={{ marginBottom: '0.5rem' }}>Compete</h3>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Fastest guessers climb the global leaderboard.</p>
                </div>
            </div>

            <button className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.25rem' }} onClick={onStart}>
                Enter the Lobby <ChevronRight style={{ marginLeft: '0.5rem' }} size={20} />
            </button>
        </div>
    );
};
