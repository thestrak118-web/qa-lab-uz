/** Stable image identities keep historical exercises compatible without rewriting them. */
const files = [
  "headphones",
  "speaker",
  "mouse",
  "keyboard",
  "bottle",
  "lamp",
  "watch",
  "earbuds",
  "box",
  ...Array.from({ length: 30 }, (_, index) => `p${index + 10}`),
];

export const PRODUCT_PHOTOS = Object.freeze(
  Object.fromEntries(
    files.map((file, index) => [
      `p${index + 1}`,
      Object.freeze({
        src: `/products/${file}.jpg`,
        position:
          index === 0
            ? "50% 83%"
            : index === 2
              ? "50% 59%"
              : index === 6
                ? "50% 57%"
                : "50% 50%",
      }),
    ]),
  ),
);

const fallbackIcons = new Set(files.slice(0, 9));

export function productPhoto(product) {
  if (product && Object.hasOwn(PRODUCT_PHOTOS, product.id)) {
    return PRODUCT_PHOTOS[product.id];
  }
  // Imported custom/older data may contain another identifier. Restrict fallback
  // paths to bundled artwork instead of constructing URLs from arbitrary input.
  const icon = fallbackIcons.has(product?.icon) ? product.icon : "box";
  return { src: `/products/${icon}.jpg`, position: "50% 50%" };
}
