"use client";

import { useState, useEffect, useCallback } from "react";
import { PROVIDER_MODELS, PROVIDER_LABELS } from "@/lib/ai";
import type { AIProvider } from "@/types";
import { Eye, EyeOff, Trash2, Loader2 } from "lucide-react";

interface SavedKey {
  id: string;
  provider: AIProvider;
  modelName: string;
  isActive: boolean;
  keyPreview: string;
}

const PROVIDERS: AIProvider[] = ["CLAUDE", "OPENAI", "GEMINI", "GROK"];

/**
 * /dashboard/settings/keys — BYOK API key vault.
 *
 * Displays a row for each provider with model dropdown, key input,
 * save/delete buttons, and active toggle.
 */
export default function AIKeysPage() {
  const [savedKeys, setSavedKeys] = useState<SavedKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState<AIProvider | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Per-provider form state
  const [formState, setFormState] = useState<
    Record<AIProvider, { apiKey: string; modelName: string; showKey: boolean }>
  >({
    CLAUDE: { apiKey: "", modelName: PROVIDER_MODELS.CLAUDE[0], showKey: false },
    OPENAI: { apiKey: "", modelName: PROVIDER_MODELS.OPENAI[0], showKey: false },
    GEMINI: { apiKey: "", modelName: PROVIDER_MODELS.GEMINI[0], showKey: false },
    GROK: { apiKey: "", modelName: PROVIDER_MODELS.GROK[0], showKey: false },
  });

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-keys");
      const data = await res.json();
      if (data.success) {
        setSavedKeys(data.data);
        // Update model names from saved data
        for (const key of data.data as SavedKey[]) {
          setFormState((prev) => ({
            ...prev,
            [key.provider]: {
              ...prev[key.provider],
              modelName: key.modelName,
            },
          }));
        }
      }
    } catch {
      setError("Failed to load saved keys");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleSave = async (provider: AIProvider) => {
    const form = formState[provider];
    const existingKey = savedKeys.find((k) => k.provider === provider);
    if (!form.apiKey.trim() && !existingKey) {
      setError("API key is required");
      return;
    }

    setError(null);
    setSavingProvider(provider);

    try {
      const isFirstKey = savedKeys.length === 0 && !existingKey;

      const payload: {
        provider: AIProvider;
        modelName: string;
        isActive: boolean;
        apiKey?: string;
      } = {
        provider,
        modelName: form.modelName,
        isActive: isFirstKey || existingKey?.isActive || false,
      };

      if (form.apiKey.trim()) {
        payload.apiKey = form.apiKey.trim();
      }

      const res = await fetch("/api/ai-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Failed to save key");
        return;
      }

      // Clear the API key input and refresh
      setFormState((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], apiKey: "" },
      }));
      await fetchKeys();
    } catch {
      setError("Failed to save key");
    } finally {
      setSavingProvider(null);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    setDeletingId(id);

    try {
      const res = await fetch(`/api/ai-keys/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Failed to delete key");
        return;
      }

      await fetchKeys();
    } catch {
      setError("Failed to delete key");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (id: string) => {
    setError(null);

    try {
      const res = await fetch(`/api/ai-keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "Failed to update key");
        return;
      }

      await fetchKeys();
    } catch {
      setError("Failed to update key");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-text-muted animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-display font-bold mb-2">AI Key Settings</h1>
      <p className="text-text-secondary text-sm mb-8">
        Bring your own API keys. Keys are encrypted before storage and never
        sent back to the browser.
      </p>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-accent-magenta/10 border border-accent-magenta/20">
          <p className="text-accent-magenta text-sm" role="alert">
            {error}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {PROVIDERS.map((provider) => {
          const savedKey = savedKeys.find((k) => k.provider === provider);
          const form = formState[provider];

          return (
            <div key={provider} className="neon-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-display font-semibold text-text-primary">
                    {PROVIDER_LABELS[provider]}
                  </h3>
                  {savedKey?.isActive && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-accent-green/10 text-accent-green border border-accent-green/20">
                      ACTIVE
                    </span>
                  )}
                </div>

                {savedKey && !savedKey.isActive && (
                  <button
                    onClick={() => handleToggleActive(savedKey.id)}
                    className="text-xs font-mono text-text-secondary hover:text-accent-green transition-colors"
                  >
                    Set Active
                  </button>
                )}
              </div>

              {/* Model selector */}
              <div className="mb-3">
                <label className="block text-xs text-text-secondary mb-1 font-mono">
                  Model
                </label>
                <select
                  value={form.modelName}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      [provider]: { ...prev[provider], modelName: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 rounded-md bg-bg-tertiary border border-border text-text-primary text-sm font-mono neon-focus"
                >
                  {PROVIDER_MODELS[provider].map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              {/* API Key input */}
              <div className="mb-3">
                <label className="block text-xs text-text-secondary mb-1 font-mono">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={form.showKey ? "text" : "password"}
                    value={form.apiKey}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        [provider]: { ...prev[provider], apiKey: e.target.value },
                      }))
                    }
                    placeholder={
                      savedKey ? "••••••••  (key saved — enter new to update)" : "sk-..."
                    }
                    className="w-full px-3 py-2 pr-10 rounded-md bg-bg-tertiary border border-border text-text-primary text-sm font-mono neon-focus"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFormState((prev) => ({
                        ...prev,
                        [provider]: {
                          ...prev[provider],
                          showKey: !prev[provider].showKey,
                        },
                      }))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                    aria-label={form.showKey ? "Hide API key" : "Show API key"}
                  >
                    {form.showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave(provider)}
                  disabled={
                    savingProvider === provider ||
                    (!form.apiKey.trim() && (!savedKey || form.modelName === savedKey.modelName))
                  }
                  className="px-4 py-1.5 rounded-md bg-accent-green/10 border border-accent-green/20 text-accent-green text-xs font-mono hover:bg-accent-green/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingProvider === provider ? "Saving..." : "Save Key"}
                </button>

                {savedKey && (
                  <button
                    onClick={() => handleDelete(savedKey.id)}
                    disabled={deletingId === savedKey.id}
                    className="px-4 py-1.5 rounded-md bg-accent-magenta/10 border border-accent-magenta/20 text-accent-magenta text-xs font-mono hover:bg-accent-magenta/20 transition-colors disabled:opacity-50"
                    aria-label={`Delete ${PROVIDER_LABELS[provider]} key`}
                  >
                    {deletingId === savedKey.id ? (
                      "Deleting..."
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
