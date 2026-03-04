'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const MIME_TYPE_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
]

const pickSupportedMimeType = () => {
  if (typeof window === 'undefined') return ''
  if (typeof MediaRecorder === 'undefined') return ''
  const found = MIME_TYPE_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type))
  return found || ''
}

type RecordedVoicePayload = {
  blob: Blob
  durationSeconds: number
  mimeType: string
}

type UseVoiceRecorderOptions = {
  maxDurationSeconds?: number
  onRecorded: (payload: RecordedVoicePayload) => void
  onError?: (message: string) => void
}

export const useVoiceRecorder = ({
  maxDurationSeconds = 90,
  onRecorded,
  onError,
}: UseVoiceRecorderOptions) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const startedAtRef = useRef<number>(0)
  const chunksRef = useRef<Blob[]>([])

  const [isRecording, setIsRecording] = useState(false)
  const [isProcessingStop, setIsProcessingStop] = useState(false)
  const [durationSeconds, setDurationSeconds] = useState(0)

  const isSupported = useMemo(() => {
    if (typeof window === 'undefined') return false
    return Boolean(
      navigator?.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined',
    )
  }, [])

  const stopTicker = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const cleanupMedia = useCallback(() => {
    stopTicker()
    setIsProcessingStop(false)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
  }, [stopTicker])

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return
    setIsProcessingStop(true)
    try {
      mediaRecorderRef.current.requestData()
    } catch {
      // Ignore requestData failures on browsers that do not support explicit flush.
    }
    mediaRecorderRef.current.stop()
  }, [])

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      onError?.('Voice recording is not supported on this device.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      const supportedMimeType = pickSupportedMimeType()
      const recorder = supportedMimeType
        ? new MediaRecorder(stream, {
            mimeType: supportedMimeType,
            audioBitsPerSecond: 24000,
          })
        : new MediaRecorder(stream)

      chunksRef.current = []
      mediaStreamRef.current = stream
      mediaRecorderRef.current = recorder
      startedAtRef.current = Date.now()
      setDurationSeconds(0)
      setIsRecording(true)
      setIsProcessingStop(false)

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onerror = () => {
        setIsProcessingStop(false)
        setIsRecording(false)
        onError?.('Unable to record voice message right now.')
      }

      recorder.onstop = () => {
        stopTicker()
        const elapsed = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        )
        setIsRecording(false)
        setDurationSeconds(elapsed)
        setIsProcessingStop(false)

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop())
          mediaStreamRef.current = null
        }

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || supportedMimeType || 'audio/webm',
        })
        chunksRef.current = []
        mediaRecorderRef.current = null
        if (!blob.size) return
        onRecorded({
          blob,
          durationSeconds: elapsed,
          mimeType: blob.type || recorder.mimeType || supportedMimeType || 'audio/webm',
        })
      }

      recorder.start(250)
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.max(
          0,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        )
        setDurationSeconds(elapsed)
        if (elapsed >= maxDurationSeconds) {
          stopRecording()
        }
      }, 1000)
    } catch {
      onError?.('Microphone access was denied.')
      cleanupMedia()
      setIsRecording(false)
      setIsProcessingStop(false)
    }
  }, [cleanupMedia, isSupported, maxDurationSeconds, onError, onRecorded, stopRecording, stopTicker])

  const toggleRecording = useCallback(() => {
    if (isProcessingStop) return
    if (isRecording) {
      stopRecording()
      return
    }
    void startRecording()
  }, [isProcessingStop, isRecording, startRecording, stopRecording])

  useEffect(() => {
    return () => {
      stopTicker()
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      mediaStreamRef.current = null
      mediaRecorderRef.current = null
      chunksRef.current = []
    }
  }, [stopTicker])

  return {
    isSupported,
    isRecording,
    isProcessingStop,
    durationSeconds,
    toggleRecording,
    stopRecording,
  }
}
