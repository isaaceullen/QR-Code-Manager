"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";

export default function RedirectPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;

    if (slug === "preview") {
      // Just a preview, no redirect
      return;
    }

    const processRedirect = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("qr_codes")
          .select("id, original_url, clicks")
          .eq("slug", slug)
          .single();

        if (fetchError || !data) {
          setError(true);
          setTimeout(() => {
            router.push("/");
          }, 2000);
          return;
        }

        // Delay to show the brand
        setTimeout(async () => {
          // Increment clicks via API to also parse UA
          try {
            await fetch(`/api/scan?slug=${slug}`);
          } catch (e) {
            console.error("Failed to track scan:", e);
          }

          let redirectUrl = data.original_url;
          if (
            !redirectUrl.startsWith("http://") &&
            !redirectUrl.startsWith("https://")
          ) {
            redirectUrl = "https://" + redirectUrl;
          }

          window.location.href = redirectUrl;
        }, 1500);
      } catch (err) {
        console.error("Redirect error:", err);
        setError(true);
        setTimeout(() => {
          router.push("/");
        }, 2000);
      }
    };

    processRedirect();
  }, [slug, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
        <div className="bg-[#111111] p-8 rounded-2xl border border-red-500/20 text-center max-w-sm w-full">
          <p className="text-red-400 font-medium mb-2">Link não encontrado</p>
          <p className="text-white/50 text-sm">Redirecionando para a página inicial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center max-w-sm w-full">
        {/* Responsive Logo */}
        <Image
          src="https://i.imgur.com/864yjao.png"
          alt="Camerite"
          width={224}
          height={60}
          className="w-48 md:w-56 h-auto mb-10"
          referrerPolicy="no-referrer"
        />
        
        {/* Loading Spinner */}
        <div className="w-8 h-8 border-2 border-white/10 border-t-[#7B48EA] rounded-full animate-spin mb-6" />
        
        {/* Message */}
        <p className="text-white/70 text-sm md:text-base text-center font-medium">
          Estamos redirecionando você. Aguarde...
        </p>
      </div>
    </div>
  );
}
