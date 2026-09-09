import React from 'react';

export default function AdminPortal() {
  return (
    <div className="w-full h-screen overflow-hidden bg-[#0c0e12]">
      <iframe
        title="MineGuard AI administration portal"
        src="/authentication-admin/mine-frontpage/index.html"
        className="w-full h-full border-0 block"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}