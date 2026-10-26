import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="app-bg flex min-h-screen items-center justify-center px-4">
      <div className="panel w-full max-w-md p-8 text-center">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-violet/25 bg-violet/12 text-[#c9c0ff]">
          <Compass className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-white">
          That server isn&apos;t here
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-mist-400">
          The page or server you were looking for doesn&apos;t exist, or your Discord account no longer
          has access to it.
        </p>
        <Link href="/dashboard" className="btn btn-primary mt-5 !py-2.5 !text-[13px]">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to the workspace
        </Link>
      </div>
    </div>
  );
}
