export type TutorialSummary = {
  title: string;
  slug: string;
  category: string;
  description: string;
  image: string;
  imageAlt: string;
  published: string;
};

export const tutorials: TutorialSummary[] = [
  {
    title: 'Cordless Drill vs Impact Driver: What’s the Difference?',
    slug: '/tutorials/cordless-drill-vs-impact-driver',
    category: 'Tools / Drilling / Fastening',
    description: 'Compare a cordless drill/driver and impact driver: their chucks, mechanisms, strengths, limitations, and which tool makes sense for your work.',
    image: '/images/tutorials/drill-vs-impact-driver/workshopgirl-drill-vs-impact-driver.webp',
    imageAlt: 'WorkshopGirl comparing a cordless drill driver and a compact impact driver.',
    published: 'September 23, 2026',
  },
  {
    title: 'How to Use a Cordless Drill: A Beginner’s Guide',
    slug: '/tutorials/how-to-use-a-cordless-drill/',
    category: 'Tools / Drilling / Woodworking',
    description: 'A practical beginner guide to cordless drill controls, bit selection, pilot holes, clutch settings, screw-driving, safe use and battery care.',
    image: '/images/tutorials/cordless-drill/workshopgirl-cordless-drill-pilot-hole.webp?v=1',
    imageAlt: 'Workshop Girl using a cordless drill to drill a pilot hole in a clamped wooden board.',
    published: 'September 22, 2026',
  },
  {
    title: 'How to Use a Torque Wrench: A Beginner’s Guide',
    slug: '/tutorials/how-to-use-a-torque-wrench/',
    category: 'Tools / Torque / Maintenance',
    description: 'Learn what torque means, how to set and use a click-type torque wrench, why the click means stop, and how to choose and care for the right tool.',
    image: '/images/tutorials/torque-wrench/workshopgirl-use-torque-wrench.webp?v=1',
    imageAlt: 'Workshop Girl using a click-type torque wrench to tighten a wheel lug nut.',
    published: 'September 22, 2026',
  },
  {
    title: 'How to Change Spark Plugs: A Beginner’s Step-by-Step Guide',
    slug: '/tutorials/how-to-change-spark-plugs/',
    category: 'Cars / Engine / Maintenance',
    description: 'A practical guide to identifying the correct spark plugs, removing them carefully, checking the evidence they leave behind, and installing replacements without guessing specifications.',
    image: '/images/tutorials/spark-plugs/workshopgirl-change-spark-plugs.webp?v=1',
    imageAlt: 'Workshop Girl replacing spark plugs on a gasoline engine.',
    published: 'September 22, 2026',
  },
  {
    title: 'How to Replace a Car Battery: A Beginner’s Step-by-Step Guide',
    slug: '/tutorials/how-to-replace-a-car-battery/',
    category: 'Cars / Electrical / Maintenance',
    description: 'A careful beginner workflow for replacing a conventional 12V car battery, reconnecting the terminals correctly, and knowing when vehicle-specific service is required.',
    image: '/images/tutorials/car-battery/workshopgirl-car-battery-replacement.webp?v=1',
    imageAlt: 'Workshop Girl replacing a 12V car battery in a home garage.',
    published: 'September 22, 2026',
  },
  {
    title: 'How to Inspect, Clean or Replace Your Engine Air Filter',
    slug: '/tutorials/engine-air-filter/',
    category: 'Cars / Engine / Maintenance',
    description: 'A practical guide to finding, inspecting, cleaning only approved reusable filters, and replacing an engine air filter correctly.',
    image: '/images/tutorials/engine-air-filter/workshopgirl-engine-air-filter-inspection.webp?v=1',
    imageAlt: 'Workshop Girl removing a dusty engine air filter from the open airbox of a car.',
    published: 'September 22, 2026',
  },
  {
    title: 'How to Replace Brake Pads — A Beginner’s Guide',
    slug: '/tutorials/how-to-replace-brake-pads/',
    category: 'Cars / Brakes / Maintenance',
    description: 'A practical, safety-first guide to inspecting front disc brakes, replacing conventional pads, and verifying the brake system before driving.',
    image: '/images/tutorials/brake-pads/workshopgirl-brake-pad-inspection.webp?v=1',
    imageAlt: 'Workshop Girl inspecting the exposed front brake rotor and caliper before replacing the brake pads.',
    published: 'September 22, 2026',
  },
  {
    title: 'How to Change a Flat Tire — A Beginner’s Guide',
    slug: '/tutorials/how-to-change-a-flat-tire/',
    category: 'Cars / Basic Maintenance',
    description: 'A safety-first guide to securing the vehicle, removing a flat wheel, installing a spare, and finishing the job correctly.',
    image: '/images/tutorials/flat-tire/workshopgirl-flat-tire-preparation.webp?v=1',
    imageAlt: 'Workshop Girl preparing tools beside a car with a flat front tire.',
    published: 'September 21, 2026',
  },
  {
    title: 'How to Change Engine Oil — A Beginner’s Guide',
    slug: '/tutorials/how-to-change-engine-oil/',
    category: 'Engines',
    description: 'A practical, safety-first guide to preparing your tools, draining old oil, replacing the filter, and checking the final level.',
    image: '/images/tutorials/engine-oil/workshopgirl-engine-oil-preparation.webp?v=2',
    imageAlt: 'Workshop Girl preparing tools and supplies for an engine oil change beside a car.',
    published: 'September 21, 2026',
  },
];
