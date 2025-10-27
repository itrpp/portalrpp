import { Spinner } from "@heroui/spinner";
import Image from "next/image";

interface LoadingProps {
  message?: string;
  showLogo?: boolean;
}

export default function Loading({
  message = "กำลังดำเนินการ...",
  showLogo = true,
}: LoadingProps) {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 h-full">
      <div className="inline-block max-w-lg text-center justify-center">
        {showLogo && (
          <Image
            priority
            alt="โรงพยาบาลราชพิพัฒน์"
            className="mb-10 mx-auto"
            height={165}
            src="/images/logo.png"
            width={250}
          />
        )}
        <Spinner
          classNames={{
            label: "text-primary font-bold text-2xl mt-5",
          }}
          label={message}
          size="lg"
        />
      </div>
    </section>
  );
}
