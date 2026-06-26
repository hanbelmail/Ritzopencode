import Link from "next/link";
import { ArrowLeft, ArrowRight, Camera, Dumbbell, HeartPulse, Hotel, Martini, Waves } from "lucide-react";

const serif = "font-['Cormorant_Garamond',_'EB_Garamond',_'Times_New_Roman',_serif]";

const gallerySections = [
  {
    id: "suite",
    title: "Suite",
    kicker: "Private residence",
    description: "Ocean-view interiors, relaxed living space, and warm residential details for a polished Waikiki stay.",
    icon: Hotel,
    images: [
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Suite/b11591_e3c1ea9727e848f99f55cc1c89e77407~mv2.jpg",
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Suite/b11591_71118ddccdda44439592c8aefcf1d62f~mv2.jpg",
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Suite/b11591_738f0509b26443b4a477d00bcd03df01~mv2.jpg",
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Suite/b11591_7d17baaf5bb44f15bf24584a918fb6a6~mv2.jpg",
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Suite/b11591_06476cf5fe8247b6b322285264d1df2b~mv2.jpg",
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Suite/b11591_a81e068bc8fb448d8c66e4f08b0ab202~mv2.jpg",
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Suite/b11591_ae97dac742844e0c9b7ad3aa87815137~mv2.jpg",
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Suite/b11591_ec70edaed778463ba66fb29b18fe915f~mv2.jpg",
    ],
  },
  {
    id: "spa",
    title: "Spa",
    kicker: "Recovery rituals",
    description: "Quiet treatment spaces and resort-level wellness moments designed for slowing down between beach days.",
    icon: HeartPulse,
    images: [
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Spa/b11591_41cb95a57ff64654852a117bb06db936~mv2.jpeg",
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Spa/b11591_4a266469d5f7434b917a63ffc145676c~mv2.jpeg",
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Spa/b11591_77a0f4963dc040ee8c9ac1a773281368~mv2.jpeg",
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Spa/b11591_7dd3a87883b24d0aac9d2c4cdc23793d~mv2.jpeg",
    ],
  },
  {
    id: "recreation-fitness",
    title: "Recreation and Fitness",
    kicker: "Pools, movement, resort days",
    description: "Spaces for morning workouts, poolside afternoons, and easy resort downtime above Waikiki.",
    icon: Dumbbell,
    images: [
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Recreation%20and%20Fitness/b11591_0875523b04b243228bc33c32b8730bf9~mv2.jpeg",
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Recreation%20and%20Fitness/b11591_a613420ae1ee4552a033c9f03fb8f0bf~mv2.jpeg",
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Recreation%20and%20Fitness/b11591_a8e2414808c241408f054ff4392190bb~mv2.jpeg",
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Recreation%20and%20Fitness/b11591_eb66511c4b434fe38d83e8b5f410ec04~mv2.jpeg",
    ],
  },
  {
    id: "dining",
    title: "Dining",
    kicker: "On-property flavor",
    description: "Restaurant, bar, and lounge scenes for a stay that feels complete without leaving the property.",
    icon: Martini,
    images: [
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Dining/b11591_36c642cc4f4b4f4883cc27f564afc715~mv2.jpeg",
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Dining/b11591_551aaaac74a346429ad175d84f3d8f62~mv2.jpeg",
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Dining/b11591_615379f34f154a559848f84a9a3c8b5b~mv2.jpeg",
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Dining/b11591_327877f7eb5145398360b72f493f46e4~mv2.jpeg",
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Dining/b11591_87df8bded05d4701845f7527f36ead03~mv2.jpeg",
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Dining/b11591_ac8553d6f44a4846957938bdaf78564d~mv2.jpeg",
      "https://pub-46763366adb74701bd1eb4bb75356e6b.r2.dev/waikikisecret/Dining/b11591_eb98c8dc5c6442fabb3454ca2f8aa637~mv2.jpeg",
    ],
  },
];

const totalImages = gallerySections.reduce((count, section) => count + section.images.length, 0);

function GalleryImage({ src, alt, priority = false, className = "" }) {
  return (
    <div className={`group relative overflow-hidden rounded-[22px] bg-[#221c17] ${className}`}>
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        className="h-full min-h-[260px] w-full object-cover transition duration-700 group-hover:scale-[1.035]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-80" />
    </div>
  );
}

export default function GalleryPage() {
  const heroImage = gallerySections[0].images[0];

  return (
    <div className="min-h-screen bg-[#100d0a] text-[#fbf6ee] antialiased">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#100d0a]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#d9cfc2] transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-[#a99c8c] md:flex">
            {gallerySections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="transition hover:text-white">
                {section.title}
              </a>
            ))}
          </nav>
          <Link href="/#quote" className="rounded-full bg-[#d28b67] px-4 py-2 text-sm font-semibold text-[#170f0a] transition hover:bg-[#efad86]">
            Request quote
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 opacity-25">
            <img src={heroImage} alt="Waikiki suite atmosphere" className="h-full w-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#100d0a]/70 via-[#100d0a]/88 to-[#100d0a]" />

          <div className="relative mx-auto grid max-w-[1240px] gap-10 px-4 py-16 sm:px-6 md:grid-cols-[0.88fr_1fr] md:py-24 lg:px-8 lg:py-28">
            <div className="flex flex-col justify-center">
              <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#dfc4ad]">
                <Camera className="h-3.5 w-3.5" /> Photo gallery
              </p>
              <h1 className={`${serif} max-w-3xl text-[3.35rem] font-medium leading-[0.9] tracking-[-0.055em] text-white sm:text-[4.4rem] md:text-[5.8rem]`}>
                See the Ritz-Carlton Waikiki stay before you book.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-[1.75] text-[#d5c9bb] sm:text-lg">
                Browse the suite, spa, fitness, recreation, and dining spaces available around The Ritz-Carlton Residences, Waikiki Beach.
              </p>
              <div className="mt-8 grid max-w-lg grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
                  <p className={`${serif} text-3xl text-white`}>{totalImages}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#a99c8c]">Photos</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
                  <p className={`${serif} text-3xl text-white`}>{gallerySections.length}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#a99c8c]">Sections</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4">
                  <Waves className="mx-auto h-8 w-8 text-[#d28b67]" />
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#a99c8c]">Waikiki</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[0.7fr_1fr] sm:items-end">
              <GalleryImage src={gallerySections[0].images[1]} alt="Suite sitting area at The Ritz-Carlton Residences Waikiki" className="h-[300px] sm:h-[420px]" priority />
              <div className="grid gap-3">
                <GalleryImage src={gallerySections[3].images[0]} alt="Dining space at The Ritz-Carlton Residences Waikiki" className="h-[220px] sm:h-[250px]" priority />
                <GalleryImage src={gallerySections[2].images[0]} alt="Resort recreation space at The Ritz-Carlton Residences Waikiki" className="h-[220px] sm:h-[250px]" priority />
              </div>
            </div>
          </div>
        </section>

        <div className="sticky top-16 z-20 border-y border-white/10 bg-[#100d0a]/90 px-4 py-3 backdrop-blur-xl md:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {gallerySections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="shrink-0 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-xs font-semibold text-[#d9cfc2]">
                {section.title}
              </a>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-[1240px] space-y-16 px-4 py-14 sm:px-6 md:space-y-24 md:py-20 lg:px-8">
          {gallerySections.map((section) => {
            const Icon = section.icon;
            const [featuredImage, ...restImages] = section.images;

            return (
              <section key={section.id} id={section.id} className="scroll-mt-36">
                <div className="mb-7 grid gap-5 md:grid-cols-[0.7fr_1fr] md:items-end">
                  <div>
                    <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d28b67]">
                      <Icon className="h-4 w-4" /> {section.kicker}
                    </p>
                    <h2 className={`${serif} text-4xl font-medium leading-[1] tracking-[-0.04em] text-white sm:text-5xl md:text-6xl`}>
                      {section.title}
                    </h2>
                  </div>
                  <p className="max-w-2xl text-sm leading-[1.75] text-[#c4b8aa] sm:text-base md:justify-self-end">
                    {section.description}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-4 md:auto-rows-[210px]">
                  <GalleryImage
                    src={featuredImage}
                    alt={`${section.title} photo 1 at The Ritz-Carlton Residences Waikiki`}
                    className="md:col-span-2 md:row-span-2"
                  />
                  {restImages.map((image, index) => (
                    <GalleryImage
                      key={image}
                      src={image}
                      alt={`${section.title} photo ${index + 2} at The Ritz-Carlton Residences Waikiki`}
                      className={index === 2 && restImages.length > 4 ? "md:col-span-2" : ""}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <section className="bg-[#f7efe4] px-4 py-16 text-[#17110c] sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto grid max-w-[1240px] gap-8 rounded-[28px] bg-white p-6 shadow-2xl shadow-black/10 md:grid-cols-[1fr_auto] md:items-end md:p-10">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#9d6347]">Ready for dates?</p>
              <h2 className={`${serif} max-w-2xl text-4xl font-medium leading-[1.05] tracking-[-0.04em] md:text-5xl`}>
                Turn the gallery into a private Waikiki quote.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-[1.7] text-[#65594f]">
                Send your preferred arrival, checkout, and guest count. Your ticket will keep pricing and payment details in one place.
              </p>
            </div>
            <Link href="/#quote" className="inline-flex h-11 items-center justify-center rounded-full bg-[#17110c] px-6 text-sm font-semibold text-white transition hover:bg-[#3a2a1e]">
              Request a quote <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
