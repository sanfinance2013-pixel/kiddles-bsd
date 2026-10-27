import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { MessageCircle, Sparkles, X } from "lucide-react";
import { useState } from "react";

type AdminAssistantProps = {
  page: string;
  role: string;
};

export function AdminAssistant({ page, role }: AdminAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: `Halo, saya **Kak KIDDLES**. Saya siap membantu ${role} di halaman **${page}**. Silakan tanya dengan bahasa sehari-hari, ya.` },
  ]);
  const chat = trpc.domain.assistant.chat.useMutation({
    onSuccess: (response) => setMessages((current) => [...current, { role: "assistant", content: response.content }]),
    onError: (error) => setMessages((current) => [...current, { role: "assistant", content: `Maaf, saya belum bisa menjawab saat ini. ${error.message || "Silakan coba lagi sebentar."}` }]),
  });

  const sendMessage = (content: string) => {
    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    const apiMessages = nextMessages.filter((message): message is { role: "user" | "assistant"; content: string } => message.role !== "system").slice(-12);
    chat.mutate({ page, messages: apiMessages });
  };

  return <>
    {open && <div className="ai-assistant-popover" role="dialog" aria-label="AI Personal Assistant">
      <div className="ai-assistant-head">
        <div className="ai-assistant-title"><span className="ai-assistant-avatar"><Sparkles size={17} /></span><span><strong>Kak KIDDLES</strong><small>Customer Support · {role}</small></span></div>
        <button className="icon-button" onClick={() => setOpen(false)} aria-label="Tutup AI Personal Assistant"><X size={18} /></button>
      </div>
      <div className="ai-assistant-chat"><AIChatBox messages={messages} onSendMessage={sendMessage} isLoading={chat.isPending} height="min(520px, calc(100dvh - 190px))" placeholder="Tulis pertanyaan Anda..." emptyStateMessage="Ada yang bisa saya bantu?" suggestedPrompts={["Apa yang perlu saya kerjakan hari ini?", "Jelaskan cara memverifikasi pembayaran.", "Bagaimana cara scan absensi murid?", "Bantu saya memahami halaman ini."]} /></div>
      <div className="ai-assistant-note">Kak KIDDLES menjelaskan alur sesuai role Anda. Periksa kembali data sebelum menyimpan.</div>
    </div>}
    <button className={`ai-assistant-fab ${open ? "ai-assistant-fab--open" : ""}`} onClick={() => setOpen((value) => !value)} aria-label={open ? "Tutup AI Personal Assistant" : "Buka AI Personal Assistant"} aria-expanded={open}><span className="ai-assistant-fab-icon">{open ? <X size={21} /> : <MessageCircle size={21} />}</span><span className="ai-assistant-fab-label">Tanya Kak KIDDLES</span></button>
  </>;
}
