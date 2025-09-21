import React, { useState, useEffect } from 'react';

const Tooltip = ({ isVisible, position, content }) => {
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (!isVisible || !position) return;
    
    // Adjust position to keep tooltip in viewport
    const tooltipWidth = 250;
    const tooltipHeight = 60;
    const padding = 10;
    
    let adjustedX = position.x;
    let adjustedY = position.y;
    
    // Adjust horizontal position
    if (adjustedX + tooltipWidth > window.innerWidth - padding) {
      adjustedX = position.x - tooltipWidth - 10;
    }
    
    // Adjust vertical position
    if (adjustedY + tooltipHeight > window.innerHeight - padding) {
      adjustedY = position.y - tooltipHeight - 10;
    }
    
    setAdjustedPosition({ x: adjustedX, y: adjustedY });
  }, [isVisible, position]);

  if (!isVisible || !adjustedPosition) return null;

  return (
    <div
      className="tooltip"
      style={{
        position: 'fixed',
        left: adjustedPosition.x + 10,
        top: adjustedPosition.y - 30,
        backgroundColor: 'rgba(22, 27, 34, 0.95)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '12px 16px',
        color: 'var(--text-primary)',
        fontSize: '14px',
        fontWeight: '500',
        zIndex: 1000,
        pointerEvents: 'none',
        maxWidth: '250px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(96, 165, 250, 0.2)',
        backdropFilter: 'blur(10px)',
        animation: 'tooltipFadeIn 0.2s ease-out'
      }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        color: 'var(--accent-primary)'
      }}>
        <span>💡</span>
        <span>{content}</span>
      </div>
      
      {/* Tooltip arrow */}
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: '20px',
          width: '0',
          height: '0',
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid rgba(22, 27, 34, 0.95)',
        }}
      />
    </div>
  );
};

export default Tooltip;