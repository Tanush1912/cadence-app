import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// twMerge guesses that an unknown text-* utility is a colour, so pairing one of
// our type tokens with a text colour silently drops the size. Declare them.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display", "page-title", "title", "body", "label", "micro"] },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
