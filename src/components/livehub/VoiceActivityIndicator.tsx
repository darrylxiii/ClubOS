const VoiceActivityIndicator = () => {
  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-1 bg-primary rounded-full animate-pulse"
          style={{
            height: `${Math.random() * 20 + 10}px`,
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
    </div>
  );
};

export default VoiceActivityIndicator;
