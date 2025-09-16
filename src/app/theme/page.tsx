import React from "react";

const swatches = [
  { name: "Background", token: "bg", hex: "var(--bg)" },
  { name: "Primary (Sage)", token: "primary", hex: "var(--sage-green)" },
  { name: "CTA (Moss)", token: "cta", hex: "var(--moss-green)" },
  { name: "Divider (Beige)", token: "divider", hex: "var(--beige-sand)" },
  { name: "Accent (Dark Olive)", token: "accent", hex: "var(--dark-olive)" },
];

export default function ThemePage() {
  return (
    <main className="max-w-4xl mx-auto p-6 font-poppins">
      <h1 className="text-2xl font-semibold mb-4 text-accent">
        Theme Demo — Calm & Elegant
      </h1>

      <section className="mb-6">
        <h2 className="text-lg font-medium mb-2">Color Palette</h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          {swatches.map((s) => (
            <div
              key={s.token}
              className="p-4 rounded-md shadow-sm"
              style={{ background: `var(--${s.token})` }}
            >
              <div className="text-sm font-medium text-accent mb-2">
                {s.name}
              </div>
              <div className="text-xs text-muted">{s.hex}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Typography</h2>
        <div className="space-y-3">
          <div>
            <div className="text-3xl font-bold text-accent">
              Poppins — Heading 3xl
            </div>
            <div className="text-base text-muted">
              Poppins regular body text — the quick brown fox jumps over the
              lazy dog.
            </div>
          </div>
          <div>
            <button className="px-4 py-2 rounded-md bg-cta text-white">
              Primary CTA
            </button>
            <button
              className="ml-3 px-4 py-2 rounded-md border"
              style={{ borderColor: "var(--beige-sand)" }}
            >
              Secondary
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
