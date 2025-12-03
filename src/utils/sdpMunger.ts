/**
 * SDP Munger Utility
 * Manipulates SDP (Session Description Protocol) to optimize audio/video codecs
 * Particularly for enabling FEC (Forward Error Correction) in Opus codec
 */

export interface SDPMungeOptions {
  enableOpusFEC?: boolean;
  enableOpusDTX?: boolean;
  opusMaxAverageBitrate?: number;
  preferredAudioCodec?: 'opus' | 'PCMU' | 'PCMA';
  preferredVideoCodec?: 'VP9' | 'VP8' | 'H264';
}

const DEFAULT_OPTIONS: SDPMungeOptions = {
  enableOpusFEC: true,
  enableOpusDTX: true, // Enable DTX by default for 60-80% bandwidth savings during silence
  opusMaxAverageBitrate: 64000,
  preferredAudioCodec: 'opus',
  preferredVideoCodec: 'VP9'
};

/**
 * Applies FEC and other optimizations to Opus codec in SDP
 * FEC (Forward Error Correction) helps recover lost packets
 */
export function mungeSDPForOpusFEC(sdp: string, options: SDPMungeOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let mungedSDP = sdp;

  // Find the Opus codec line and add FEC parameters
  // Format: a=fmtp:<payload_type> <parameters>
  const opusPayloadMatch = mungedSDP.match(/a=rtpmap:(\d+) opus\/48000\/2/);
  
  if (opusPayloadMatch) {
    const opusPayloadType = opusPayloadMatch[1];
    const fmtpRegex = new RegExp(`a=fmtp:${opusPayloadType}(.*)`, 'g');
    
    // Build parameter string
    const params: string[] = [];
    
    if (opts.enableOpusFEC) {
      params.push('useinbandfec=1');
    }
    
    if (opts.enableOpusDTX) {
      params.push('usedtx=1');
    }
    
    if (opts.opusMaxAverageBitrate) {
      params.push(`maxaveragebitrate=${opts.opusMaxAverageBitrate}`);
    }
    
    // Add stereo and sprop-stereo for better quality
    params.push('stereo=1');
    params.push('sprop-stereo=1');
    
    const existingFmtp = mungedSDP.match(fmtpRegex);
    
    if (existingFmtp) {
      // Modify existing fmtp line
      mungedSDP = mungedSDP.replace(fmtpRegex, (match) => {
        // Extract existing parameters
        const existingParams = match.replace(`a=fmtp:${opusPayloadType}`, '').trim();
        const allParams = existingParams ? `${existingParams};${params.join(';')}` : params.join(';');
        return `a=fmtp:${opusPayloadType} ${allParams}`;
      });
    } else {
      // Add new fmtp line after rtpmap
      const rtpmapLine = `a=rtpmap:${opusPayloadType} opus/48000/2`;
      const newFmtpLine = `a=fmtp:${opusPayloadType} ${params.join(';')}`;
      mungedSDP = mungedSDP.replace(rtpmapLine, `${rtpmapLine}\r\n${newFmtpLine}`);
    }
    
    console.log('[SDP] Applied Opus FEC parameters:', params.join(';'));
  }

  return mungedSDP;
}

/**
 * Reorders codecs to prefer specified codec
 */
export function preferCodec(sdp: string, type: 'audio' | 'video', codecName: string): string {
  const lines = sdp.split('\r\n');
  const mLineIndex = lines.findIndex(line => line.startsWith(`m=${type}`));
  
  if (mLineIndex === -1) return sdp;
  
  const mLine = lines[mLineIndex];
  const parts = mLine.split(' ');
  
  // Find codec payload type
  let codecPayloadType: string | null = null;
  
  for (let i = mLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('m=')) break;
    
    const rtpmapMatch = line.match(/a=rtpmap:(\d+) (\w+)/);
    if (rtpmapMatch && rtpmapMatch[2].toLowerCase() === codecName.toLowerCase()) {
      codecPayloadType = rtpmapMatch[1];
      break;
    }
  }
  
  if (!codecPayloadType) return sdp;
  
  // Reorder payload types to prefer this codec
  const payloadTypes = parts.slice(3);
  const preferredIndex = payloadTypes.indexOf(codecPayloadType);
  
  if (preferredIndex > 0) {
    payloadTypes.splice(preferredIndex, 1);
    payloadTypes.unshift(codecPayloadType);
    parts.splice(3, parts.length - 3, ...payloadTypes);
    lines[mLineIndex] = parts.join(' ');
    
    console.log(`[SDP] Preferred ${codecName} codec (PT: ${codecPayloadType})`);
  }
  
  return lines.join('\r\n');
}

/**
 * Sets maximum bitrate for video
 */
export function setVideoBitrate(sdp: string, maxBitrate: number): string {
  const lines = sdp.split('\r\n');
  const videoMLineIndex = lines.findIndex(line => line.startsWith('m=video'));
  
  if (videoMLineIndex === -1) return sdp;
  
  // Find where to insert b=AS line (after c= line)
  for (let i = videoMLineIndex + 1; i < lines.length; i++) {
    if (lines[i].startsWith('m=')) break;
    if (lines[i].startsWith('c=')) {
      // Insert bandwidth line after connection line
      const bLine = `b=AS:${Math.round(maxBitrate / 1000)}`; // Convert to kbps
      
      // Check if b=AS already exists
      if (lines[i + 1] && lines[i + 1].startsWith('b=AS:')) {
        lines[i + 1] = bLine;
      } else {
        lines.splice(i + 1, 0, bLine);
      }
      
      console.log(`[SDP] Set video max bitrate: ${maxBitrate} bps`);
      break;
    }
  }
  
  return lines.join('\r\n');
}

/**
 * Complete SDP optimization for enterprise-grade calls
 */
export function optimizeSDP(sdp: string, options: SDPMungeOptions = {}): string {
  let optimized = sdp;
  
  // 1. Apply Opus FEC
  optimized = mungeSDPForOpusFEC(optimized, options);
  
  // 2. Prefer Opus for audio
  if (options.preferredAudioCodec) {
    optimized = preferCodec(optimized, 'audio', options.preferredAudioCodec);
  }
  
  // 3. Prefer VP9 for video (better compression)
  if (options.preferredVideoCodec) {
    optimized = preferCodec(optimized, 'video', options.preferredVideoCodec);
  }
  
  return optimized;
}

/**
 * Applies SDP optimization to RTCSessionDescription
 */
export function optimizeSessionDescription(
  description: RTCSessionDescriptionInit,
  options: SDPMungeOptions = {}
): RTCSessionDescriptionInit {
  if (!description.sdp) return description;
  
  return {
    ...description,
    sdp: optimizeSDP(description.sdp, options)
  };
}
