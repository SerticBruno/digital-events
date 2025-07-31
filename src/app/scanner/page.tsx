'use client'

import { useState, useEffect, useRef } from 'react'
import { QrCode, CheckCircle, XCircle, AlertCircle, Camera, Clock } from 'lucide-react'
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
  timeAgo?: string
  wasRecentlyUsed?: boolean
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
  const [isValidating, setIsValidating] = useState(false) // Prevent multiple simultaneous validations
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
         // Safari on iOS - use very simple constraints
         constraints = {
           video: {
             facingMode: 'environment'
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
       } catch {
         // If first attempt fails, try with even simpler constraints
         console.log('First attempt failed, trying with minimal constraints...')
         const fallbackConstraints = {
           video: true
         }
         stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints)
       }
      
             if (videoRef.current) {
         videoRef.current.srcObject = stream
                   setIsScanning(true)
          setCameraError('')
          setScanResult(null)
          setLastScannedCode('')
          setIsValidating(false)
         
                   // Simplified video initialization
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded, attempting to play...')
            console.log('Video dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight)
            
            if (videoRef.current) {
              const playVideo = async () => {
                try {
                  // Try to play the video
                  await videoRef.current!.play()
                  console.log('Video started playing successfully')
                  
                  // Start scanning after a short delay
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
                  }, 500)
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

    if (code && code.data !== lastScannedCode && !isValidating) {
      console.log('QR Code detected:', code.data)
      setLastScannedCode(code.data)
      validateQRCode(code.data)
    }

    // Continue scanning
    if (scanningRef.current) {
      requestAnimationFrame(scanLoop)
    }
  }

  const formatTimeAgo = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''} ago`
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    } else {
      const hours = Math.floor(seconds / 3600)
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    }
  }

  const handleManualQRInput = async () => {
    const qrCode = prompt('Enter QR code manually:')
    if (qrCode) {
      await validateQRCode(qrCode)
    }
  }

  const validateQRCode = async (qrCode: string) => {
    if (isValidating) {
      console.log('Validation already in progress, skipping...')
      return
    }
    
    setIsValidating(true)
    console.log('Starting validation for QR code:', qrCode)
    
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
         const wasAlreadyUsed = result.qrCode?.wasAlreadyUsed || false
         const wasRecentlyUsed = result.qrCode?.wasRecentlyUsed || false
         
         // Calculate time since QR code was used
         const usedAt = result.qrCode?.usedAt ? new Date(result.qrCode.usedAt) : new Date()
         const now = new Date()
         const timeDiff = Math.floor((now.getTime() - usedAt.getTime()) / 1000) // seconds
         
         let message
         if (wasRecentlyUsed) {
           message = `Welcome back! ${result.guest.firstName} ${result.guest.lastName} was just checked in.`
         } else if (wasAlreadyUsed) {
           message = `Welcome back! ${result.guest.firstName} ${result.guest.lastName} was already checked in.`
         } else {
           message = `Welcome! ${result.guest.firstName} ${result.guest.lastName} has been checked in successfully.`
         }
        
                 setScanResult({
           success: true,
           message,
           guest: result.guest,
           timeAgo: formatTimeAgo(timeDiff),
           wasRecentlyUsed
         })
        
        // Stop scanning when we get a successful result
        stopScanning()
      } else {
        let errorMessage = result.error || 'Failed to validate QR code'
        let guestInfo = undefined
        let timeAgoInfo = undefined
        
        // Provide more specific error messages with details
        if (response.status === 409 && result.details) {
          // QR code already used - show detailed information
          const details = result.details
          errorMessage = details.message || 'QR code already used'
          
          // Include guest information in the error result
          if (details.guest) {
            guestInfo = details.guest
          }
          
          // Include time information for failed scans
          if (details.timeAgo) {
            timeAgoInfo = details.timeAgo
          }
        } else if (response.status === 404) {
          errorMessage = 'Invalid QR code or wrong event selected'
        }
        
        setScanResult({
          success: false,
          message: errorMessage,
          guest: guestInfo,
          timeAgo: timeAgoInfo
        })
        
        // Auto-clear error result after 5 seconds (longer for detailed errors)
        setTimeout(() => {
          setScanResult(null)
        }, 5000)
      }
          } catch (error) {
        console.error('Failed to validate QR code:', error)
        setScanResult({
          success: false,
          message: 'Failed to validate QR code'
        })
        
        // Auto-clear error result after 3 seconds
        setTimeout(() => {
          setScanResult(null)
        }, 3000)
      } finally {
        setIsValidating(false)
        console.log('Validation completed for QR code:', qrCode)
      }
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
        

                 {/* Camera Preview Box - Always Visible */}
         <div className={componentStyles.card.base}>
           <div className={componentStyles.card.header}>
             <h2 className="text-lg font-medium text-gray-900">Camera Preview</h2>
           </div>
           <div className={componentStyles.card.content}>
             <div className="relative bg-black rounded-lg overflow-hidden">
               {/* Video Element */}
               <video
                 ref={videoRef}
                 autoPlay
                 playsInline
                 muted
                 controls={false}
                 webkit-playsinline="true"
                 className="w-full h-96 object-cover"
                 style={{ transform: 'scaleX(-1)' }} // Mirror the video for better UX
                 onClick={() => {
                   // Safari iOS sometimes needs a tap to start video
                   if (videoRef.current && videoRef.current.paused) {
                     console.log('Video tapped, attempting to play...')
                     videoRef.current.play().catch(console.error)
                   }
                 }}
               />
               
               {/* Hidden Canvas for Processing */}
               <canvas
                 ref={canvasRef}
                 className="hidden"
               />
               
               {/* Initial State - Camera Not Started */}
               {!isScanning && !cameraError && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                   <div className="text-center text-white">
                     <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                     <p className="text-lg font-medium mb-2">Camera Ready</p>
                     <p className="text-sm text-gray-300 mb-4">
                       Click &ldquo;Start Scanning&rdquo; to begin
                     </p>
                     <div className="w-48 h-48 border-2 border-gray-400 rounded-lg mx-auto relative opacity-50">
                       {/* Corner indicators */}
                       <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-gray-400 rounded-tl-lg"></div>
                       <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-gray-400 rounded-tr-lg"></div>
                       <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-gray-400 rounded-bl-lg"></div>
                       <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-gray-400 rounded-br-lg"></div>
                     </div>
                   </div>
                 </div>
               )}
               
               {/* Scanning Frame Overlay - Only when scanning */}
               {isScanning && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <div className="relative">
                     {/* Outer frame */}
                     <div className="w-48 h-48 border-2 border-white rounded-lg relative">
                       {/* Corner indicators */}
                       <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg"></div>
                       <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg"></div>
                       <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg"></div>
                       <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg"></div>
                       
                       {/* Scanning line animation */}
                       <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-400 animate-pulse"></div>
                     </div>
                     
                     {/* Instructions */}
                     <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center">
                       <p className="text-white text-sm font-medium bg-black bg-opacity-50 px-3 py-1 rounded-full">
                         Position QR code in frame
                       </p>
                     </div>
                   </div>
                 </div>
               )}
               
               {/* Status Indicator - Only when scanning */}
               {isScanning && (
                 <div className="absolute top-3 right-3">
                   <div className="flex items-center space-x-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full">
                     <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                     <span className="text-sm">Scanning...</span>
                   </div>
                 </div>
               )}
               
               {/* Safari iOS tap indicator */}
               {isSafari && isIOS && isVideoPaused && isScanning && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                   <div className="bg-white p-4 rounded-lg text-center max-w-xs">
                     <p className="text-sm font-medium text-gray-800 mb-2">Camera Ready</p>
                     <p className="text-xs text-gray-600 mb-3">Tap the screen to start camera</p>
                     <button
                       onClick={() => {
                         if (videoRef.current && videoRef.current.paused) {
                           videoRef.current.play().catch(console.error)
                         }
                       }}
                       className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
                     >
                       Start Camera
                     </button>
                   </div>
                 </div>
               )}
               
               {/* Camera Error Display */}
               {cameraError && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                   <div className="bg-white p-4 rounded-lg text-center max-w-xs">
                     <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                     <p className="text-sm text-gray-800 mb-2">Camera Error</p>
                     <p className="text-xs text-gray-600 mb-3">{cameraError}</p>
                     <button
                       onClick={startScanning}
                       disabled={isRequestingCamera}
                       className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
                     >
                       {isRequestingCamera ? 'Retrying...' : 'Retry'}
                     </button>
                   </div>
                 </div>
               )}
             </div>
             
             {/* Camera Controls */}
             <div className="mt-4 flex justify-center space-x-4">
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
                   Stop Camera
                 </button>
               )}
               
               <button
                 onClick={handleManualQRInput}
                 className={getButtonClasses('secondary')}
               >
                 <QrCode className="w-4 h-4" />
                 Manual Input
               </button>
             </div>
           </div>
         </div>

        

                 {/* Scan Result Modal */}
         {scanResult && (
           <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-in fade-in duration-200">
             <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
               <div className="p-6 text-center">
                 {/* Success Icon */}
                 {scanResult.success ? (
                   <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                     <CheckCircle className="w-8 h-8 text-green-600" />
                   </div>
                 ) : (
                   <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                     <XCircle className="w-8 h-8 text-red-600" />
                   </div>
                 )}
                 
                                   {/* Message */}
                  <h3 className={`text-lg font-semibold mb-2 ${
                    scanResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {scanResult.success ? '✅ Guest Checked In!' : 'Scan Failed'}
                  </h3>
                 
                 <p className="text-gray-600 mb-4">
                   {scanResult.message}
                 </p>
                 
                 {/* Prominent Timer Display for Failed Scans - Show at top level */}
                 {!scanResult.success && scanResult.timeAgo && (
                   <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                     <div className="flex items-center justify-center">
                       <Clock className="w-5 h-5 text-red-600 mr-3" />
                       <div className="text-center">
                         <p className="text-lg font-bold text-red-800">
                           QR Code Used {scanResult.timeAgo} Ago
                         </p>
                         <p className="text-sm text-red-600 mt-1">
                           This code has already been scanned
                         </p>
                       </div>
                     </div>
                   </div>
                 )}
                 
                 {/* Guest Information */}
                 {scanResult.guest && (
                   <div className="bg-gray-50 rounded-lg p-4 mb-4">
                     <div className="flex items-center justify-center mb-2">
                       <h4 className="font-medium text-gray-900">
                         {scanResult.guest.firstName} {scanResult.guest.lastName}
                       </h4>
                       {scanResult.guest.isVip && (
                         <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-semibold">
                           VIP
                         </span>
                       )}
                     </div>
                     {scanResult.guest.company && (
                       <p className="text-sm text-gray-600">{scanResult.guest.company}</p>
                     )}
                     {scanResult.success ? (
                       <>
                         <p className="text-sm text-gray-500 mt-1">
                           Checked in at {new Date().toLocaleTimeString()}
                         </p>
                         {scanResult.timeAgo && (
                           <p className={`text-xs mt-1 ${
                             scanResult.wasRecentlyUsed ? 'text-green-600' : 'text-gray-500'
                           }`}>
                             QR code used {scanResult.timeAgo}
                           </p>
                         )}
                         <p className="text-xs text-gray-400 mt-1">
                           Ready to scan next guest
                         </p>
                       </>
                     ) : (
                       <>
                         <p className="text-sm text-red-600 mt-1">
                           This guest has already been checked in
                         </p>
                         <p className="text-xs text-gray-500 mt-1">
                           Please scan a different QR code
                         </p>
                       </>
                     )}
                   </div>
                 )}
                 
                                   {/* Action Buttons */}
                  <div className="flex gap-3">
                    {scanResult.success ? (
                      <>
                        <button
                          onClick={() => {
                            setScanResult(null)
                            startScanning()
                          }}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                          Scan Next Guest
                        </button>
                        <button
                          onClick={() => {
                            setScanResult(null)
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                          Done
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setScanResult(null)
                          }}
                          className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
                        >
                          Try Again
                        </button>
                        <button
                          onClick={() => {
                            setScanResult(null)
                            handleManualQRInput()
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                          Manual Input
                        </button>
                      </>
                    )}
                  </div>
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
                 <p>After successful check-in, click &ldquo;Scan Next Guest&rdquo; to continue</p>
               </div>
                              <div className="flex items-start">
                 <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                   6
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