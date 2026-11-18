import type { PlantDraft } from "../types";

// "Luar Rumah" is the stored value for the Outdoor category (see CATEGORIES).
const CARE = { category: "Luar Rumah", status: "Available", sunlight: "Bright, indirect light", water: "Fill the centre cup, once a week" } as const;

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
 * The 14 plants in the photos. Only the Spotted Bromeliad (Bromelia Bintik) has a real name. The
 * other names, and all prices and stock, are placeholders until they are corrected in admin.
 */
export const STARTER_PLANTS: PlantDraft[] = [
  { ...plant(14, "Spotted Bromeliad", "Pale green leaves speckled with pink. The leaf tips turn redder in good light. Handles heat well and is easy to care for.", 25, 3), altName: "Bromelia Bintik · Neoregelia", potSize: "20cm pot" },
  plant(2, "Red & Yellow Bromeliad", "Broad deep-red leaves splashed with yellow, forming a full rosette."),
  plant(6, "Pink Bromeliad", "Bright pink with streaks of yellow. Its colour stands out in any corner of the garden."),
  plant(9, "Purple Speckle Bromeliad", "Yellowish leaves covered in purple speckles, with pink tips."),
  plant(4, "Orange Bromeliad", "Reddish-orange leaves with finely serrated edges."),
  plant(3, "Pink Heart Bromeliad", "Green leaves that turn pink towards the centre of the plant."),
  plant(1, "Cream Spot Bromeliad", "Long brownish leaves with cream spots from base to tip."),
  plant(5, "Burgundy Bromeliad", "Glossy burgundy leaves, growing in a clay pot."),
  plant(7, "Tiger Bromeliad", "Lime-green leaves with brown patches like tiger stripes."),
  plant(12, "Lime Green Bromeliad", "Broad, bright green leaves with small purple spots."),
  plant(10, "Dusk Green Bromeliad", "Yellowish green with a pink blush along the leaf edges."),
  plant(8, "Pale Green Bromeliad", "Tall pale green leaves with soft pink lines."),
  plant(11, "Maroon Green Bromeliad", "Dark maroon leaves streaked with green, and red spots at the tips."),
  plant(13, "Maroon Dot Bromeliad", "Slim green leaves with maroon dots that grow denser towards the tip."),
];
