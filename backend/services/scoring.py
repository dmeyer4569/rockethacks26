import numpy as np


def dampen_outliers(ratings: list[float], iqr_factor: float = 1.5) -> list[float]:
    """Winsorize outlier ratings using IQR fences.

    Any rating beyond Q1 - factor*IQR or Q3 + factor*IQR is clamped to the
    fence value.  With ≤3 ratings the data is returned unchanged since there
    isn't enough spread to judge outliers.
    """
    if len(ratings) <= 3:
        return list(ratings)

    arr = np.array(ratings, dtype=float)
    q1, q3 = np.percentile(arr, [25, 75])
    iqr = q3 - q1

    lower = q1 - iqr_factor * iqr
    upper = q3 + iqr_factor * iqr
    return np.clip(arr, lower, upper).tolist()


def calculate_cas(config, proposal: dict) -> dict:
    raw = proposal["ratings"]
    dampened = dampen_outliers(raw)

    mean = np.mean(dampened)
    std_dev = np.std(dampened)
    cas = mean - std_dev * config["lambda"]

    proposal["ratings_raw"] = list(raw)
    proposal["ratings"] = dampened
    proposal["cas"] = float(round(cas, 4))
    proposal["mean"] = float(round(mean, 4))
    proposal["std_dev"] = float(round(std_dev, 4))
    proposal["converged"] = bool(
        cas >= config["convergence_threshold"]
        and std_dev <= config["variance-threshold"]
    )

    return proposal


def select_policy(proposals: list):
    return max(proposals, key=lambda p: p["cas"])