import React from "react";
import { MenuOutlined } from "@ant-design/icons";

interface HamburgerButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

const HamburgerButton: React.FC<HamburgerButtonProps> = ({ onClick, isOpen }) => {
  const styles = {
  button: {
    position: "fixed" as const,
    top: "18px",
    left: "18px",
    width: "44px",
    height: "44px",
    borderRadius: "8px",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-bg-alt)",
    color: "var(--color-text)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    zIndex: 9999,
  } satisfies React.CSSProperties,
    icon: {
      fontSize: "18px",
    } satisfies React.CSSProperties,
  };

  return (
    <button
      style={styles.button}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-accent)';
        e.currentTarget.style.color = 'white';
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-bg-alt)';
        e.currentTarget.style.color = 'var(--color-text)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <MenuOutlined style={styles.icon} />
    </button>
  );
};

export default HamburgerButton;