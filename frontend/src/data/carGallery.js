import car01 from "@/assets/cars/car-01.jpg";
import car02 from "@/assets/cars/car-02.jpg";
import car03 from "@/assets/cars/car-03.jpg";
import car04 from "@/assets/cars/car-04.jpg";
import car05 from "@/assets/cars/car-05.jpg";
import car06 from "@/assets/cars/car-06.jpg";
import car07 from "@/assets/cars/car-07.jpg";
import car08 from "@/assets/cars/car-08.jpg";
import car09 from "@/assets/cars/car-09.jpg";
import car10 from "@/assets/cars/car-10.jpg";
import car11 from "@/assets/cars/car-11.jpg";
import car12 from "@/assets/cars/car-12.jpg";
import car13 from "@/assets/cars/car-13.jpg";
import car14 from "@/assets/cars/car-14.jpg";
import car15 from "@/assets/cars/car-15.jpg";
import car16 from "@/assets/cars/car-16.jpg";
import car17 from "@/assets/cars/car-17.jpg";
import car18 from "@/assets/cars/car-18.jpg";
import car19 from "@/assets/cars/car-19.jpg";

/** All local gallery assets — every file from frontend/Images. */
export const CAR_GALLERY = [
  {
    id: "car-01",
    src: car01,
    name: "Cavallino Emblem",
    line: "Shield · Wet chrome",
    role: "detail",
    power: "—",
    speed: "—",
  },
  {
    id: "car-02",
    src: car02,
    name: "250 GTO",
    line: "1962 · Homologated legend",
    role: "heritage",
    power: "300 hp",
    speed: "280 km/h",
  },
  {
    id: "car-03",
    src: car03,
    name: "F8 Tributo",
    line: "Showroom · Twin-turbo V8",
    role: "hero",
    power: "710 hp",
    speed: "340 km/h",
  },
  {
    id: "car-04",
    src: car04,
    name: "GT3 RS Plan",
    line: "Top-down · Track geometry",
    role: "studio",
    power: "518 hp",
    speed: "296 km/h",
  },
  {
    id: "car-05",
    src: car05,
    name: "488 Pista",
    line: "Built for passion",
    role: "poster",
    power: "720 hp",
    speed: "340 km/h",
  },
  {
    id: "car-06",
    src: car06,
    name: "Chrome Cavallino",
    line: "Metallic mark · Rosso field",
    role: "brand",
    power: "—",
    speed: "—",
  },
  {
    id: "car-07",
    src: car07,
    name: "F40 Mirror",
    line: "Studio red · Reflection",
    role: "hero",
    power: "478 hp",
    speed: "324 km/h",
  },
  {
    id: "car-08",
    src: car08,
    name: "Front Aggression",
    line: "Intake · Splitter",
    role: "studio",
    power: "—",
    speed: "—",
  },
  {
    id: "car-09",
    src: car09,
    name: "Side Profile",
    line: "Silhouette · Tension",
    role: "studio",
    power: "—",
    speed: "—",
  },
  {
    id: "car-10",
    src: car10,
    name: "Garage Heat",
    line: "Workshop light",
    role: "atmosphere",
    power: "—",
    speed: "—",
  },
  {
    id: "car-11",
    src: car11,
    name: "348 ts",
    line: "Classic · Open air",
    role: "heritage",
    power: "300 hp",
    speed: "275 km/h",
  },
  {
    id: "car-12",
    src: car12,
    name: "F40",
    line: "Icon · Rear wing",
    role: "hero",
    power: "478 hp",
    speed: "324 km/h",
  },
  {
    id: "car-13",
    src: car13,
    name: "458 GT3 Evo",
    line: "Predator stance",
    role: "track",
    power: "550 hp",
    speed: "330 km/h",
  },
  {
    id: "car-14",
    src: car14,
    name: "Supercar Aesthetic",
    line: "Wallpaper study",
    role: "atmosphere",
    power: "—",
    speed: "—",
  },
  {
    id: "car-15",
    src: car15,
    name: "Scuderia Mark",
    line: "Racing stripes",
    role: "brand",
    power: "—",
    speed: "—",
  },
  {
    id: "car-16",
    src: car16,
    name: "Red Passion",
    line: "Show floor · Reflection",
    role: "hero",
    power: "710 hp",
    speed: "340 km/h",
  },
  {
    id: "car-17",
    src: car17,
    name: "Dream Machine",
    line: "Speed · Luxury · Power",
    role: "hero",
    power: "—",
    speed: "—",
  },
  {
    id: "car-18",
    src: car18,
    name: "Pit Stop No.5",
    line: "Overhead · Race crew",
    role: "track",
    power: "1000+ hp",
    speed: "350+ km/h",
  },
  {
    id: "car-19",
    src: car19,
    name: "FXX-K Evo",
    line: "1 of 1 · Hyper polish",
    role: "hero",
    power: "1050 hp",
    speed: "350 km/h",
  },
];

export const LOGIN_HERO_IDS = [
  "car-16",
  "car-12",
  "car-07",
  "car-03",
  "car-19",
  "car-13",
  "car-17",
  "car-18",
];

export const LOGIN_FLOAT_IDS = ["car-01", "car-15", "car-05", "car-11"];

export function getCarsByIds(ids) {
  const map = new Map(CAR_GALLERY.map((car) => [car.id, car]));
  return ids.map((id) => map.get(id)).filter(Boolean);
}
