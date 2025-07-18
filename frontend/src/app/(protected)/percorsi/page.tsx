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
                  <div className="text-green-400">Sbloccato</div>
                ) : (
                  <div className="text-gray-400">Completa i semi richiesti per sbloccare</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}