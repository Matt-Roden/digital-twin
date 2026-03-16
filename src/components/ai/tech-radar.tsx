interface TechItem {
  name: string;
  ring: "adopt" | "trial" | "assess" | "hold";
  quadrant: "languages" | "frameworks" | "tools" | "platforms";
}

interface TechRadarProps {
  items: TechItem[];
}

const ringStyles: Record<TechItem["ring"], { bg: string; text: string; label: string }> = {
  adopt: { bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-300", label: "Adopt" },
  trial: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", label: "Trial" },
  assess: { bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300", label: "Assess" },
  hold: { bg: "bg-neutral-50 dark:bg-neutral-900", text: "text-neutral-500 dark:text-neutral-500", label: "Hold" },
};

export function TechRadar({ items }: TechRadarProps) {
  const grouped = items.reduce(
    (acc, item) => {
      acc[item.ring] = acc[item.ring] || [];
      acc[item.ring].push(item);
      return acc;
    },
    {} as Record<TechItem["ring"], TechItem[]>
  );

  const ringOrder: TechItem["ring"][] = ["adopt", "trial", "assess", "hold"];

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
        Tech Radar
      </h3>
      {ringOrder
        .filter((ring) => grouped[ring]?.length)
        .map((ring) => {
          const style = ringStyles[ring];
          return (
            <div key={ring}>
              <span className={`text-xs font-medium ${style.text}`}>
                {style.label}
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {grouped[ring].map((item) => (
                  <span
                    key={item.name}
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
                  >
                    {item.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}
