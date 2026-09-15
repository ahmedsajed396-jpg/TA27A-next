"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [darkMode, setDarkMode] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [conversations, setConversations] = useState<any[]>([]);


  useEffect(() => {
    const loadConversations = async () => {
      try {
        const response = await fetch("/api/conversations");

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        setConversations(data.conversations || []);
      } catch (error) {
        console.error("Failed to load conversations:", error);
      }
    };

    loadConversations();
  }, []);
  const handleOpenConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load conversation."
        );
      }

      setConversationId(data.conversation.id);
      setFileName(data.conversation.file_name || data.conversation.title);
      setDocumentText(data.conversation.document_text || "");
      setChatMessages(data.messages || []);

      const lastAssistantMessage = [...(data.messages || [])]
        .reverse()
        .find((message: any) => message.role === "assistant");

      setAnswer(lastAssistantMessage?.content || "");
      setMessage("Conversation loaded.");
    } catch (error) {
      console.error("Failed to load conversation:", error);
      setMessage("Unable to load conversation.");
    }
  };
  const handleUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      return;
    }

    setUploading(true);
    setMessage("");
    setAnswer("");
    setQuestion("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed.");
      }

      setFileName(data.fileName);
      setDocumentText(data.text || "");
      setMessage(`PDF ready - ${data.pages} pages`);
      const conversationResponse = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: data.fileName,
          fileName: data.fileName,
          documentText: data.text || "",
        }),
      });

      const conversationData = await conversationResponse.json();

      if (!conversationResponse.ok) {
        throw new Error(
          conversationData.error || "Failed to save conversation."
        );
      }

      setConversationId(conversationData.conversation.id);
    } catch (error) {
      console.error(error);
      setMessage("Unable to process this PDF.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      handleUpload(file);
    }
  };

  const askQuestion = async () => {
    if (!question.trim() || !documentText) {
      return;
    }

    setAsking(true);
    setAnswer("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: question,
          documentText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI request failed.");
      }

      const assistantText = data.text || "No answer was returned.";

      setAnswer(assistantText);

      if (conversationId) {
        await fetch("/api/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId,
            role: "user",
            content: question,
          }),
        });

        await fetch("/api/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId,
            role: "assistant",
            content: assistantText,
          }),
        });
      }
    } catch (error) {
      console.error(error);
      setAnswer("Unable to get an AI response.");
    } finally {
      setAsking(false);
    }
  };

  const resetDocument = () => {
    setFileName("");
    setDocumentText("");
    setMessage("");
    setQuestion("");
    setAnswer("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const pageClass = darkMode
    ? "min-h-screen bg-slate-950 text-white"
    : "min-h-screen bg-slate-50 text-slate-900";

  return (
    <main className={pageClass}>
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">

        {/* Header */}
        <header className="flex shrink-0 items-center justify-between py-7">
          <Image
            src="/ta27a.png"
            alt="TA27A"
            width={150}
            height={55}
            className="h-auto w-[150px] object-contain"
            priority
          />

          <div className="flex items-center gap-4">

            <div
              className={`flex items-center gap-2 text-sm ${darkMode ? "text-emerald-400" : "text-emerald-600"
                }`}
            >
              <span>?</span>
              <span>Online</span>
            </div>

            <button
              type="button"
              onClick={() => setDarkMode((value) => !value)}
              aria-label="Toggle dark mode"
              className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition ${darkMode
                ? "border-white/10 bg-white/5 hover:bg-white/10"
                : "border-slate-200 bg-white hover:bg-slate-100"
                }`}
            >
              {darkMode ? "??" : "??"}
            </button>

          </div>
        </header>

        {/* Main */}
        <section className="flex flex-1 items-center justify-center py-12">

          {!fileName ? (
            <div className="w-full text-center">

              <h1
                className={`text-4xl font-semibold tracking-tight sm:text-5xl ${darkMode ? "text-white" : "text-slate-900"
                  }`}
              >
                Your documents, understood.
              </h1>

              <p
                className={`mx-auto mt-4 max-w-xl text-base leading-7 ${darkMode ? "text-slate-400" : "text-slate-600"
                  }`}
              >
                Upload a PDF and let TA27A analyze it with AI.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-8 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-7 py-3 font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? "Analyzing PDF..." : "Upload PDF"}
              </button>

              {conversations.length > 0 && (
                <div className="mx-auto mt-14 w-full max-w-2xl text-left">
                  <div className="mb-4 flex items-center justify-between">
                    <h2
                      className={`text-lg font-semibold ${
                        darkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      Recent Conversations
                    </h2>

                    <span
                      className={`text-sm ${
                        darkMode ? "text-slate-500" : "text-slate-500"
                      }`}
                    >
                      {conversations.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {conversations.map((conversation) => (
                      <button
                        type="button"
                        key={conversation.id}
                        onClick={() =>
                          handleOpenConversation(conversation.id)
                        }
                        className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                          darkMode
                            ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            darkMode
                              ? "bg-indigo-500/10 text-indigo-400"
                              : "bg-indigo-50 text-indigo-600"
                          }`}
                        >
                          ??
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm font-medium ${
                              darkMode ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {conversation.file_name || conversation.title}
                          </p>

                          <p
                            className={`mt-1 text-xs ${
                              darkMode ? "text-slate-500" : "text-slate-500"
                            }`}
                          >
                            {new Date(
                              conversation.updated_at
                            ).toLocaleString()}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {message && (
                <p
                  className={`mt-4 text-sm ${darkMode ? "text-slate-400" : "text-slate-600"
                    }`}
                >
                  {message}
                </p>
              )}

            </div>
          ) : (
            <div className="w-full max-w-3xl text-center">
              <div className="mb-6 flex w-full justify-start">
              <button
                type="button"
                onClick={() => {
                  setFileName("");
                  setDocumentText("");
                  setConversationId("");
                  setQuestion("");
                  setAnswer("");
                  setChatMessages([]);
                  setMessage("");
                }}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  darkMode
                    ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                ? Back to Conversations
              </button>
              </div>

              <div className="mb-8">

                <div className="mb-5 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl text-emerald-500">
                    ?
                  </div>
                </div>

                <h1
                  className={`text-3xl font-semibold ${darkMode ? "text-white" : "text-slate-900"
                    }`}
                >
                  Document ready
                </h1>

                <p
                  className={`mt-3 ${darkMode ? "text-slate-400" : "text-slate-600"
                    }`}
                >
                  {fileName}
                </p>

                <p className="mt-2 text-sm text-emerald-500">
                  {message}
                </p>

                <p
                  className={`mt-2 text-xs ${darkMode ? "text-slate-500" : "text-slate-400"
                    }`}
                >
                  {documentText.length.toLocaleString()} characters extracted
                </p>

              </div>

              <div
                className={`rounded-2xl border p-5 text-left shadow-xl ${darkMode
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-slate-200 bg-white"
                  }`}
              >
                <label
                  className={`mb-3 block text-sm font-medium ${darkMode ? "text-slate-300" : "text-slate-700"
                    }`}
                >
                  Ask about this document
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">

                  <input
                    type="text"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        askQuestion();
                      }
                    }}
                    placeholder="Ask a question about your PDF..."
                    disabled={asking}
                    className={`min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm outline-none ${darkMode
                      ? "border-white/10 bg-black/20 text-white placeholder:text-slate-600 focus:border-cyan-400/50"
                      : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-cyan-400"
                      }`}
                  />

                  <button
                    type="button"
                    onClick={askQuestion}
                    disabled={asking || !question.trim()}
                    className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {asking ? "Thinking..." : "Ask"}
                  </button>

                </div>
              </div>

              {answer && (
                <div
                  className={`mt-5 rounded-2xl border p-5 text-left ${darkMode
                    ? "border-white/10 bg-white/[0.03]"
                    : "border-slate-200 bg-white"
                    }`}
                >
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-cyan-500">
                    TA27A
                  </div>

                  <p
                    className={`whitespace-pre-wrap text-sm leading-7 ${darkMode ? "text-slate-300" : "text-slate-700"
                      }`}
                  >
                    {answer}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={resetDocument}
                className={`mt-7 rounded-xl border px-6 py-3 text-sm transition ${darkMode
                  ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
              >
                Choose another PDF
              </button>

            </div>
          )}

        </section>

        {/* Footer */}
        <footer
          className={`shrink-0 py-6 text-center text-xs ${darkMode ? "text-slate-600" : "text-slate-400"
            }`}
        >
          TA27A - Agent to Agent Intelligence
        </footer>

      </div>
    </main>
  );
}












