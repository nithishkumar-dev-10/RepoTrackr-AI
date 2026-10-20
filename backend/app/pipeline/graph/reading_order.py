from app.pipeline.graph.models import CentralityScore


def reading_order(
    modules: list[str],
    import_edges: list[tuple[str, str]],
    entry_modules: list[str],
    centrality: list[CentralityScore],
) -> list[str]:
    """Suggest an order to read the code in: entry points first, then what they
    import, breadth-first; ties broken by centrality.

    Cycles are safe: a module is added to the order at most once, and the walk
    only ever moves to modules it has not seen. Modules nothing reaches (or
    everything, when there are no entry points) go at the end, most central first.
    """
    # Lower rank = more central; unknown modules sort last.
    rank = {score.module: i for i, score in enumerate(centrality)}

    def by_centrality(module: str) -> int:
        return rank.get(module, len(rank))

    # module -> modules it imports (duplicates are harmless, seen-check skips them)
    deps: dict[str, list[str]] = {module: [] for module in modules}
    for source, target in import_edges:
        if source in deps and target in deps:
            deps[source].append(target)

    order: list[str] = []
    seen: set[str] = set()
    frontier = sorted(entry_modules, key=by_centrality)

    while frontier:
        # Each pass is one breadth-first level; the level itself is ordered by
        # centrality, so the most important module of the level is read first.
        next_frontier: list[str] = []
        for module in frontier:
            if module in seen:
                continue  # visited check: makes import cycles terminate
            seen.add(module)
            order.append(module)
            for dep in sorted(deps.get(module, []), key=by_centrality):
                if dep not in seen and dep not in next_frontier:
                    next_frontier.append(dep)
        frontier = next_frontier

    # Anything the walk never reached, most central first.
    order.extend(sorted(set(modules) - seen, key=by_centrality))
    return order
