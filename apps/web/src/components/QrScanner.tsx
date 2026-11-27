import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n'

interface DetectedBarcode {
  rawValue: string
}
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>
}
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike

function detectorCtor(): BarcodeDetectorCtor | null {
  return (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector ?? null
}

export const canScanQr = () => detectorCtor() !== null && !!navigator.mediaDevices?.getUserMedia

/** Lecture d'un QR code avec la caméra arrière (API BarcodeDetector du navigateur). */
export function QrScanner({ onResult, onCancel }: { onResult: (text: string) => void; onCancel: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const t = useT()
  const [error, setError] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let stopped = false
    const Ctor = detectorCtor()!
    const detector = new Ctor({ formats: ['qr_code'] })

    async function tick() {
      if (stopped || !video.current) return
      try {
        const found = await detector.detect(video.current)
        if (found[0]?.rawValue) {
          onResult(found[0].rawValue)
          return
        }
      } catch {
        /* image pas encore prête */
      }
      timer = setTimeout(() => void tick(), 250)
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(async (s) => {
        stream = s
        if (stopped || !video.current) return
        video.current.srcObject = s
        await video.current.play()
        void tick()
      })
      .catch(() => setError(true))

    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [onResult])

  return (
    <div className="stack">
      {error ? <p className="notice error">{t.importPage.noCamera}</p> : <video ref={video} className="scanner" muted playsInline />}
      <button type="button" className="btn" onClick={onCancel}>
        {t.importPage.stopScan}
      </button>
    </div>
  )
}
