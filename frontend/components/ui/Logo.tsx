import Image from 'next/image';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className, height = 165, width = 250 }: LogoProps) {
  return (
    <Image
      priority
      alt="โรงพยาบาลราชพิพัฒน์"
      className={className}
      height={height}
      src="/images/logo.png"
      width={width}
    />
  );
}
