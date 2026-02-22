import React from 'react';
import { Trophy, ArrowLeft, User, Medal } from 'lucide-react';

interface LeaderboardRow {
    rank: number;
    phone: string;
    score: number;
    wins: number;
    losses: number;
}

interface Props {
    data: {
        theme_id: string;
        top10: LeaderboardRow[];
        me: LeaderboardRow | null;
    };
    onBack: () => void;
}

export const Leaderboard: React.FC<Props> = ({ data, onBack }) => {
    const getMedalColor = (rank: number) => {
        if (rank === 1) return '#fbbf24';
        if (rank === 2) return '#94a3b8';
        return '#b45309';
    };

    return (
        <div className="container">
            <div className="glass" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Trophy size={32} style={{ color: '#fbbf24', marginRight: '1rem' }} />
                    <div>
                        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Leaderboard</h2>
                        <p style={{ color: 'var(--text-dim)', margin: 0 }}>Theme: {data.theme_id}</p>
                    </div>
                </div>
                <button
                    onClick={onBack}
                    className="button"
                    style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
                >
                    <ArrowLeft size={20} />
                    Back to Game
                </button>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* My Ranking */}
                {data.me && (
                    <div className="glass" style={{ padding: '1.5rem', border: '2px solid var(--primary)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, right: 0, padding: '0.5rem 1rem', background: 'var(--primary)', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>
                            YOUR RANK
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px 100px 100px', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>#{data.me.rank}</div>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ width: '40px', height: '40px', background: 'var(--primary-gradient)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1rem' }}>
                                    <User size={20} />
                                </div>
                                <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{data.me.phone}</span>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Score</div>
                                <div style={{ fontWeight: 'bold', color: '#fbbf24' }}>{data.me.score}</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Wins</div>
                                <div style={{ fontWeight: 'bold' }}>{data.me.wins}</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Losses</div>
                                <div style={{ fontWeight: 'bold' }}>{data.me.losses}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Top 10 */}
                <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--glass-border)', display: 'grid', gridTemplateColumns: '80px 1fr 100px 100px 100px', gap: '1rem', color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        <span>Rank</span>
                        <span>Player</span>
                        <span style={{ textAlign: 'center' }}>Score</span>
                        <span style={{ textAlign: 'center' }}>Wins</span>
                        <span style={{ textAlign: 'center' }}>Losses</span>
                    </div>
                    {data.top10.map((row) => (
                        <div
                            key={row.rank + row.phone}
                            style={{
                                padding: '1.25rem 1.5rem',
                                display: 'grid',
                                gridTemplateColumns: '80px 1fr 100px 100px 100px',
                                alignItems: 'center',
                                gap: '1rem',
                                borderBottom: '1px solid var(--glass-border)',
                                background: row.phone === data.me?.phone ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                {row.rank <= 3 ? (
                                    <Medal size={24} style={{ color: getMedalColor(row.rank) }} />
                                ) : (
                                    <span style={{ paddingLeft: '0.5rem', fontWeight: 'bold', color: 'var(--text-dim)' }}>#{row.rank}</span>
                                )}
                            </div>
                            <div style={{ fontWeight: 500 }}>{row.phone}</div>
                            <div style={{ textAlign: 'center', fontWeight: 'bold', color: '#fbbf24' }}>{row.score}</div>
                            <div style={{ textAlign: 'center' }}>{row.wins}</div>
                            <div style={{ textAlign: 'center' }}>{row.losses}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
