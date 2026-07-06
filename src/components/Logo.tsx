import Image from "next/image";

export function Logo({
  className = "",
  compact = false,
  negative = false,
}: {
  className?: string;
  compact?: boolean;
  negative?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <Image
        src={negative ? "/CTE - LOGONEGATIVA@300x.png" : "/logo-cte.png"}
        alt="CTE Capoeiragem"
        width={180}
        height={negative ? 96 : 65}
        priority
        style={{ objectFit: "contain", maxWidth: "100%", height: "auto" }}
      />
      {!compact && (
        <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
          Movimento, Arte &amp; Cultura
        </p>
      )}
    </div>
  );
}
