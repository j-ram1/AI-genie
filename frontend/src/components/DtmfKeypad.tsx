import React from 'react';

interface Props {
    onPress: (digit: number) => void;
    allowedDigits?: number[];
    disabled?: boolean;
}

const KEY_LABELS: Record<number, string> = {
    2: 'ABC',
    3: 'DEF',
    4: 'GHI',
    5: 'JKL',
    6: 'MNO',
    7: 'PQRS',
    8: 'TUV',
    9: 'WXYZ',
};

export const DtmfKeypad: React.FC<Props> = ({ onPress, allowedDigits, disabled }) => {
    const keys = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        ['*', 0, '#'],
    ];

    const isAllowed = (key: number | string) => {
        if (typeof key === 'string') return false;
        if (!allowedDigits) return true;
        return allowedDigits.includes(key);
    };

    return (
        <div className="dtmf-container">
            <div className="dtmf-grid">
                {keys.map((row) => (
                    <React.Fragment key={row.join('-')}>
                        {row.map((key) => {
                            const allowed = isAllowed(key);
                            const isDigit = typeof key === 'number';
                            const subLabel = typeof key === 'number' ? KEY_LABELS[key] || '' : '';

                            return (
                                <button
                                    key={key}
                                    className={`dtmf-key ${!allowed || disabled ? 'disabled' : ''}`}
                                    onClick={() => isDigit && allowed && !disabled && onPress(key)}
                                    disabled={!allowed || disabled || !isDigit}
                                >
                                    <span className="key-main">{key}</span>
                                    <span className="key-sub">
                                        {subLabel}
                                    </span>
                                </button>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};
