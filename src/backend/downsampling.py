import numpy as np

def largest_triangle_three_buckets(data, threshold):
    """
    Downsample data using the Largest Triangle Three Buckets algorithm.
    
    Args:
        data: List of (x, y) tuples or numpy array of shape (n, 2)
        threshold: Number of points to keep after downsampling
    
    Returns:
        Downsampled data as numpy array of shape (threshold, 2)
    """
    if len(data) <= threshold:
        return np.array(data)
    
    data = np.array(data)
    x = data[:, 0]
    y = data[:, 1]
    
    # Calculate the size of each bucket
    bucket_size = len(data) / threshold
    
    # Initialize the output array
    sampled = np.zeros((threshold, 2))
    sampled[0] = data[0]  # Always keep the first point
    
    # For each bucket
    for i in range(threshold - 2):
        # Calculate the bucket boundaries
        bucket_start = int((i + 1) * bucket_size)
        bucket_end = int((i + 2) * bucket_size)
        
        # Get the points in this bucket
        bucket_points = data[bucket_start:bucket_end]
        
        # Calculate the area of the triangle formed by the previous point,
        # each point in the bucket, and the next point
        areas = []
        for point in bucket_points:
            # Calculate the area of the triangle
            area = abs((sampled[i][0] - point[0]) * (y[-1] - sampled[i][1]) -
                      (sampled[i][0] - x[-1]) * (point[1] - sampled[i][1])) / 2
            areas.append(area)
        
        # Find the point that forms the largest triangle
        max_area_idx = np.argmax(areas)
        sampled[i + 1] = bucket_points[max_area_idx]
    
    sampled[-1] = data[-1]  # Always keep the last point
    return sampled 