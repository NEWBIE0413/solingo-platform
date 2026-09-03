import Image from "next/image";

import { Button } from "@/components/ui/button";

export const Footer = () => {
  return (
    <div className="hidden h-20 w-full border-t-2 border-slate-200 p-2 lg:block">
      <div className="mx-auto flex h-full max-w-screen-lg items-center justify-evenly">
        <Button size="lg" variant="ghost" className="w-full cursor-default">
          <Image
            src="/hr.svg"
            alt="Croatian"
            height={32}
            width={40}
            className="mr-4 rounded-md"
          />
          크로아티아어
        </Button>

        <Button size="lg" variant="ghost" className="w-full cursor-default">
          <Image
            src="/es.svg"
            alt="Spanish"
            height={32}
            width={40}
            className="mr-4 rounded-md"
          />
          스페인어
        </Button>

        <Button size="lg" variant="ghost" className="w-full cursor-default">
          <Image
            src="/fr.svg"
            alt="French"
            height={32}
            width={40}
            className="mr-4 rounded-md"
          />
          프랑스어
        </Button>

        <Button size="lg" variant="ghost" className="w-full cursor-default">
          <Image
            src="/it.svg"
            alt="Italian"
            height={32}
            width={40}
            className="mr-4 rounded-md"
          />
          이탈리아어
        </Button>

        <Button size="lg" variant="ghost" className="w-full cursor-default">
          <Image
            src="/jp.svg"
            alt="Japanese"
            height={32}
            width={40}
            className="mr-4 rounded-md"
          />
          일본어
        </Button>
      </div>
    </div>
  );
};
