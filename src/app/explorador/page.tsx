"use client";

import dynamic from "next/dynamic";

const ExploradorContent = dynamic(() => import("./ExploradorContent"), {
  ssr: false,
  loading: () => (
    <div className="w-screen h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Cargando explorador de capas...</p>
      </div>
    </div>
  ),
});

export default function ExploradorPage() {
  return <ExploradorContent />;
}
