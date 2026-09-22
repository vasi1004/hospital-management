export function EmptyDashboard({ heading, description, cards = [] }) {
  return (
    <div className="space-y-5">
      <section className="ui-panel ui-panel-pad ui-rise">
        <h2 className="ui-title text-lg">{heading}</h2>
        <p className="ui-muted mt-2 max-w-2xl leading-relaxed">{description}</p>
      </section>

      {cards.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card, index) => (
            <article
              key={card.label}
              className={`ui-panel ui-panel-pad ui-stat ui-rise ui-rise-delay-${(index % 3) + 1}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                {card.label}
              </p>
              <p className="mt-2 font-display text-2xl font-bold tabular-nums text-[var(--ink)]">
                {card.value}
              </p>
              {card.hint ? (
                <p className="ui-muted mt-1 text-sm">{card.hint}</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
