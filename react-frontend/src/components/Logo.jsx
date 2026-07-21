/* Brand mark. Loads public/logo.svg via <img> rather than inlining the SVG:
   it's ~8KB, it never needs CSS theming (it carries its own dark disc), and the
   browser caches it once across every page and size. */
export const Logo = ({ size = 28, className = "" }) => (
  <img
    src="/legal-logo.png"
    style={{ height: size, width: "auto" }}
    alt="Legal Rag Ai Logo"
    className={`${className} object-contain`}
    draggable="false"
  />
);

export default Logo;

