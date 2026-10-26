import { inArray, sql } from "drizzle-orm";

import type { ProductSpecs } from "../product-specs";
import type { Database } from "./connect";
import {
  categories,
  deliveryZones,
  productImages,
  products,
  type Emirate,
  type NewProduct,
} from "./schema";

// Starting data, applied by `pnpm db:seed`. Running it again changes nothing that is
// already there. Categories and delivery zones are the shop's real starting set; the
// products are samples for development (is_sample), deleted before launch (M9).

export const seedCategories = [
  { slug: "electric-guitars", nameEn: "Electric guitars", nameAr: "جيتارات كهربائية", sort: 10 },
  { slug: "pedals", nameEn: "Pedals", nameAr: "دواسات المؤثرات", sort: 20 },
  { slug: "amps", nameEn: "Amps", nameAr: "مضخمات الصوت", sort: 30 },
  {
    slug: "parts-accessories",
    nameEn: "Parts and accessories",
    nameAr: "قطع غيار وإكسسوارات",
    sort: 40,
  },
] as const;

type CategorySlug = (typeof seedCategories)[number]["slug"];

// Fees are placeholders for the owner to set in admin (M7).
export const seedDeliveryZones: {
  nameEn: string;
  nameAr: string;
  emirates: Emirate[];
  feeFils: number;
  sort: number;
}[] = [
  {
    nameEn: "Ras Al Khaimah",
    nameAr: "رأس الخيمة",
    emirates: ["ras_al_khaimah"],
    feeFils: 2_000,
    sort: 10,
  },
  {
    nameEn: "Dubai and the Northern Emirates",
    nameAr: "دبي والإمارات الشمالية",
    emirates: ["dubai", "sharjah", "ajman", "umm_al_quwain", "fujairah"],
    feeFils: 3_500,
    sort: 20,
  },
  { nameEn: "Abu Dhabi", nameAr: "أبوظبي", emirates: ["abu_dhabi"], feeFils: 4_500, sort: 30 },
];

/**
 * Free-licence Unsplash photos for the sample products, stored in public/images/samples
 * as `<name>-<width>.webp` at the stock photo widths, cropped to 4:5. Each is credited
 * in docs/IMAGE_CREDITS.md (checked by seed.test.ts).
 */
export const samplePhotos = {
  "strat-sunburst": {
    unsplashId: "nNhMKr0ejIw",
    author: "Maksym Pozniak-Haraburda",
    username: "maksymp",
  },
  "les-paul-sunburst": {
    unsplashId: "zyBd6u5O5gk",
    author: "Chris Hardy",
    username: "chrishardyphotography",
  },
  "les-paul-cherry": {
    unsplashId: "OzSAqN4MjNE",
    author: "Guilherme Paiva",
    username: "guilherme_filipak1607",
  },
  "tele-tidepool": { unsplashId: "ZIGI-0Br8Bg", author: "Krzysztof Hepner", username: "nsx_2000" },
  "sg-ebony-1": { unsplashId: "ZAEEO9OcZ7o", author: "Amirhossein Hasani", username: "ah1" },
  "sg-ebony-2": { unsplashId: "ct20-KBHHk4", author: "Amirhossein Hasani", username: "ah1" },
  "distortion-pedal": {
    unsplashId: "dxGObwcMJ0A",
    author: "Oscar Ivan Esquivel Arteaga",
    username: "oscaresquivel",
  },
  "micro-amp": {
    unsplashId: "9-79QZ3eBZM",
    author: "Morris Pinedo Michelsen",
    username: "mpinedomichelsen",
  },
  picks: { unsplashId: "ZMMLYu-T_v4", author: "Rombo", username: "rombo_guitar_picks" },
  cable: { unsplashId: "GmfLeibJlS0", author: "Brett Jordan", username: "brett_jordan" },
} as const;

export type SamplePhotoName = keyof typeof samplePhotos;

/** Sample photos are cropped to 4:5 and stored this wide at most. */
export const SAMPLE_PHOTO_SIZE = { width: 1920, height: 2400 } as const;

type SampleImage = { photo: SamplePhotoName; altEn: string; altAr: string };

type SampleProduct = Omit<NewProduct, "categoryId" | "isSample" | "publishedAt" | "soldAt"> & {
  category: CategorySlug;
  specs?: ProductSpecs;
  /** Days before the seed ran that it was listed; omitted for drafts. */
  listedDaysAgo?: number;
  soldDaysAgo?: number;
  images: SampleImage[];
};

const AED = (dirhams: number) => dirhams * 100;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Chosen to exercise every state the catalog shows: available guitars (one with a price
 * drop, one with two photos), a guitar on hold, a sold guitar, used and new gear, gear
 * with several units, sold-out gear, an item with no Arabic text, and a draft.
 */
export const sampleProducts: SampleProduct[] = [
  {
    kind: "guitar",
    category: "electric-guitars",
    slug: "fender-stratocaster-sunburst",
    sku: "SAMPLE-G-001",
    brand: "Fender",
    model: "Stratocaster",
    year: 2016,
    titleEn: "Fender Stratocaster, sunburst",
    titleAr: "فندر ستراتوكاستر، صن برست",
    descriptionEn:
      "A well-loved Strat with a warm sunburst finish. Light play wear on the back of the neck and a small ding on the lower horn, shown in the photos.",
    descriptionAr:
      "ستراتوكاستر بحالة جيدة جداً بلون صن برست دافئ. آثار استخدام خفيفة خلف الزند وخدش صغير على القرن السفلي، موضّحة في الصور.",
    techNotesEn:
      "New 10–46 strings, full setup, frets polished. Relief 0.25 mm, action 1.8 mm at the 12th fret.",
    techNotesAr:
      "أوتار جديدة 10–46، ضبط كامل وتلميع الفريتات. انحناء الزند 0.25 مم وارتفاع الأوتار 1.8 مم عند الفريت 12.",
    condition: "very_good",
    priceFils: AED(3_450),
    compareAtFils: AED(3_800),
    costFils: AED(2_600),
    quantity: 1,
    status: "available",
    specs: {
      bodyStyle: "s_style",
      body: "Alder",
      finish: "Two-colour sunburst",
      neck: "Maple, modern C",
      fretboard: "Rosewood",
      frets: 22,
      scale: '25.5" (648 mm)',
      pickupLayout: "SSS",
      weightKg: 3.6,
      case: "Gig bag",
    },
    listedDaysAgo: 2,
    images: [
      {
        photo: "strat-sunburst",
        altEn: "Sunburst Stratocaster with a white pickguard, leaning on a sofa",
        altAr: "جيتار ستراتوكاستر بلون صن برست وواقي أبيض، مسنود على أريكة",
      },
    ],
  },
  {
    kind: "guitar",
    category: "electric-guitars",
    slug: "gibson-les-paul-standard-tobacco-burst",
    sku: "SAMPLE-G-002",
    brand: "Gibson",
    model: "Les Paul Standard",
    year: 2012,
    titleEn: "Gibson Les Paul Standard, tobacco burst",
    titleAr: "جيبسون لس بول ستاندرد، توباكو برست",
    descriptionEn:
      "Carved maple top over a mahogany body, with the original hard case. Clean frets and no repairs.",
    descriptionAr:
      "سطح من خشب القيقب المنحوت فوق جسم من الماهوغني، مع الحقيبة الصلبة الأصلية. الفريتات نظيفة ولم يُصلَّح من قبل.",
    condition: "excellent",
    priceFils: AED(9_800),
    costFils: AED(8_000),
    quantity: 1,
    status: "available",
    specs: {
      bodyStyle: "single_cut",
      body: "Mahogany, carved maple top",
      finish: "Tobacco burst",
      neck: "Mahogany, slim taper",
      fretboard: "Rosewood",
      frets: 22,
      scale: '24.75" (628 mm)',
      pickupLayout: "HH",
      pickups: "Burstbucker Pro",
      weightKg: 4.3,
      serial: "SAMPLE-SERIAL-002",
      case: "Original hard case",
    },
    listedDaysAgo: 6,
    images: [
      {
        photo: "les-paul-sunburst",
        altEn: "Close-up of a tobacco burst Les Paul body with two humbuckers",
        altAr: "صورة قريبة لجسم لس بول بلون توباكو برست مع لاقطين همباكر",
      },
    ],
  },
  {
    kind: "guitar",
    category: "electric-guitars",
    slug: "epiphone-les-paul-standard-cherry",
    sku: "SAMPLE-G-003",
    brand: "Epiphone",
    model: "Les Paul Standard Plus Top",
    year: 2019,
    titleEn: "Epiphone Les Paul Standard, cherry flame",
    titleAr: "إبيفون لس بول ستاندرد، كرزي مموّج",
    descriptionEn: "Flame maple veneer in a deep cherry finish. Sold.",
    descriptionAr: "قشرة قيقب مموّجة بلون كرزي غامق. تم البيع.",
    condition: "very_good",
    priceFils: AED(1_650),
    costFils: AED(1_100),
    quantity: 0,
    status: "sold",
    specs: {
      bodyStyle: "single_cut",
      body: "Mahogany",
      finish: "Heritage cherry flame",
      pickupLayout: "HH",
      frets: 22,
    },
    listedDaysAgo: 20,
    soldDaysAgo: 3,
    images: [
      {
        photo: "les-paul-cherry",
        altEn: "Cherry flame-top Les Paul under red and blue light",
        altAr: "جيتار لس بول بسطح مموّج كرزي تحت إضاءة حمراء وزرقاء",
      },
    ],
  },
  {
    kind: "guitar",
    category: "electric-guitars",
    slug: "fender-player-telecaster-tidepool",
    sku: "SAMPLE-G-004",
    brand: "Fender",
    model: "Player Telecaster",
    year: 2020,
    titleEn: "Fender Player Telecaster, Tidepool",
    titleAr: "فندر بلاير تيليكاستر، تايدبول",
    descriptionEn:
      "Tidepool blue with a maple neck. Barely played; still has the protective film on the control plate.",
    descriptionAr:
      "لون تايدبول الأزرق مع زند من القيقب. استخدام قليل جداً، وما زال الغلاف الواقي على لوحة التحكم.",
    condition: "excellent",
    priceFils: AED(2_700),
    costFils: AED(2_050),
    quantity: 1,
    status: "reserved",
    reservedNote: "Deposit AED 500 by bank transfer; collecting at the weekend.",
    specs: {
      bodyStyle: "t_style",
      body: "Alder",
      finish: "Tidepool",
      neck: "Maple, modern C",
      fretboard: "Maple",
      frets: 22,
      scale: '25.5" (648 mm)',
      pickupLayout: "SS",
      weightKg: 3.4,
    },
    listedDaysAgo: 9,
    images: [
      {
        photo: "tele-tidepool",
        altEn: "Tidepool blue Telecaster with a maple neck in front of palm leaves",
        altAr: "جيتار تيليكاستر أزرق بلون تايدبول وزند من القيقب أمام أوراق نخيل",
      },
    ],
  },
  {
    kind: "guitar",
    category: "electric-guitars",
    slug: "epiphone-sg-standard-ebony",
    sku: "SAMPLE-G-005",
    brand: "Epiphone",
    model: "SG Standard",
    year: 2018,
    titleEn: "Epiphone SG Standard, ebony",
    titleAr: "إبيفون إس جي ستاندرد، أسود",
    descriptionEn:
      "Light and fast, in gloss black. Buckle rash on the back and worn fret ends near the nut; priced to match.",
    descriptionAr:
      "خفيف وسريع، بلون أسود لامع. خدوش من حزام البنطال على الظهر وتآكل في أطراف الفريتات قرب العظمة، والسعر يراعي ذلك.",
    techNotesEn: "Frets levelled and crowned; jack socket replaced.",
    techNotesAr: "تسوية الفريتات وتلميعها وتغيير مقبس الكابل.",
    condition: "good",
    priceFils: AED(1_250),
    costFils: AED(800),
    quantity: 1,
    status: "available",
    specs: {
      bodyStyle: "double_cut",
      body: "Mahogany",
      finish: "Ebony",
      fretboard: "Indian laurel",
      pickupLayout: "HH",
      frets: 22,
      weightKg: 3.1,
    },
    listedDaysAgo: 4,
    images: [
      {
        photo: "sg-ebony-1",
        altEn: "Black SG body with two humbuckers and a chrome bridge",
        altAr: "جسم جيتار إس جي أسود مع لاقطين همباكر وجسر كروم",
      },
      {
        photo: "sg-ebony-2",
        altEn: "The same black SG from a lower angle, showing the controls",
        altAr: "جيتار إس جي الأسود نفسه من زاوية منخفضة تُظهر مقابض التحكم",
      },
    ],
  },
  {
    kind: "gear",
    category: "pedals",
    slug: "mxr-custom-badass-78-distortion",
    sku: "SAMPLE-P-001",
    brand: "MXR",
    model: "M78 Custom Badass '78 Distortion",
    titleEn: "MXR Custom Badass '78 Distortion",
    titleAr: "دواسة إم إكس آر كاستم باداس 78 للتشويه",
    descriptionEn:
      "Classic distortion with a crunch switch. Works perfectly; light velcro residue on the base.",
    descriptionAr:
      "دواسة تشويه كلاسيكية مع مفتاح كرانش. تعمل بشكل ممتاز، مع بقايا لاصق خفيفة في القاعدة.",
    condition: "very_good",
    priceFils: AED(290),
    costFils: AED(180),
    quantity: 1,
    status: "available",
    listedDaysAgo: 5,
    images: [
      {
        photo: "distortion-pedal",
        altEn: "Red MXR distortion pedal on a white background",
        altAr: "دواسة تشويه حمراء من إم إكس آر على خلفية بيضاء",
      },
    ],
  },
  {
    // No Arabic text on purpose: the public site falls back to English (M3 tests it).
    kind: "gear",
    category: "amps",
    slug: "marshall-ms-2-micro-amp",
    sku: "SAMPLE-A-001",
    brand: "Marshall",
    model: "MS-2",
    titleEn: "Marshall MS-2 micro amp",
    descriptionEn: "Battery-powered 1 W practice amp that clips to a belt. New in box.",
    condition: null,
    priceFils: AED(120),
    costFils: AED(80),
    quantity: 3,
    status: "available",
    listedDaysAgo: 12,
    images: [
      {
        photo: "micro-amp",
        altEn: "Small red Marshall micro amp on a wooden table",
        altAr: "مضخم مارشال صغير أحمر على طاولة خشبية",
      },
    ],
  },
  {
    kind: "gear",
    category: "parts-accessories",
    slug: "strings-and-picks-bundle",
    sku: "SAMPLE-X-001",
    titleEn: "Strings and picks bundle",
    titleAr: "مجموعة أوتار وريش عزف",
    descriptionEn: "A set of strings and four picks, a handy spare for the gig bag.",
    descriptionAr: "طقم أوتار وأربع ريش عزف، احتياطي مفيد في حقيبة الجيتار.",
    condition: null,
    priceFils: AED(45),
    costFils: AED(25),
    quantity: 12,
    status: "available",
    listedDaysAgo: 30,
    images: [
      {
        photo: "picks",
        altEn: "A pack of strings and four guitar picks on a yellow background",
        altAr: "علبة أوتار وأربع ريش عزف على خلفية صفراء",
      },
    ],
  },
  {
    kind: "gear",
    category: "parts-accessories",
    slug: "instrument-cable-3m",
    sku: "SAMPLE-X-002",
    titleEn: "Instrument cable, 3 m",
    titleAr: "كابل جيتار، 3 م",
    descriptionEn: "Straight 6.35 mm jacks, low-noise shielded cable. Sold out.",
    descriptionAr: "مقابس مستقيمة 6.35 مم وكابل معزول منخفض التشويش. نفدت الكمية.",
    condition: null,
    priceFils: AED(60),
    costFils: AED(30),
    quantity: 0,
    status: "sold",
    listedDaysAgo: 40,
    soldDaysAgo: 1,
    images: [
      {
        photo: "cable",
        altEn: "Coiled black guitar cable with a metal jack",
        altAr: "كابل جيتار أسود ملفوف بمقبس معدني",
      },
    ],
  },
  {
    // A draft: not public, so its page must 404 (M3 tests it).
    kind: "guitar",
    category: "electric-guitars",
    slug: "ibanez-rg550-draft",
    sku: "SAMPLE-G-006",
    brand: "Ibanez",
    model: "RG550",
    titleEn: "Ibanez RG550 (being set up)",
    condition: "good",
    priceFils: null,
    quantity: 1,
    status: "draft",
    images: [],
  },
];

export type SeedOptions = {
  /** Also add the sample products (development and preview only). */
  samples?: boolean;
  now?: Date;
};

export async function seed(db: Database, { samples = true, now = new Date() }: SeedOptions = {}) {
  await db.transaction(async (tx) => {
    await tx
      .insert(categories)
      .values([...seedCategories])
      .onConflictDoNothing({ target: categories.slug });

    const [{ zones }] = await tx.select({ zones: sql<number>`count(*)::int` }).from(deliveryZones);
    if (zones === 0) await tx.insert(deliveryZones).values(seedDeliveryZones);

    if (!samples) return;

    const categoryRows = await tx
      .select({ id: categories.id, slug: categories.slug })
      .from(categories)
      .where(
        inArray(
          categories.slug,
          seedCategories.map((c) => c.slug),
        ),
      );
    const categoryId = new Map(categoryRows.map((c) => [c.slug, c.id]));
    const daysAgo = (days: number) => new Date(now.getTime() - days * DAY_MS);

    for (const { category, images, listedDaysAgo, soldDaysAgo, ...product } of sampleProducts) {
      const [inserted] = await tx
        .insert(products)
        .values({
          ...product,
          categoryId: categoryId.get(category),
          isSample: true,
          publishedAt: listedDaysAgo === undefined ? null : daysAgo(listedDaysAgo),
          soldAt: soldDaysAgo === undefined ? null : daysAgo(soldDaysAgo),
          // Holds end a few days after seeding, so the sample hold is current.
          reservedUntil:
            product.status === "reserved" ? new Date(now.getTime() + 4 * DAY_MS) : null,
        })
        .onConflictDoNothing({ target: products.slug })
        .returning({ id: products.id });
      if (!inserted) continue;

      if (images.length > 0) {
        await tx.insert(productImages).values(
          images.map((image, sort) => ({
            productId: inserted.id,
            key: `samples/${image.photo}`,
            ...SAMPLE_PHOTO_SIZE,
            altEn: image.altEn,
            altAr: image.altAr,
            sort,
          })),
        );
      }
    }
  });
}
