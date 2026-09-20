import React from 'react';
import { ArrowLeft, Camera, Sparkles, WandSparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const cardClass =
  'group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-9';

export const AddCraftChoice: React.FC = () => {
  return (
    <main className="min-h-screen bg-[#fcfaf6] px-4 py-10 text-[#163e2e]">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/artisan/dashboard"
          className="inline-flex items-center gap-2 font-bold text-[#0c4b31]"
        >
          <ArrowLeft className="h-4 w-4" /> Artisan Studio
        </Link>

        <header className="mx-auto mb-10 mt-8 max-w-2xl text-center">
          <span className="rounded-full bg-[#e3f4ea] px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-[#0c4b31]">
            Add a new craft
          </span>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-5xl">
            How would you like to list it?
          </h1>
          <p className="mt-4 text-gray-600">
            Choose the guided AI experience or enter your catalog details yourself.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <Link
            to="/artisan/add-product/ai-assisted"
            className={`${cardClass} border-[#d6e9dc] hover:border-[#58a675]`}
          >
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#e6f6eb] transition group-hover:scale-125" />
            <div className="relative mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0c4b31] text-white shadow-md">
              <WandSparkles className="h-8 w-8" />
            </div>
            <span className="relative text-xs font-extrabold uppercase tracking-widest text-[#318153]">
              AI guided
            </span>
            <h2 className="relative mt-2 text-2xl font-extrabold">Smart Catalog Studio</h2>
            <p className="relative mt-3 flex-1 leading-7 text-gray-600">
              Upload a photo and let AI help create the title, description, presentation and fair price suggestion.
            </p>
            <span className="relative mt-7 inline-flex items-center gap-2 font-extrabold text-[#0c4b31]">
              Start with AI <Sparkles className="h-4 w-4" />
            </span>
          </Link>

          <Link
            to="/artisan/professional-studio"
            className={`${cardClass} border-[#eadfc8] hover:border-[#c69542]`}
          >
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#fbf1dc] transition group-hover:scale-125" />
            <div className="relative mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#b47a24] text-white shadow-md">
              <Camera className="h-8 w-8" />
            </div>
            <span className="relative text-xs font-extrabold uppercase tracking-widest text-[#a56819]">
              Manual catalog
            </span>
            <h2 className="relative mt-2 text-2xl font-extrabold">Professional Studio</h2>
            <p className="relative mt-3 flex-1 leading-7 text-gray-600">
              Keep your original product photo and write the complete catalog yourself. AI only suggests a fair price.
            </p>
            <span className="relative mt-7 inline-flex items-center gap-2 font-extrabold text-[#8d5b16]">
              Open Professional Studio <Camera className="h-4 w-4" />
            </span>
          </Link>
        </section>
      </div>
    </main>
  );
};
