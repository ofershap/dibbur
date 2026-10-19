import React from "react";
import logoUrl from "../../assets/dibbur-logo.png";

interface DibburLogoProps {
  size?: number;
  className?: string;
  wordmark?: boolean;
}

const DibburLogo: React.FC<DibburLogoProps> = ({
  size = 96,
  className = "",
  wordmark = false,
}) => (
  <span className={`inline-flex items-center gap-2 ${className}`}>
    <img
      src={logoUrl}
      width={size}
      height={size}
      alt="Dibbur"
      draggable={false}
    />
    {wordmark && (
      // eslint-disable-next-line i18next/no-literal-string
      <span className="text-xl font-bold text-text">Dibbur</span>
    )}
  </span>
);

export default DibburLogo;
