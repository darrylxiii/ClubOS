import videoBackground from "@/assets/background-video.mp4";

export const VideoBackground = () => {
  return (
    <div className="video-container">
      <video autoPlay loop muted playsInline>
        <source src={videoBackground} type="video/mp4" />
      </video>
      <div className="video-overlay" />
    </div>
  );
};
