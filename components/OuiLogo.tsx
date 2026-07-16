import Image from "next/image";

/**
 * Real OUI crest, rasterised. Copied to /public/oui-logo.png during setup.
 * next/image handles priority sizing and automatic optimisation.
 */
export function OuiLogo({
  className = "h-9 w-9",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={`inline-block relative ${className}`}>
      <Image
        src="/oui-logo.png"
        alt="Oduduwa University"
        fill
        sizes="128px"
        priority={priority}
        style={{ objectFit: "contain" }}
      />
    </span>
  );
}
