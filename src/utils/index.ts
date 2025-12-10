// import { type ClassValue, clsx } from "clsx"
// import { twMerge } from "tailwind-merge"

// export function cn(...inputs: ClassValue[]) {
//   return twMerge(clsx(inputs))
// }
import { cx } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

const clsm = (...inputs: Parameters<typeof cx>) => twMerge(cx(inputs));

export { clsm };
