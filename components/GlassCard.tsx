import React from 'react';
import { m as motion } from 'framer-motion';

export interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  color?: string;
  variant?: 'dark' | 'light';
  onClick?: () => void;
}

const MotionDiv = motion.div as any;

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hoverEffect = false,
  variant = 'dark',
  onClick,
}) => {
  const isLight = variant === 'light' || className.includes('bg-paper') || className.includes('text-ink');

  const baseStyle: React.CSSProperties = {
    background: isLight ? 'var(--paper-2, #162035)' : 'var(--ink-2, #0E1626)',
    border: `1px solid ${isLight ? 'var(--rule-light, rgba(14,165,233,0.20))' : 'var(--rule-dark, rgba(56,189,248,0.16))'}`,
    borderRadius: '6px',
    boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
  };

  return (
    <MotionDiv
      className={`p-6 transition-all duration-200 ${hoverEffect ? 'cursor-pointer hover:border-sky/50 hover:shadow-[0_8px_30px_rgba(56,189,248,0.15)]' : ''} ${className}`}
      style={baseStyle}
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={hoverEffect ? { y: -3 } : {}}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionDiv>
  );
};

export const LabCard = GlassCard;
export const ContentCard = GlassCard;
export default GlassCard;
