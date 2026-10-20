/** @format */

/**
 * Mengambil elemen utuh dari satu larik di tingkat teratas objek JSON yang
 * masih mengalir. Elemen dikembalikan sebagai teks JSON begitu kurung
 * penutupnya tiba, sehingga dapat divalidasi sebelum ditampilkan.
 */
export function createArrayItemExtractor(key: string): {
  push(chunk: string): string[];
} {
  let buffer = "";
  let depth = 0;
  let inString = false;
  let escaped = false;
  let stringStart = -1;
  let lastTopLevelString: string | null = null;
  let inTarget = false;
  let itemStart = -1;

  return {
    push(chunk) {
      const items: string[] = [];
      const offset = buffer.length;
      buffer += chunk;

      for (let index = offset; index < buffer.length; index += 1) {
        const char = buffer[index];

        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (char === "\\") {
            escaped = true;
          } else if (char === '"') {
            inString = false;
            if (depth === 1) {
              lastTopLevelString = buffer.slice(stringStart + 1, index);
            }
          }
          continue;
        }

        if (char === '"') {
          inString = true;
          stringStart = index;
        } else if (char === "{" || char === "[") {
          if (inTarget && depth === 2 && char === "{") itemStart = index;
          if (depth === 1 && char === "[" && lastTopLevelString === key) {
            inTarget = true;
          }
          depth += 1;
        } else if (char === "}" || char === "]") {
          depth -= 1;
          if (inTarget && depth === 2 && char === "}" && itemStart >= 0) {
            items.push(buffer.slice(itemStart, index + 1));
            itemStart = -1;
          } else if (inTarget && depth === 1 && char === "]") {
            inTarget = false;
          }
        }
      }

      return items;
    },
  };
}
