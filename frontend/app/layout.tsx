import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: {
    default: "Veritas RAG · Grounded Retrieval & Evaluation Engine",
    template: "%s · Veritas RAG",
  },
  description: "Enterprise hybrid retrieval with BM25, pgvector HNSW, reciprocal rank fusion, and verifiable citation grounding by Anamika Thakur.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "Veritas RAG · Grounded Retrieval & Evaluation Engine",
    description: "Enterprise hybrid retrieval with BM25, pgvector HNSW, reciprocal rank fusion, and verifiable citation grounding by Anamika Thakur.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
