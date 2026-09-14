/**
 * Logo theo mock: túi xách trắng + trái tim hồng trên nền tròn mint gradient.
 * © _hngnguynn_
 */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span
      className="inline-flex flex-none items-center justify-center rounded-[36%] shadow-card"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(140deg, #3ADFCF 0%, #0FB5AD 100%)",
      }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none" aria-hidden>
        {/* quai túi */}
        <path
          d="M8.6 8.2V7a3.4 3.4 0 0 1 6.8 0v1.2"
          stroke="#fff"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        {/* thân túi */}
        <path
          d="M5.6 8.2h12.8c.7 0 1.2.6 1.1 1.3l-.9 8.3a2.2 2.2 0 0 1-2.2 1.9H7.6a2.2 2.2 0 0 1-2.2-1.9l-.9-8.3c-.1-.7.4-1.3 1.1-1.3Z"
          fill="#fff"
        />
        {/* trái tim hồng */}
        <path
          d="M12 16.6c-1.9-1.2-2.8-2.15-2.8-3.3 0-.96.72-1.7 1.63-1.7.53 0 .93.26 1.17.66.24-.4.64-.66 1.17-.66.91 0 1.63.74 1.63 1.7 0 1.15-.9 2.1-2.8 3.3Z"
          fill="#FB72A8"
        />
      </svg>
    </span>
  );
}
