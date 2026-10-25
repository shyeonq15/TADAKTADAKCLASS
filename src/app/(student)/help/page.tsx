import { HELP_SECTIONS } from "@/components/help/HelpContent";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { RetroWindow } from "@/components/ui/RetroWindow";

export default function HelpPage() {
  return (
    <DesktopBackground>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <h1 className="title-lime text-center text-title">도움말</h1>
        <nav className="flex flex-wrap justify-center gap-2">
          {HELP_SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="win-bevel px-3 py-1 font-pixel text-small text-navy-900">
              {s.title}
            </a>
          ))}
        </nav>
        {HELP_SECTIONS.map(({ id, title, Body }) => (
          <section key={id} id={id} className="scroll-mt-16">
            <RetroWindow title={`${title}.txt`}>
              <div className="font-pixel text-body leading-7 text-navy-900">
                <Body />
              </div>
            </RetroWindow>
          </section>
        ))}
      </main>
    </DesktopBackground>
  );
}
