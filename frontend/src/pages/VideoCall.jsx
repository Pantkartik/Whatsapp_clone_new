import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import useSocket from '../hooks/useSocket'
import useWebRTC from '../hooks/useWebRTC'
import {
  PhoneIcon,
  PhoneXMarkIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline'

export default function VideoCall() {
  const { roomId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [otherUser, setOtherUser] = useState(null)
  const [callType, setCallType] = useState('outgoing') // outgoing, incoming, active
  const [callDuration, setCallDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)

  // WebSocket connection
  const wsUrl = `ws://localhost:8000/ws/webrtc/${roomId}/?token=${localStorage.getItem('access_token')}`
  
  const handleWebRTCSignal = (data) => {
    switch (data.type) {
      case 'call-request':
        setCallType('incoming')
        answerCall(data.offer)
        break
      case 'call-accept':
        handleAnswer(data.answer)
        break
      case 'call-reject':
        navigate('/dashboard')
        break
      case 'call-end':
        endCall()
        navigate('/dashboard')
        break
      case 'ice-candidate':
        handleIceCandidate(data.candidate)
        break
    }
  }

  const { send: sendSignal } = useSocket(wsUrl, handleWebRTCSignal)

  const {
    localStream,
    remoteStream,
    isCallActive,
    isMuted,
    isVideoEnabled,
    callStatus,
    error,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    handleAnswer,
    handleIceCandidate,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo
  } = useWebRTC(sendSignal)

  // Auto-start call when component mounts
  useEffect(() => {
    startCall()
  }, [])

  // Call duration timer
  useEffect(() => {
    let interval
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isCallActive])

  // Hide controls after 3 seconds of inactivity
  useEffect(() => {
    let timeout
    if (showControls && isCallActive) {
      timeout = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
    return () => clearTimeout(timeout)
  }, [showControls, isCallActive])

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleMouseMove = () => {
    setShowControls(true)
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-xl font-semibold mb-4">Call Failed</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen bg-black relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Remote Video */}
      {remoteStream ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="video-remote w-full h-full object-cover"
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-white">
            <div className="w-32 h-32 bg-gray-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-4xl font-bold">
                {otherUser?.username?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <h2 className="text-2xl font-semibold mb-2">
              {otherUser?.username || 'Connecting...'}
            </h2>
            <p className="text-gray-300">
              {callStatus === 'calling' && 'Calling...'}
              {callStatus === 'ringing' && 'Ringing...'}
              {callStatus === 'connected' && 'Connected'}
            </p>
          </div>
        </div>
      )}

      {/* Local Video */}
      {localStream && (
        <div className="video-local">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover rounded-lg"
          />
        </div>
      )}

      {/* Call Info Overlay */}
      {(showControls || !isCallActive) && (
        <div className="absolute top-6 left-6 right-6 z-20">
          <div className="flex justify-between items-start">
            <div className="text-white">
              <h3 className="font-semibold text-lg">
                {otherUser?.username || 'Unknown User'}
              </h3>
              {isCallActive && (
                <p className="text-sm text-gray-300">
                  {formatDuration(callDuration)}
                </p>
              )}
            </div>
            
            <div className="flex space-x-2">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
                <span className="text-white text-sm">
                  {callStatus === 'calling' && '📞 Calling'}
                  {callStatus === 'ringing' && '📳 Ringing'}
                  {callStatus === 'connected' && '🟢 Connected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Call Controls */}
      {(showControls || !isCallActive) && (
        <div className="video-controls">
          <div className="flex items-center space-x-4">
            {/* Mute Button */}
            <button
              onClick={toggleMute}
              className={`video-control-btn ${isMuted ? 'unmute' : 'mute'}`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              <MicrophoneIcon className={`w-6 h-6 ${isMuted ? 'opacity-50' : ''}`} />
            </button>

            {/* Video Toggle */}
            <button
              onClick={toggleVideo}
              className={`video-control-btn ${!isVideoEnabled ? 'unmute' : 'mute'}`}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoEnabled ? (
                <VideoCameraIcon className="w-6 h-6" />
              ) : (
                <VideoCameraSlashIcon className="w-6 h-6" />
              )}
            </button>

            {/* Speaker Button */}
            <button
              className="video-control-btn mute"
              title="Speaker"
            >
              <SpeakerWaveIcon className="w-6 h-6" />
            </button>

            {/* End Call Button */}
            <button
              onClick={() => {
                endCall()
                navigate('/dashboard')
              }}
              className="video-control-btn end-call"
              title="End call"
            >
              <PhoneXMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Incoming Call Modal */}
      {callType === 'incoming' && !isCallActive && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30">
          <div className="text-center text-white">
            <div className="w-32 h-32 bg-gray-600 rounded-full mx-auto mb-6 flex items-center justify-center">
              <span className="text-4xl font-bold">
                {otherUser?.username?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <h2 className="text-2xl font-semibold mb-2">
              {otherUser?.username || 'Unknown User'}
            </h2>
            <p className="text-gray-300 mb-8">Incoming video call...</p>
            
            <div className="flex justify-center space-x-6">
              <button
                onClick={rejectCall}
                className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center"
              >
                <PhoneXMarkIcon className="w-8 h-8 text-white" />
              </button>
              
              <button
                onClick={() => {
                  setCallType('active')
                  // answerCall is already called from WebRTC signal
                }}
                className="w-16 h-16 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center"
              >
                <PhoneIcon className="w-8 h-8 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
