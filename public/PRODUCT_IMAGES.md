# Product photography

The QA Lab demo storefront bundles these photographs locally under `public/products/`.
They illustrate fictional practice products; product names, stock, prices and reviews are seeded training data. No photographer or pictured brand endorses this application. This application does not sell the pictured products or the photos.

All photographs were downloaded from Pexels on 2026-10-08. Pexels licenses these images for free use on websites/apps, including commercial use. Attribution is appreciated but not required. Source and license links are retained here for provenance.

License: https://www.pexels.com/license/

| Local file | Photographer / source page |
|---|---|
| `products/headphones.jpg` | [Black headphones on white surface, Pexels photo 7772548](https://www.pexels.com/photo/black-headphones-on-white-surface-7772548/) |
| `products/speaker.jpg` | [Anton — Portable Speaker on a White Surface](https://www.pexels.com/photo/portable-speaker-on-a-white-surface-4132534/) |
| `products/mouse.jpg` | [Matheus Bertelli — Photograph of a Black Wireless Mouse](https://www.pexels.com/photo/photograph-of-a-black-wireless-mouse-13870516/) |
| `products/keyboard.jpg` | [Click Jeth — Mechanical Keyboard](https://www.pexels.com/photo/mechanical-keyboard-27791751/) |
| `products/bottle.jpg` | [Luis Quintero — White Bottle](https://www.pexels.com/photo/white-bottle-4000090/) |
| `products/lamp.jpg` | [Artem Podrez — A White Lamp on the Table](https://www.pexels.com/photo/a-white-lamp-on-the-table-4612402/) |
| `products/watch.jpg` | [pratik prasad — A Close-Up Shot of a Smartwatch](https://www.pexels.com/photo/a-close-up-shot-of-a-smartwatch-13007642/) |
| `products/earbuds.jpg` | [White Wireless Earbuds on Wooden Surface, Pexels photo 35147239](https://www.pexels.com/photo/white-wireless-earbuds-on-wooden-surface-35147239/) |
| `products/box.jpg` | [Kindel Media — Envelopes on a Mail Organizer](https://www.pexels.com/photo/7054727/) |

Download pattern: `https://images.pexels.com/photos/PHOTO_ID/pexels-photo-PHOTO_ID.jpeg?auto=compress&cs=tinysrgb&w=720`.

The delivered JPEG files are compressed by the source CDN. The UI crops them with CSS `object-fit: cover`. No image requests go to Pexels when using the application.
