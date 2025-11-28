interface VoiceActivityIndicatorProps {
  isActive: boolean;
}

const VoiceActivityIndicator = ({ isActive }: VoiceActivityIndicatorProps) => {
  if (!isActive) return null;
  
  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full backdrop-blur-sm">
      <div className="flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-1 bg-green-500 rounded-full animate-pulse"
            style={{
              height: `${Math.random() * 16 + 8}px`,
              animationDelay: `${i * 0.1}s`,
              animationDuration: '0.8s'
            }}
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-green-500 ml-2">
        You're speaking
      </span>
    </div>
  );
};

export default VoiceActivityIndicator;
