'use client'

import { useState, useEffect, useRef } from 'react'
import { QrCode, CheckCircle, XCircle, AlertCircle, Camera, RotateCcw } from 'lucide-react'
import { getButtonClasses, getInputClasses, componentStyles } from '@/lib/design-system'
import jsQR from 'jsqr'

interface QRScanResult {
  success: boolean
  message: string
  guest?: {
    id: string
    firstName: string
    lastName: string
    email: string
    company?: string
    isVip: boolean
  }
}

export default function QRScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [events, setEvents] = useState<Array<{ id: string; name: string; date: string; location?: string }>>([])
  const [cameraError, setCameraError] = useState<string>('')
  const [lastScannedCode, setLastScannedCode] = useState<string>('')
  const [isRequestingCamera, setIsRequestingCamera] = useState(false)
  const [isSafari, setIsSafari] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isVideoPaused, setIsVideoPaused] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanningRef = useRef<boolean>(false)

  useEffect(() => {
    fetchEvents()
    
    // Detect browser and platform
    if (typeof window !== 'undefined') {
      const safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
      setIsSafari(safari)
      setIsIOS(ios)
      
      // Check if we're on HTTPS (required for camera access)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        setCameraError('Camera access requires HTTPS. Please use a secure connection.')
      }
    }
  }, [])

  useEffect(() => {
    scanningRef.current = isScanning
  }, [isScanning])

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events')
      const data = await response.json()
      setEvents(data)
      if (data.length > 0) {
        setSelectedEvent(data[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    }
  }

  const checkCameraPermissions = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
      return result.state
    } catch {
      console.log('Permission API not supported, will try camera access directly')
      return 'unknown'
    }
  }

  const startScanning = async () => {
    if (!selectedEvent) {
      alert('Please select an event first')
      return
    }

    setIsRequestingCamera(true)
    setCameraError('')

    try {
      // Stop any existing stream first
      if (videoRef.current?.srcObject) {
        const existingStream = videoRef.current.srcObject as MediaStream
        existingStream.getTracks().forEach(track => track.stop())
      }

      // Check camera permissions first
      const permissionState = await checkCameraPermissions()
      console.log('Camera permission state:', permissionState)
      
      let constraints
      if (isSafari && isIOS) {
        // Safari on iOS constraints
        constraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        }
      } else {
        // Other browsers
        constraints = {
          video: {
            facingMode: 'environment',
            width: { min: 320, ideal: 640, max: 1280 },
            height: { min: 240, ideal: 480, max: 720 }
          }
        }
      }

      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch (error) {
        // If first attempt fails on Safari iOS, try with simpler constraints
        if (isSafari && isIOS) {
          console.log('First attempt failed, trying with simpler constraints...')
          const fallbackConstraints = {
            video: {
              facingMode: 'environment'
            }
          }
          stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints)
        } else {
          throw error
        }
      }
      
             if (videoRef.current) {
         videoRef.current.srcObject = stream
         setIsScanning(true)
         setCameraError('')
         setScanResult(null)
         setLastScannedCode('')
         
         // For Safari iOS, try to start video immediately
         if (isSafari && isIOS) {
           console.log('Safari iOS detected, attempting immediate video start...')
           // Small delay to let the stream settle
           setTimeout(() => {
             if (videoRef.current) {
               videoRef.current.play().then(() => {
                 console.log('Safari iOS video started immediately')
                 setTimeout(() => scanLoop(), 500)
               }).catch((error) => {
                 console.log('Safari iOS immediate start failed, will try normal flow:', error)
               })
             }
           }, 100)
         }
        
                 // Wait for video to load then start scanning
         videoRef.current.onloadedmetadata = () => {
           console.log('Video metadata loaded, attempting to play...')
           console.log('Video dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight)
           
           if (videoRef.current) {
             // For Safari on iOS, we need to handle play differently
             const playVideo = async () => {
               try {
                 // Force video to be visible and ready
                 videoRef.current!.style.display = 'block'
                 
                 // Try to play the video
                 await videoRef.current!.play()
                 console.log('Video started playing successfully')
                 
                 // Check if video is actually playing
                 setTimeout(() => {
                   if (videoRef.current && videoRef.current.readyState >= 2) {
                     console.log('Video is ready, starting scan loop')
                     scanLoop()
                   } else {
                     console.log('Video not ready, trying again...')
                     // Try to play again
                     videoRef.current!.play().then(() => {
                       setTimeout(() => scanLoop(), 500)
                     }).catch((error) => {
                       console.error('Second play attempt failed:', error)
                       setCameraError('Video stream not starting. Please try tapping the screen or refreshing.')
                       setIsRequestingCamera(false)
                     })
                   }
                 }, 1000)
               } catch (error) {
                 console.error('Error playing video:', error)
                 setCameraError('Failed to start video stream. Please try again.')
                 setIsRequestingCamera(false)
               }
             }
             
             playVideo()
           }
         }

        // Handle video errors
        videoRef.current.onerror = (error) => {
          console.error('Video error:', error)
          setCameraError('Video stream error. Please try again.')
          setIsRequestingCamera(false)
        }

                 // Additional event listeners for mobile
         videoRef.current.oncanplay = () => {
           console.log('Video can play')
         }

         videoRef.current.onplaying = () => {
           console.log('Video is playing')
           setIsVideoPaused(false)
         }

         videoRef.current.onpause = () => {
           console.log('Video paused')
           setIsVideoPaused(true)
         }

         videoRef.current.onwaiting = () => {
           console.log('Video is waiting')
         }

         // Safari iOS specific handling
         if (isSafari && isIOS) {
           videoRef.current.onloadeddata = () => {
             console.log('Video data loaded on Safari iOS')
           }
           
           videoRef.current.oncanplaythrough = () => {
             console.log('Video can play through on Safari iOS')
           }
         }
      }
    } catch (error) {
      console.error('Camera access error:', error)
      let errorMessage = 'Unable to access camera. '
      
             if (error instanceof DOMException) {
         if (error.name === 'NotAllowedError') {
           errorMessage += 'Please allow camera access in your browser settings and try again.'
         } else if (error.name === 'NotFoundError') {
           errorMessage += 'No camera found on this device.'
         } else if (error.name === 'NotSupportedError') {
           errorMessage += 'Camera not supported on this device.'
         } else if (error.name === 'OverconstrainedError') {
           errorMessage += 'Camera constraints not supported. Please try again.'
         } else {
           errorMessage += error.message
         }
       } else {
         errorMessage += 'Please check permissions and try again.'
       }
       
       // Add Safari iOS specific guidance
       if (isSafari && isIOS) {
         errorMessage += ' On Safari iOS, make sure you\'re using HTTPS and try refreshing the page.'
       }
      
      setCameraError(errorMessage)
    } finally {
      setIsRequestingCamera(false)
    }
  }

  const stopScanning = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setIsScanning(false)
    scanningRef.current = false
  }

  const scanLoop = () => {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context || video.videoWidth === 0) {
      requestAnimationFrame(scanLoop)
      return
    }

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data for QR code detection
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    // Detect QR code using jsQR
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    })

    if (code && code.data !== lastScannedCode) {
      setLastScannedCode(code.data)
      validateQRCode(code.data)
    }

    // Continue scanning
    if (scanningRef.current) {
      requestAnimationFrame(scanLoop)
    }
  }

  const handleManualQRInput = async () => {
    const qrCode = prompt('Enter QR code manually:')
    if (qrCode) {
      await validateQRCode(qrCode)
    }
  }

  const validateQRCode = async (qrCode: string) => {
    try {
      const response = await fetch('/api/qr/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: qrCode,
          eventId: selectedEvent 
        })
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        setScanResult({
          success: true,
          message: `Welcome! ${result.guest.firstName} ${result.guest.lastName} has been checked in successfully.`,
          guest: result.guest
        })
      } else {
        setScanResult({
          success: false,
          message: result.error || 'Failed to validate QR code',
          guest: undefined
        })
      }
      
      // Auto-clear result after 5 seconds
      setTimeout(() => {
        setScanResult(null)
      }, 5000)
    } catch (error) {
      console.error('Failed to validate QR code:', error)
      setScanResult({
        success: false,
        message: 'Failed to validate QR code'
      })
    }
  }

  const resetScanner = () => {
    stopScanning()
    setScanResult(null)
    setCameraError('')
    setLastScannedCode('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">QR Code Scanner</h1>
              <p className="text-gray-600">Scan guest QR codes for event check-in</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className={getInputClasses()}
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Scanner Controls */}
        <div className={componentStyles.card.base}>
          <div className={componentStyles.card.header}>
            <h2 className="text-lg font-medium text-gray-900">Scanner Controls</h2>
          </div>
          <div className={componentStyles.card.content}>
            <div className="flex flex-wrap gap-4">
              {!isScanning ? (
                <button
                  onClick={startScanning}
                  disabled={isRequestingCamera}
                  className={getButtonClasses('primary')}
                >
                  {isRequestingCamera ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Requesting Camera...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      Start Scanning
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={stopScanning}
                  className={getButtonClasses('danger')}
                >
                  <XCircle className="w-4 h-4" />
                  Stop Scanning
                </button>
              )}
              
              <button
                onClick={handleManualQRInput}
                className={getButtonClasses('secondary')}
              >
                <QrCode className="w-4 h-4" />
                Manual Input
              </button>
              
              <button
                onClick={resetScanner}
                className={getButtonClasses('outline')}
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Camera View */}
        {isScanning && (
          <div className={componentStyles.card.base}>
            <div className={componentStyles.card.header}>
              <h2 className="text-lg font-medium text-gray-900">Camera View</h2>
            </div>
            <div className={componentStyles.card.content}>
              <div className="relative">
                                 <video
                   ref={videoRef}
                   autoPlay
                   playsInline
                   muted
                   controls={false}
                   webkit-playsinline="true"
                   className="w-full max-w-2xl mx-auto rounded-lg border border-gray-300"
                   style={{ transform: 'scaleX(-1)' }} // Mirror the video for better UX
                   onClick={() => {
                     // Safari iOS sometimes needs a tap to start video
                     if (videoRef.current && videoRef.current.paused) {
                       console.log('Video tapped, attempting to play...')
                       videoRef.current.play().catch(console.error)
                     }
                   }}
                 />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-blue-500 rounded-lg p-8">
                    <div className="w-64 h-64 border-2 border-blue-500 rounded-lg relative">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
                    </div>
                  </div>
                </div>
                                 {/* Scanning indicator */}
                 <div className="absolute top-4 right-4">
                   <div className="flex items-center space-x-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full">
                     <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                     <span className="text-sm">Scanning...</span>
                   </div>
                 </div>
                 
                 {/* Safari iOS tap indicator */}
                 {isSafari && isIOS && isVideoPaused && (
                   <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                     <div className="bg-white p-4 rounded-lg text-center">
                       <p className="text-sm font-medium text-gray-800 mb-2">Camera Ready</p>
                       <p className="text-xs text-gray-600">Tap the screen to start camera</p>
                     </div>
                   </div>
                 )}
              </div>
            </div>
          </div>
        )}

        {/* Camera Error */}
        {cameraError && (
          <div className={componentStyles.card.base}>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-800 mb-2">{cameraError}</p>
                    <div className="text-xs text-red-600">
                      <p>• Make sure you&apos;re using HTTPS (required for camera access)</p>
                      <p>• Allow camera permissions when prompted</p>
                      <p>• Try refreshing the page if permissions are stuck</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={startScanning}
                  disabled={isRequestingCamera}
                  className="ml-4 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {isRequestingCamera ? 'Retrying...' : 'Retry'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scan Result */}
        {scanResult && (
          <div className={componentStyles.card.base}>
            <div className={componentStyles.card.header}>
              <h2 className="text-lg font-medium text-gray-900">Scan Result</h2>
            </div>
            <div className={componentStyles.card.content}>
              <div className={`p-4 rounded-lg ${
                scanResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center">
                  {scanResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mr-2" />
                  )}
                  <p className={`text-sm font-medium ${
                    scanResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {scanResult.message}
                  </p>
                </div>
                
                {scanResult.guest && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                    <h3 className="font-medium text-gray-900 mb-2">Guest Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <span className="ml-2 text-gray-900">
                          {scanResult.guest.firstName} {scanResult.guest.lastName}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <span className="ml-2 text-gray-900">{scanResult.guest.email}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Company:</span>
                        <span className="ml-2 text-gray-900">{scanResult.guest.company || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Type:</span>
                        <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                          scanResult.guest.isVip 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {scanResult.guest.isVip ? 'VIP' : 'Regular'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className={componentStyles.card.base}>
          <div className={componentStyles.card.header}>
            <h2 className="text-lg font-medium text-gray-900">Instructions</h2>
          </div>
          <div className={componentStyles.card.content}>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                  1
                </div>
                <p>Select the event you&apos;re scanning for from the dropdown above</p>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                  2
                </div>
                <p>Click &ldquo;Start Scanning&rdquo; to activate the camera</p>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                  3
                </div>
                <p>Point the camera at the guest&apos;s QR code within the blue frame</p>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                  4
                </div>
                <p>The system will automatically detect and validate the QR code</p>
              </div>
              <div className="flex items-start">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                  5
                </div>
                <p>If camera doesn&apos;t work, use &ldquo;Manual Input&rdquo; to enter the QR code manually</p>
              </div>
                             <div className="flex items-start">
                 <div className="w-6 h-6 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                   !
                 </div>
                 <p><strong>Mobile users:</strong> Make sure to allow camera permissions when prompted. If it doesn&apos;t work, try refreshing the page.</p>
               </div>
               <div className="flex items-start">
                 <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                   📱
                 </div>
                 <p><strong>Safari on iPhone:</strong> Make sure you&apos;re using HTTPS. If camera doesn&apos;t start, try tapping the screen or refreshing the page.</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 