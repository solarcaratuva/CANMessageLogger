from flask import render_template, jsonify, request
from ..db_connection import DbConnection as dbconnect
from ..dbcs import get_messages_from_dbcs
from ..downsampling import largest_triangle_three_buckets
import numpy as np

from .socket import app


@app.route('/')
def index():
    # Render the HTML with the large_data passed in
    return render_template('debug_dashboard.html') # DELETED message_list


@app.route('/graph_view')
def graph_view():
    return render_template('graph_view.html')

@app.route('/link2')
def link2():
    return render_template('link2.html')


@app.route('/get_can_message_types', methods=['GET'])
def get_can_message_types():
    """
    Get all available CAN message types and their signals from all DBC files
    """
    try:
        # Get messages from the already loaded DBC files
        message_types = get_messages_from_dbcs()
        
        # Log what we found
        
        return jsonify({
            "status": "success",
            "message_types": message_types
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@app.route('/get_visible_range', methods=['POST'])
def get_visible_range():
    """
    REST endpoint for bulk request of multiple signals over a visible time window.
    Replaces the socketio-based approach with HTTP polling.
    
    Expects JSON: {
      signal_ids: ["Message.signal", ...],
      start_time: number (seconds),
      end_time: number (seconds),
      zoom_level: 1..10,
      viewport_width: number
    }
    
    Returns JSON with x/y arrays per signal.
    """
    try:
        data = request.json
        signal_ids = data.get('signal_ids', [])
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        zoom_level = data.get('zoom_level', 1)
        viewport_width = data.get('viewport_width', 1200)

        if not signal_ids or start_time is None or end_time is None:
            return jsonify({"status": "error", "message": "Missing required parameters"}), 400

        db_conn = dbconnect()

        # Determine target points per signal using same cap logic as socketio handlers
        safe_div = max(1, (11 - int(zoom_level)))
        pixel_cap = max(500, int(3 * int(viewport_width)))
        absolute_cap = 2500

        results_by_signal = {}
        total_raw_points = 0
        total_processed_points = 0
        
        for sid in signal_ids:
            try:
                message_name, signal_name = sid.split('.')
                query = f"""
                    SELECT {signal_name}, timeStamp
                    FROM {message_name}
                    WHERE timeStamp BETWEEN {start_time} AND {end_time}
                    ORDER BY timeStamp
                """
                rows = db_conn.query(query)
                if not rows:
                    results_by_signal[sid] = { 'x': [], 'y': [] }
                    continue
                
                # Convert to numpy array for downsampling and drop NaN/None
                dp = np.array([(r['timeStamp'], r[signal_name]) for r in rows], dtype=float)
                raw_points = len(dp)
                total_raw_points += raw_points
                
                if dp.size:
                    finite_mask = np.isfinite(dp[:, 0]) & np.isfinite(dp[:, 1])
                    dp = dp[finite_mask]
                
                # Calculate target points
                base_points = max(100, len(dp) // safe_div)
                target_points = min(len(dp), base_points, pixel_cap, absolute_cap)
                
                # Pre-sample if extremely large dataset
                if len(dp) > target_points * 50:
                    step = max(1, len(dp) // (target_points * 20))
                    dp = dp[::step]
                
                # Apply downsampling
                ds = largest_triangle_three_buckets(dp, target_points)
                processed_points = len(ds)
                total_processed_points += processed_points
                
                results_by_signal[sid] = {
                    'x': [float(pt[0]) for pt in ds],
                    'y': [float(pt[1]) for pt in ds]
                }
            except Exception as inner_e:
                results_by_signal[sid] = { 'x': [], 'y': [] }

        if total_raw_points > 0:
            compression_ratio = (1 - total_processed_points / total_raw_points) * 100

        return jsonify({
            "status": "success",
            "signals": results_by_signal
        }), 200
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
