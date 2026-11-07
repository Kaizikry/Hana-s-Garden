import type { PlantDraft } from "../types";

const CARE = { category: "Luar Rumah", status: "Available", sunlight: "Cahaya terang tidak langsung", water: "Isi air di tengah, 1x seminggu" } as const;

const plant = (photo: number, name: string, description: string, price = 25, stock = 5): PlantDraft => ({
  ...CARE,
  name,
  altName: "",
  price,
  stock,
  potSize: "",
  description,
  imageUrl: `images/bromelia-${String(photo).padStart(2, "0")}.jpeg`,
});

/**
 * The 14 plants in the photos. Only "Bromelia Bintik" is a real name. The other names, and all
 * prices and stock, are placeholders until they are corrected in admin.
 */
export const STARTER_PLANTS: PlantDraft[] = [
  { ...plant(14, "Bromelia Bintik", "Daun hijau pucat berbintik merah jambu. Hujung daun jadi lebih merah bila dapat cahaya cukup. Tahan panas dan mudah dijaga.", 25, 3), altName: "Neoregelia", potSize: "Pasu 20cm" },
  plant(2, "Bromelia Merah Kuning", "Daun lebar merah pekat dengan percikan kuning, membentuk roset yang penuh."),
  plant(6, "Bromelia Merah Jambu", "Merah jambu terang dengan calitan kuning. Warnanya menonjol di mana-mana sudut laman."),
  plant(9, "Bromelia Percik Ungu", "Daun kekuningan penuh percikan ungu, dengan hujung merah jambu."),
  plant(4, "Bromelia Jingga", "Daun jingga kemerahan dengan tepi bergerigi halus."),
  plant(3, "Bromelia Hati Merah Jambu", "Daun hijau yang bertukar merah jambu ke arah tengah pokok."),
  plant(1, "Bromelia Bintik Krim", "Daun panjang keperangan dengan bintik krim dari pangkal ke hujung."),
  plant(5, "Bromelia Merah Hati", "Daun merah hati berkilat, sedang membesar dalam pasu tanah."),
  plant(7, "Bromelia Harimau", "Daun hijau limau dengan tompok perang seperti belang harimau."),
  plant(12, "Bromelia Hijau Limau", "Daun hijau terang dan lebar dengan bintik ungu kecil."),
  plant(10, "Bromelia Hijau Senja", "Hijau kekuningan dengan rona merah jambu di tepi daun."),
  plant(8, "Bromelia Hijau Pucat", "Daun tinggi berwarna hijau pucat dengan garis merah jambu lembut."),
  plant(11, "Bromelia Hijau Marun", "Daun marun gelap dengan calitan hijau, dan bintik merah di hujung."),
  plant(13, "Bromelia Titik Marun", "Daun hijau ramping dengan titik marun yang makin rapat ke hujung."),
];
