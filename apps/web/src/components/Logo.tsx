import logoUrl from '../assets/logo.svg'

export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return <img src={logoUrl} width={size} height={size} alt="Mr Chef" className={className} />
}
