"use client";

import dynamic from "next/dynamic";
import { openApiSpec } from "@/lib/openapi";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#1b1b1b]">
      <SwaggerUI spec={openApiSpec} />
    </div>
  );
}
