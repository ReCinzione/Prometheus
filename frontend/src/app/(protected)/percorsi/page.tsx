"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { archetipi, Archetipo } from "@/lib/archetipi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PercorsiPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [completedSemi, setCompletedSemi] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<{ [id: number]: { testo: string; titolo: string } }>({});
  const [loading, setLoading] = useState(false);
  const [activeArchetipo, setActiveArchetipo] = useState<Archetipo | null>(null);
  const [aiText, setAiText] = useState<string>("");
  const [aiTitle, setAiTitle] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, [supabase, revealed]);

  useEffect(() => {
    if (!userId) return;
    const fetchCompleted = async () => {
      const { data, error } = await supabase
        .from("capitoli")
        .select("seme_id")
        .eq("user_id", userId);
      if (data) {
        // Salva i semi completati
        setCompletedSemi(data.map((d: any) => parseInt(d.seme_id.replace("sem_", ""))));
        
        // Controlla gli archetipi già salvati
        const savedArchetipi = data
          .filter((d: any) => d.seme_id.startsWith('archetipo_'))
          .map((d: any) => d.seme_id);
        
        // Aggiorna lo stato revealed per gli archetipi già salvati
        const newRevealed = { ...revealed };
        archetipi.forEach(archetipo => {
          const archetipoId = `archetipo_${archetipo.nome.toLowerCase().replace(/\s+/g, '_')}`;
          if (savedArchetipi.includes(archetipoId)) {
            newRevealed[archetipo.id] = { testo: "", titolo: "" }; // Marca come rivelato
          }
        });
        setRevealed(newRevealed);
      }
    };
    fetchCompleted();
  }, [userId]);

  const isUnlocked = (archetipo: Archetipo) =>
    archetipo.semi.every((id) => completedSemi.includes(id)) && !revealed[archetipo.id];

  const handleReveal = async (archetipo: Archetipo) => {
    setActiveArchetipo(archetipo);
    setAiLoading(true);
    setAiError(null);
    // Recupera le frasi finali dai capitoli corrispondenti
    const { data } = await supabase
      .from("capitoli")
      .select("frase_finale, titolo")
      .eq("user_id", userId)
      .in("seme_id", archetipo.semi.map((id) => `sem_${id.toString().padStart(2, "0")}`));
    const frasi = data?.map((d: any) => d.frase_finale).filter(Boolean).join(" ") || "";
    // Chiamata API Gemini
    const response = await fetch("/api/archetipo-gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        frasi,
        descrizione: archetipo.descrizione,
        nome: archetipo.nome,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.titolo || !result.testo) {
      setAiError(result.error || "Errore nella generazione dell'archetipo. Riprova più tardi.");
      setActiveArchetipo(null);
      setAiLoading(false);
      return;
    }
    setAiText(result.testo);
    setAiTitle(result.titolo);
    setAiLoading(false);
  };

  const handleSave = async () => {
    if (!activeArchetipo) return;

    // Controlla se l'archetipo è già stato salvato
    const { data: existingArchetipo } = await supabase
      .from("capitoli")
      .select("id")
      .eq("user_id", userId)
      .eq("seme_id", `archetipo_${activeArchetipo.nome.toLowerCase().replace(/\s+/g, '_')}`)
      .single();

    if (existingArchetipo) {
      setAiError("Questo archetipo è già stato rivelato e salvato.");
      setActiveArchetipo(null);
      setAiText("");
      setAiTitle("");
      return;
    }

    // Salva come nuovo capitolo nell'archivio (tabella capitoli)
    await supabase.from("capitoli").insert({
      user_id: userId,
      seme_id: `archetipo_${activeArchetipo.nome.toLowerCase().replace(/\s+/g, '_')}`,
      titolo: aiTitle,
      icona: activeArchetipo.badge || "",
      testo: aiText,
      eco: [],
      frase_finale: "",
      timestamp: new Date().toISOString(),
    });
    setRevealed((prev) => ({ ...prev, [activeArchetipo.id]: { testo: aiText, titolo: aiTitle } }));
    setActiveArchetipo(null);
    setAiText("");
    setAiTitle("");
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
      <h1 className="text-3xl font-bold text-center mb-6">🌌 Percorsi e Archetipi</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {archetipi.map((archetipo) => {
          const unlocked = isUnlocked(archetipo);
          return (
            <Card key={archetipo.id} className={unlocked ? "border-green-400" : "opacity-50"}>
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-2">{archetipo.badge}</div>
                <h2 className="text-xl font-bold mb-2">{archetipo.nome}</h2>
                <p className="text-gray-600 mb-4">{archetipo.descrizione}</p>
                <div className="mb-2">
                  <div className="text-sm font-semibold text-gray-700 mb-1">Semi richiesti:</div>
                  <ul className="flex flex-wrap gap-2 justify-center mb-1">
                    {archetipo.semi.map((id) => {
                      const done = completedSemi.includes(id);
                      return (
                        <li key={id} className={`px-2 py-1 rounded text-xs font-mono ${done ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                          seme {id}
                        </li>
                      );
                    })}
                  </ul>
                  {/* Messaggio di avanzamento */}
                  <div className="text-xs text-gray-500">
                    {(() => {
                      const done = archetipo.semi.filter(id => completedSemi.includes(id));
                      const missing = archetipo.semi.filter(id => !completedSemi.includes(id));
                      if (done.length === 0) {
                        return `Completa ${missing.map(id => `seme ${id}`).join(', ')} per sbloccare.`;
                      } else if (missing.length === 0) {
                        return `Tutti i semi completati!`;
                      } else {
                        return `Hai completato ${done.map(id => `seme ${id}`).join(', ')}, completa ${missing.map(id => `seme ${id}`).join(', ')} per sbloccare.`;
                      }
                    })()}
                  </div>
                </div>
                {revealed[archetipo.id] ? (
                  <div className="mt-4">
                    <div className="text-green-700 font-semibold mb-2">Archetipo aggiunto al libro!</div>
                    <div className="italic text-gray-700">{revealed[archetipo.id].titolo}</div>
                  </div>
                ) : unlocked ? (
                  <Button variant="default" size="default" className="" onClick={() => handleReveal(archetipo)} disabled={aiLoading}>
                    {aiLoading && activeArchetipo?.id === archetipo.id ? "Generazione..." : "Rivelazione"}
                  </Button>
                ) : (
                  <div className="text-gray-400">Completa i semi richiesti per sbloccare</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {/* Flow di rivelazione e modifica */}
      {activeArchetipo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-2">{activeArchetipo.nome}</h2>
            <p className="mb-4 text-gray-600">{activeArchetipo.descrizione}</p>
            <input
              className="w-full border p-2 mb-2 rounded"
              value={aiTitle}
              onChange={e => setAiTitle(e.target.value)}
              placeholder="Titolo"
            />
            <textarea
              className="w-full border p-2 mb-2 rounded min-h-[120px]"
              value={aiText}
              onChange={e => setAiText(e.target.value)}
              placeholder="Testo generato dall&apos;AI..."
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="default" className="" onClick={() => setActiveArchetipo(null)}>Annulla</Button>
              <Button variant="default" size="default" className="" onClick={handleSave} disabled={!aiText.trim()}>Aggiungi all&apos;Archivio</Button>
            </div>
          </div>
        </div>
      )}
      {aiError && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full text-center">
            <h2 className="text-xl font-bold mb-4 text-red-600">Errore</h2>
            <p className="mb-4 text-gray-700">{aiError}</p>
            <Button variant="default" size="default" className="" onClick={() => setAiError(null)}>Chiudi</Button>
          </div>
        </div>
      )}
    </div>
  );
}