import { useRef, useState, useCallback, useEffect } from 'react'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

export default function useWebRTC(socketSend, onRemoteStream) {
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [isCallActive, setIsCallActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [callStatus, setCallStatus] = useState('idle') // idle, calling, ringing, connected, ended
  const [error, setError] = useState(null)
  
  const peerConnection = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)

  const initializePeerConnection = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close()
    }

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS
    })

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketSend({
          type: 'ice-candidate',
          candidate: event.candidate
        })
      }
    }

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0]
      setRemoteStream(remoteStream)
      onRemoteStream && onRemoteStream(remoteStream)
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream
      }
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      console.log('Connection state:', state)
      
      if (state === 'connected') {
        setCallStatus('connected')
        setIsCallActive(true)
      } else if (state === 'disconnected' || state === 'failed') {
        setCallStatus('ended')
        setIsCallActive(false)
      }
    }

    peerConnection.current = pc
    return pc
  }, [socketSend, onRemoteStream])

  const getLocalMedia = useCallback(async (video = true, audio = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video,
        audio: audio
      })

      setLocalStream(stream)
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      return stream
    } catch (error) {
      console.error('Error accessing media devices:', error)
      setError('Failed to access camera/microphone')
      throw error
    }
  }, [])

  const startCall = useCallback(async () => {
    try {
      setCallStatus('calling')
      setError(null)

      const stream = await getLocalMedia()
      const pc = initializePeerConnection()
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream)
      })

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      socketSend({
        type: 'call-request',
        offer: offer
      })

    } catch (error) {
      console.error('Error starting call:', error)
      setError('Failed to start call')
      setCallStatus('ended')
    }
  }, [initializePeerConnection, socketSend, getLocalMedia])

  const answerCall = useCallback(async (offer) => {
    try {
      setCallStatus('ringing')
      setError(null)

      const stream = await getLocalMedia()
      const pc = initializePeerConnection()
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream)
      })

      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      socketSend({
        type: 'call-accept',
        answer: answer
      })

      setIsCallActive(true)
    } catch (error) {
      console.error('Error answering call:', error)
      setError('Failed to answer call')
      setCallStatus('ended')
    }
  }, [initializePeerConnection, socketSend, getLocalMedia])

  const handleAnswer = useCallback(async (answer) => {
    try {
      await peerConnection.current?.setRemoteDescription(
        new RTCSessionDescription(answer)
      )
      setIsCallActive(true)
      setCallStatus('connected')
    } catch (error) {
      console.error('Error handling answer:', error)
      setError('Failed to establish connection')
    }
  }, [])

  const handleIceCandidate = useCallback(async (candidate) => {
    try {
      await peerConnection.current?.addIceCandidate(
        new RTCIceCandidate(candidate)
      )
    } catch (error) {
      console.error('Error handling ICE candidate:', error)
    }
  }, [])

  const rejectCall = useCallback(() => {
    socketSend({
      type: 'call-reject'
    })
    setCallStatus('ended')
  }, [socketSend])

  const endCall = useCallback(() => {
    // Stop local media tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
      setLocalStream(null)
    }

    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close()
      peerConnection.current = null
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }

    setRemoteStream(null)
    setIsCallActive(false)
    setCallStatus('ended')
    
    socketSend({
      type: 'call-end'
    })
  }, [localStream, socketSend])

  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }, [localStream])

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
      }
    }
  }, [localStream])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop())
      }
      if (peerConnection.current) {
        peerConnection.current.close()
      }
    }
  }, [localStream])

  return {
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
  }
}
