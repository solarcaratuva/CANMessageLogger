from typing import Union, Iterable
import numpy as np
from numpy.typing import NDArray

def largest_triangle_three_buckets(
    data: Union[Iterable[tuple[float, float]], NDArray[np.float64]], 
    threshold: Union[int, None]
) -> NDArray[np.float64]:
    """
    Downsample data using the standard Largest Triangle Three Buckets (LTTB) algorithm.

    Args:
        data: Iterable of (x, y) pairs or numpy array shape (n, 2). Assumes x is sorted.
        threshold: Desired number of points in the result (>= 3). If threshold >= n, returns data.

    Returns:
        numpy.ndarray of shape (m, 2) where m <= threshold.
    """
    if threshold is None or threshold <= 0:
        return np.asarray(data)

    data = np.asarray(data, dtype=float)
    n = data.shape[0]
    if n <= threshold:
        return data

    x = data[:, 0]
    y = data[:, 1]

    sampled = np.empty((threshold, 2), dtype=float)
    sampled[0] = data[0]
    sampled[-1] = data[-1]

    bucket_size = (n - 2) / (threshold - 2)
    a_idx = 0

    for i in range(1, threshold - 1):
        # Bucket ranges for points to consider (current bucket)
        range_start = int(np.floor((i - 1) * bucket_size)) + 1
        range_end = int(np.floor(i * bucket_size)) + 1
        range_end = min(range_end, n - 1)
        if range_end <= range_start:
            range_end = range_start + 1
        idx_range = np.arange(range_start, range_end)

        # Next bucket average for triangle apex reference
        avg_start = int(np.floor(i * bucket_size)) + 1
        avg_end = int(np.floor((i + 1) * bucket_size)) + 1
        avg_end = min(avg_end, n)
        if avg_end <= avg_start:
            avg_end = avg_start + 1
        avg_x = np.mean(x[avg_start:avg_end])
        avg_y = np.mean(y[avg_start:avg_end])

        # Compute triangle areas for all candidates with previous selected point a and next-bucket average
        ax = x[a_idx]
        ay = y[a_idx]
        cx = avg_x
        cy = avg_y
        bx = x[idx_range]
        by = y[idx_range]

        areas = np.abs((ax - cx) * (by - ay) - (ax - bx) * (cy - ay))
        max_index_in_range = np.argmax(areas)
        a_idx = idx_range[max_index_in_range]
        sampled[i] = (x[a_idx], y[a_idx])

    return sampled