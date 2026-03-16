import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4">
      <header className="flex items-center gap-3 border-b border-neutral-800 pb-6 pt-16">
        <div className="h-2 w-2 rounded-full bg-emerald-500" />
        <h1 className="font-mono text-sm font-medium tracking-tight text-neutral-100">
          digital-twin
        </h1>
        <span className="text-xs text-neutral-600">v0.1.0</span>
      </header>

      <p className="mt-4 text-sm text-neutral-500">
        Ask me about my experience, projects, or technical skills.
      </p>

      <Chat />
    </main>
  );
}
