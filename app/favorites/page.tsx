"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FavoritesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/tracker");
  }, [router]);
  return null;
}
