from __future__ import annotations

from itertools import combinations
import random
from statistics import fmean
from typing import Sequence


def objective_conditioned_action_divergence(
    trajectories: dict[str, Sequence[str]],
) -> float:
    if len(trajectories) < 2:
        raise ValueError("at least two objective trajectories are required")
    lengths = {len(actions) for actions in trajectories.values()}
    if len(lengths) != 1:
        raise ValueError("objective trajectories require matched horizons")
    horizon = lengths.pop()
    if horizon == 0:
        raise ValueError("empty trajectories are not valid")
    divergences = []
    for left, right in combinations(trajectories.values(), 2):
        divergences.append(
            sum(a != b for a, b in zip(left, right, strict=True)) / horizon
        )
    return fmean(divergences)


def paired_bootstrap_interval(
    values: Sequence[float], seed: int, draws: int = 2_000
) -> dict[str, float]:
    if not values:
        raise ValueError("values cannot be empty")
    if draws < 100:
        raise ValueError("draws must be at least 100")
    generator = random.Random(seed)
    samples = sorted(
        fmean(generator.choice(values) for _ in values) for _ in range(draws)
    )
    lower = samples[int(0.025 * (draws - 1))]
    upper = samples[int(0.975 * (draws - 1))]
    return {"mean": fmean(values), "lower": lower, "upper": upper}
